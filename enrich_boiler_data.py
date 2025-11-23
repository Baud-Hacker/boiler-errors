import json
import os
import time
import requests
import threading
import random
from datetime import datetime
from typing import Dict, List, Optional, Set
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
    Strictly enforces 3 QPS.
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
            
            # Refill tokens
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now
            
            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return
            else:
                # Calculate wait time
                wait_time = (1.0 - self.tokens) / self.refill_rate
                time.sleep(wait_time)
                self.tokens = 0.0
                self.last_refill = time.time()

def retry_with_backoff(max_retries=3, initial_delay=1.0):
    """Decorator for retrying functions with exponential backoff."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            retries = 0
            delay = initial_delay
            while retries <= max_retries:
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:
                        if retries == max_retries:
                            raise
                        sleep_time = delay + random.uniform(0, 1)
                        print(f"\nRate limit hit (429). Retrying in {sleep_time:.2f}s...")
                        time.sleep(sleep_time)
                        delay *= 2
                        retries += 1
                    else:
                        raise
                except Exception as e:
                    if "429" in str(e): # Handle OpenAI rate limits too
                        if retries == max_retries:
                            raise
                        sleep_time = delay + random.uniform(0, 1)
                        print(f"\nRate limit hit. Retrying in {sleep_time:.2f}s...")
                        time.sleep(sleep_time)
                        delay *= 2
                        retries += 1
                    else:
                        raise
        return wrapper
    return decorator

class BoilerDataEnricher:
    def __init__(
        self,
        input_file: str,
        output_file: str,
        model: str = "gpt-5-mini-2025-08-07",
        batch_size: int = 10,
        rate_limit_delay: float = 1.0,
        max_workers: int = 3 # Reduced to 3 to match Perplexity QPS
    ):
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
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                return set(data.get('processed_indices', []))
        return set()
    
    def _save_progress(self, index: int):
        with self.lock:
            self.processed_indices.add(index)
            with open(self.progress_file, 'w') as f:
                json.dump({'processed_indices': list(self.processed_indices)}, f)

    @retry_with_backoff(max_retries=5, initial_delay=2.0)
    def _search_perplexity_context(self, entry: Dict) -> str:
        """Search for general error info using Perplexity API to use as context."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        possible_cause = entry.get('possible_cause', '')
        
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
    
    def _create_overview_prompt(self, entry: Dict, context: str) -> str:
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
    
    @retry_with_backoff(max_retries=5, initial_delay=2.0)
    def _search_perplexity(self, entry: Dict) -> List[Dict]:
        """Search for resources using Perplexity API."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        possible_cause = entry.get('possible_cause', '')
        
        query = f"SOLVED {maker} {model} error {error_code} {possible_cause} fix reddit forum youtube discussion"
        
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            return []
            
        url = "https://api.perplexity.ai/search"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "query": query,
            "country": "GB",
            "max_results": 5,
            "search_domain_filter": ["-pinterest.com"] 
        }
        
        # Apply rate limiting
        self.perplexity_limiter.acquire()
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        resources = []
        for result in data.get('results', []):
            res_type = "article"
            url_lower = result.get('url', '').lower()
            
            if "youtube.com" in url_lower or "youtu.be" in url_lower:
                res_type = "video"
            elif any(x in url_lower for x in ["forum", "diynot.com", "reddit.com", "quora.com", "facebook.com"]):
                res_type = "forum"
            
            snippet = result.get('snippet', '')
            description = ' '.join(snippet.split())
            if len(description) > 150:
                description = description[:150].rsplit(' ', 1)[0] + "..."
            
            resources.append({
                "type": res_type,
                "title": result.get('title', ''),
                "url": result.get('url', ''),
                "description": description
            })
        
        return resources

    def _enrich_entry(self, entry: Dict, index: int) -> Dict:
        try:
            # STEP 1: Get Context (Perplexity)
            context = self._search_perplexity_context(entry)
            
            # STEP 2: Generate Content (OpenAI)
            overview_prompt = self._create_overview_prompt(entry, context)
            
            # OpenAI call with retry
            @retry_with_backoff(max_retries=3)
            def call_openai():
                return self.client.responses.create(
                    model=self.model,
                    input=overview_prompt
                )
            
            overview_response = call_openai()
            overview_text = overview_response.output_text.strip()
            
            # Parse JSON
            if overview_text.startswith('```'):
                lines = overview_text.split('\n')
                if len(lines) > 2:
                    overview_text = '\n'.join(lines[1:-1])
                    if overview_text.startswith('json'):
                        overview_text = '\n'.join(lines[2:-1])
            
            try:
                overview_data = json.loads(overview_text)
            except json.JSONDecodeError:
                # Fallback if JSON fails
                overview_data = {"ai_overview": overview_text, "troubleshooting": ""}

            # STEP 3: Get Resources (Perplexity)
            helpful_resources = self._search_perplexity(entry)
            
            # Create enriched entry
            enriched_entry = entry.copy()
            if overview_data.get('troubleshooting'):
                enriched_entry['troubleshooting'] = overview_data['troubleshooting']
            
            enriched_entry['ai_overview'] = overview_data.get('ai_overview', '')
            enriched_entry['helpful_resources'] = helpful_resources
            enriched_entry['enrichment_metadata'] = {
                'enriched_at': datetime.utcnow().isoformat() + 'Z',
                'model_used': f"{self.model} + Perplexity",
                'success': True
            }
            
            return enriched_entry
            
        except Exception as e:
            print(f"\nError enriching entry {index}: {str(e)}")
            enriched_entry = entry.copy()
            enriched_entry['enrichment_metadata'] = {
                'enriched_at': datetime.utcnow().isoformat() + 'Z',
                'error': str(e),
                'success': False
            }
            return enriched_entry
    
    def enrich_data(self, test_mode: bool = False, test_count: int = 5):
        print(f"Loading data from {self.input_file}...")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        boiler_faults = data.get('data', {}).get('boiler_faults', [])
        
        if not boiler_faults:
            print("No boiler faults found!")
            return
        
        # Deduplication Logic
        print("Deduplicating entries...")
        unique_faults = []
        seen_keys = set()
        
        for entry in boiler_faults:
            # Create a unique key for each fault
            key = f"{entry.get('maker')}-{entry.get('model')}-{entry.get('error_code')}"
            if key not in seen_keys:
                seen_keys.add(key)
                unique_faults.append(entry)
        
        print(f"Found {len(boiler_faults)} entries, {len(unique_faults)} unique.")
        boiler_faults = unique_faults
        
        if test_mode:
            boiler_faults = boiler_faults[:test_count]
            print(f"TEST MODE: Processing first {test_count} entries")
        
        enriched_faults = [None] * len(boiler_faults)
        entries_to_process = []
        
        for index, entry in enumerate(boiler_faults):
            if index in self.processed_indices:
                enriched_faults[index] = entry
            else:
                entries_to_process.append((index, entry))
        
        print(f"Processing {len(entries_to_process)} entries with {self.max_workers} threads...")
        
        completed_count = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_index = {
                executor.submit(self._enrich_entry, entry, index): index 
                for index, entry in entries_to_process
            }
            
            with tqdm(total=len(entries_to_process), desc="Enriching") as pbar:
                for future in as_completed(future_to_index):
                    index = future_to_index[future]
                    try:
                        result = future.result()
                        enriched_faults[index] = result
                        self._save_progress(index)
                        completed_count += 1
                        
                        if completed_count % self.batch_size == 0:
                            self._save_output([e for e in enriched_faults if e is not None], test_mode)
                            
                    except Exception as e:
                        print(f"Thread error index {index}: {e}")
                    
                    pbar.update(1)
        
        final_results = [e for e in enriched_faults if e is not None]
        self._save_output(final_results, test_mode)
        print(f"\n✓ Enrichment complete! Saved to {self.output_file}")
        
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
    
    def _save_output(self, enriched_faults: List[Dict], test_mode: bool = False):
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
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', default='www.freeboilermanuals.com__.2025-11-19T13_43_22.968Z.json')
    parser.add_argument('--output', default='enriched_boiler_data.json')
    parser.add_argument('--model', default='gpt-5-mini-2025-08-07')
    parser.add_argument('--test', action='store_true')
    parser.add_argument('--test-count', type=int, default=5)
    parser.add_argument('--batch-size', type=int, default=10)
    parser.add_argument('--delay', type=float, default=1.0)
    parser.add_argument('--workers', type=int, default=3) # Default to 3
    args = parser.parse_args()
    
    enricher = BoilerDataEnricher(
        input_file=args.input,
        output_file=args.output,
        model=args.model,
        batch_size=args.batch_size,
        rate_limit_delay=args.delay,
        max_workers=args.workers
    )
    enricher.enrich_data(test_mode=args.test, test_count=args.test_count)

if __name__ == '__main__':
    main()
