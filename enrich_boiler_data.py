import json
import os
import time
import requests
import threading
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

class RateLimiter:
    """
    Thread-safe Token Bucket Rate Limiter.
    Mimics Perplexity's leaky bucket: 3 requests burst, refill 1 token every 333ms.
    """
    def __init__(self, max_tokens: float = 3.0, refill_rate: float = 3.0):
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate
        self.tokens = max_tokens
        self.last_refill = time.time()
        self.lock = threading.Lock()

    def acquire(self):
        with self.lock:
            now = time.time()
            elapsed = now - self.last_refill
            
            # Refill tokens based on elapsed time
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            
            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return
            else:
                # Calculate wait time for next token
                wait_time = (1.0 - self.tokens) / self.refill_rate
                time.sleep(wait_time)
                
                # After waiting, we consume the token (reset to 0 effectively, 
                # but mathematically we just consumed what we waited for)
                self.tokens = 0.0
                self.last_refill = time.time()

class BoilerDataEnricher:
    def __init__(
        self,
        input_file: str,
        output_file: str,
        model: str = "gpt-5-mini-2025-08-07",
        batch_size: int = 10,
        rate_limit_delay: float = 1.0,
        max_workers: int = 5
    ):
        """
        Initialize the boiler data enricher.
        
        Args:
            input_file: Path to input JSON file
            output_file: Path to output enriched JSON file
            model: OpenAI model to use (default: gpt-5-mini-2025-08-07)
            batch_size: Save progress after this many entries
            rate_limit_delay: Delay between API calls in seconds
            max_workers: Number of parallel threads
        """
        self.input_file = input_file
        self.output_file = output_file
        self.model = model
        self.batch_size = batch_size
        self.rate_limit_delay = rate_limit_delay
        self.max_workers = max_workers
        
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=api_key)
        
        # Rate limiter for Perplexity (3 QPS)
        self.perplexity_limiter = RateLimiter(max_tokens=3.0, refill_rate=3.0)
        
        # Progress tracking
        self.progress_file = output_file.replace('.json', '_progress.json')
        self.processed_indices = self._load_progress()
        self.lock = threading.Lock()
        
    def _load_progress(self) -> set:
        """Load previously processed entry indices."""
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                return set(data.get('processed_indices', []))
        return set()
    
    def _save_progress(self, index: int):
        """Save progress to resume later."""
        with self.lock:
            self.processed_indices.add(index)
            with open(self.progress_file, 'w') as f:
                json.dump({'processed_indices': list(self.processed_indices)}, f)

    def _search_perplexity_context(self, entry: Dict) -> str:
        """Search for general error info using Perplexity API to use as context."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        possible_cause = entry.get('possible_cause', '')
        
        # Construct search query for information gathering
        query = f"what is {maker} {model} boiler error code {error_code} {possible_cause} meaning and how to fix troubleshooting steps"
        
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            return ""
            
        url = "https://api.perplexity.ai/search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "country": "GB",
            "max_results": 5,
            "max_tokens_per_page": 1024
        }
        
        try:
            # Apply rate limiting
            self.perplexity_limiter.acquire()
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            context_parts = []
            for result in data.get('results', []):
                title = result.get('title', 'Unknown Source')
                snippet = result.get('snippet', '')
                if snippet:
                    context_parts.append(f"Source: {title}\nContent: {snippet}")
            
            return "\n\n".join(context_parts)
            
        except Exception as e:
            print(f"\nPerplexity Context API error: {str(e)}")
            return ""
    
    def _create_overview_prompt(self, entry: Dict, context: str) -> str:
        """Create a prompt for AI overview and troubleshooting with context."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        error_type = entry.get('error_type', '')
        possible_cause = entry.get('possible_cause', '')
        existing_troubleshooting = entry.get('troubleshooting', '')
        
        prompt = f"""You are a heating engineer expert. Provide information about this boiler error in PLAIN TEXT (no markdown, no formatting):

Boiler: {maker} {model}
Error Code: {error_code}
{f'Error Type: {error_type}' if error_type else ''}
Possible Cause: {possible_cause}
{f'Existing Troubleshooting: {existing_troubleshooting}' if existing_troubleshooting else ''}

Here is some research context about this error (use this to inform your response):
{context}

Provide TWO sections in JSON format:

1. "ai_overview": Write 2-3 paragraphs in plain text explaining what this error means, why it occurs, severity, and if it's DIY or needs a professional.

2. "troubleshooting": Write detailed step-by-step instructions in plain text covering:
   - Safety precautions
   - Initial checks homeowners can do
   - Specific diagnostic and fix steps
   - Highlight that a professional should be called.
   - NO repair cost estimates
   - Use plain text, no markdown formatting

Return JSON:
{{
  "ai_overview": "plain text overview here...",
  "troubleshooting": "plain text troubleshooting steps here..."
}}"""
        return prompt
    
    def _search_perplexity(self, entry: Dict) -> List[Dict]:
        """Search for resources using Perplexity API."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        possible_cause = entry.get('possible_cause', '')
        
        # Construct search query targeting community fixes and discussions
        query = f"SOLVED {maker} {model} error {error_code} {possible_cause} fix reddit forum youtube discussion"
        
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            print("Warning: PERPLEXITY_API_KEY not found, skipping resource search")
            return []
            
        url = "https://api.perplexity.ai/search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "country": "GB",  # UK filtering
            "max_results": 5,
            # Removed exclusions for reddit/quora to allow social results
            "search_domain_filter": ["-pinterest.com"] 
        }
        
        try:
            # Apply rate limiting
            self.perplexity_limiter.acquire()
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            resources = []
            for result in data.get('results', []):
                # Determine type based on URL or content
                res_type = "article"
                url_lower = result.get('url', '').lower()
                
                if "youtube.com" in url_lower or "youtu.be" in url_lower:
                    res_type = "video"
                elif any(x in url_lower for x in ["forum", "diynot.com", "reddit.com", "quora.com", "facebook.com"]):
                    res_type = "forum"
                
                # Clean up and smart truncate snippet
                snippet = result.get('snippet', '')
                # Normalize whitespace
                description = ' '.join(snippet.split())
                
                # Smart truncate to ~150 chars without cutting words
                if len(description) > 150:
                    description = description[:150].rsplit(' ', 1)[0] + "..."
                
                resources.append({
                    "type": res_type,
                    "title": result.get('title', ''),
                    "url": result.get('url', ''),
                    "description": description
                })
            
            return resources
            
        except Exception as e:
            print(f"\nPerplexity API error: {str(e)}")
            return []

    def _enrich_entry(self, entry: Dict, index: int) -> Dict:
        """Enrich a single boiler fault entry using Perplexity for context and OpenAI for generation."""
        try:
            # STEP 1: Get Context from Perplexity
            context = self._search_perplexity_context(entry)
            
            # STEP 2: Get AI overview and troubleshooting (OpenAI with Perplexity Context)
            overview_prompt = self._create_overview_prompt(entry, context)
            
            overview_response = self.client.responses.create(
                model=self.model,
                # Disabled OpenAI web search, relying on Perplexity context
                input=overview_prompt
            )
            
            # Parse overview response
            overview_text = overview_response.output_text.strip()
            
            if not overview_text:
                raise ValueError("Empty response from API for overview")
            
            # Try to extract JSON if wrapped in markdown code blocks
            if overview_text.startswith('```'):
                lines = overview_text.split('\n')
                if len(lines) > 2:
                    overview_text = '\n'.join(lines[1:-1])
                    if overview_text.startswith('json'):
                        overview_text = '\n'.join(lines[2:-1])
            
            try:
                overview_data = json.loads(overview_text)
            except json.JSONDecodeError as e:
                print(f"\nJSON parse error for overview: {e}")
                print(f"Response text: {overview_text[:200]}...")
                raise
            
            # STEP 3: Get helpful resources (Perplexity)
            # Rate limiting is handled inside _search_perplexity
            
            helpful_resources = self._search_perplexity(entry)
            
            # Create enriched entry
            enriched_entry = entry.copy()
            
            # Always update troubleshooting with enhanced version
            if overview_data.get('troubleshooting'):
                enriched_entry['troubleshooting'] = overview_data['troubleshooting']
            
            # Add new fields
            enriched_entry['ai_overview'] = overview_data.get('ai_overview', '')
            enriched_entry['helpful_resources'] = helpful_resources
            enriched_entry['enrichment_metadata'] = {
                'enriched_at': datetime.utcnow().isoformat() + 'Z',
                'model_used': f"{self.model} + Perplexity Context",
                'web_search_enabled': True, # Via Perplexity
                'api_calls': 3, # 2 Perplexity + 1 OpenAI
                'success': True
            }
            
            return enriched_entry
            
        except Exception as e:
            print(f"\nError enriching entry {index} ({entry.get('maker')} {entry.get('model')} - {entry.get('error_code')}): {str(e)}")
            # Return original entry with error metadata
            enriched_entry = entry.copy()
            enriched_entry['enrichment_metadata'] = {
                'enriched_at': datetime.utcnow().isoformat() + 'Z',
                'model_used': self.model,
                'error': str(e),
                'success': False
            }
            return enriched_entry
    
    def enrich_data(self, test_mode: bool = False, test_count: int = 5):
        """
        Enrich the boiler fault data using multithreading.
        
        Args:
            test_mode: If True, only process first test_count entries
            test_count: Number of entries to process in test mode
        """
        print(f"Loading data from {self.input_file}...")
        
        # Load input data
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        boiler_faults = data.get('data', {}).get('boiler_faults', [])
        
        if not boiler_faults:
            print("No boiler faults found in input file!")
            return
        
        total_entries = len(boiler_faults)
        print(f"Found {total_entries} boiler fault entries")
        
        if test_mode:
            boiler_faults = boiler_faults[:test_count]
            print(f"TEST MODE: Processing only first {test_count} entries")
        
        # Enrich entries
        enriched_faults = [None] * len(boiler_faults)
        
        # Pre-fill already processed entries
        entries_to_process = []
        for index, entry in enumerate(boiler_faults):
            if index in self.processed_indices:
                enriched_faults[index] = entry
            else:
                entries_to_process.append((index, entry))
        
        print(f"Processing {len(entries_to_process)} entries with {self.max_workers} threads...")
        
        completed_count = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_index = {
                executor.submit(self._enrich_entry, entry, index): index 
                for index, entry in entries_to_process
            }
            
            with tqdm(total=len(entries_to_process), desc="Enriching entries") as pbar:
                for future in as_completed(future_to_index):
                    index = future_to_index[future]
                    try:
                        result = future.result()
                        enriched_faults[index] = result
                        
                        # Save progress
                        self._save_progress(index)
                        
                        completed_count += 1
                        
                        # Save batch periodically (thread-safe write)
                        if completed_count % self.batch_size == 0:
                            self._save_output([e for e in enriched_faults if e is not None], test_mode)
                        
                    except Exception as e:
                        print(f"Exception in thread for index {index}: {e}")
                    
                    pbar.update(1)
        
        # Final save
        final_results = [e for e in enriched_faults if e is not None]
        self._save_output(final_results, test_mode)
        print(f"\n✓ Enrichment complete! Output saved to {self.output_file}")
        
        # Clean up progress file
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
            print("Progress file cleaned up")
    
    def _save_output(self, enriched_faults: List[Dict], test_mode: bool = False):
        """Save enriched data to output file."""
        with self.lock:
            output_data = {
                "boiler_faults": enriched_faults,
                "metadata": {
                    "total_entries": len(enriched_faults),
                    "enriched_at": datetime.utcnow().isoformat() + 'Z',
                    "model_used": self.model,
                    "test_mode": test_mode
                }
            }
            
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Enrich boiler error code data with AI')
    parser.add_argument(
        '--input',
        default='www.freeboilermanuals.com__.2025-11-19T13_43_22.968Z.json',
        help='Input JSON file path'
    )
    parser.add_argument(
        '--output',
        default='enriched_boiler_data.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--model',
        default='gpt-5-mini-2025-08-07',
        help='OpenAI model to use (default: gpt-5-mini-2025-08-07)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Test mode: only process first 5 entries'
    )
    parser.add_argument(
        '--test-count',
        type=int,
        default=5,
        help='Number of entries to process in test mode (default: 5)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Save progress after this many entries (default: 10)'
    )
    parser.add_argument(
        '--delay',
        type=float,
        default=1.0,
        help='Delay between API calls in seconds (default: 1.0)'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=5,
        help='Number of parallel workers (default: 5)'
    )
    
    args = parser.parse_args()
    
    # Create enricher
    enricher = BoilerDataEnricher(
        input_file=args.input,
        output_file=args.output,
        model=args.model,
        batch_size=args.batch_size,
        rate_limit_delay=args.delay,
        max_workers=args.workers
    )
    
    # Run enrichment
    enricher.enrich_data(test_mode=args.test, test_count=args.test_count)


if __name__ == '__main__':
    main()
