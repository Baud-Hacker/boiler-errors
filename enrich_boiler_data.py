import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
load_dotenv()

class BoilerDataEnricher:
    def __init__(
        self,
        input_file: str,
        output_file: str,
        model: str = "gpt-5-mini-2025-08-07",
        batch_size: int = 10,
        rate_limit_delay: float = 1.0
    ):
        """
        Initialize the boiler data enricher.
        
        Args:
            input_file: Path to input JSON file
            output_file: Path to output enriched JSON file
            model: OpenAI model to use (default: gpt-5-mini-2025-08-07)
            batch_size: Save progress after this many entries
            rate_limit_delay: Delay between API calls in seconds
        """
        self.input_file = input_file
        self.output_file = output_file
        self.model = model
        self.batch_size = batch_size
        self.rate_limit_delay = rate_limit_delay
        
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=api_key)
        
        # Progress tracking
        self.progress_file = output_file.replace('.json', '_progress.json')
        self.processed_indices = self._load_progress()
        
    def _load_progress(self) -> set:
        """Load previously processed entry indices."""
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r') as f:
                data = json.load(f)
                return set(data.get('processed_indices', []))
        return set()
    
    def _save_progress(self, index: int):
        """Save progress to resume later."""
        self.processed_indices.add(index)
        with open(self.progress_file, 'w') as f:
            json.dump({'processed_indices': list(self.processed_indices)}, f)
    
    def _create_overview_prompt(self, entry: Dict) -> str:
        """Create a prompt for AI overview and troubleshooting."""
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
    
    def _create_resources_prompt(self, entry: Dict) -> str:
        """Create a prompt for finding helpful resource URLs."""
        maker = entry.get('maker', 'Unknown')
        model = entry.get('model', 'Unknown')
        error_code = entry.get('error_code', 'Unknown')
        possible_cause = entry.get('possible_cause', '')
        
        prompt = f"""Search the web to find 3-5 REAL resources showing how to FIX this boiler error:

Boiler: {maker} {model}
Error Code: {error_code}
Issue: {possible_cause}

IMPORTANT: Prioritize ENGLISH language websites only.

Find resources that demonstrate REPAIRS and FIXES:
- YouTube videos showing the actual repair process (English language)
- Forum posts with step-by-step fix instructions (English language)
- Articles explaining how to resolve this error (English language)
- DO NOT include generic fault code lists
- DO NOT include manufacturer manuals
- DO NOT include non-English websites
- Each resource must show HOW TO FIX the problem
- Only include resources from English-speaking websites (.com, .co.uk, .au, etc.)

Return JSON array of resources:
{{
  "helpful_resources": [
    {{
      "type": "video",
      "title": "exact title from the webpage",
      "url": "actual URL you found",
      "description": "what fix or solution this provides"
    }}
  ]
}}"""
        return prompt
    
    def _enrich_entry(self, entry: Dict, index: int) -> Dict:
        """Enrich a single boiler fault entry using two separate OpenAI API calls."""
        try:
            # CALL 1: Get AI overview and troubleshooting with web search
            overview_prompt = self._create_overview_prompt(entry)
            
            overview_response = self.client.responses.create(
                model=self.model,
                tools=[{"type": "web_search"}],
                input=overview_prompt
            )
            
            # Parse overview response
            overview_text = overview_response.output_text.strip()
            
            if not overview_text:
                raise ValueError("Empty response from API for overview")
            
            # Try to extract JSON if wrapped in markdown code blocks
            if overview_text.startswith('```'):
                lines = overview_text.split('\n')
                # Remove first and last lines (``` markers)
                if len(lines) > 2:
                    overview_text = '\n'.join(lines[1:-1])
                    # Also check if first line is ```json
                    if overview_text.startswith('json'):
                        overview_text = '\n'.join(lines[2:-1])
            
            try:
                overview_data = json.loads(overview_text)
            except json.JSONDecodeError as e:
                print(f"\nJSON parse error for overview: {e}")
                print(f"Response text: {overview_text[:200]}...")
                raise
            
            # Small delay between calls
            time.sleep(0.5)
            
            # CALL 2: Get helpful resources with web search
            resources_prompt = self._create_resources_prompt(entry)
            
            resources_response = self.client.responses.create(
                model=self.model,
                tools=[{"type": "web_search"}],
                input=resources_prompt
            )
            
            # Parse resources response
            resources_text = resources_response.output_text.strip()
            
            if not resources_text:
                print(f"\nWarning: Empty response for resources, using empty array")
                resources_data = {"helpful_resources": []}
            else:
                # Try to extract JSON if wrapped in markdown code blocks
                if resources_text.startswith('```'):
                    lines = resources_text.split('\n')
                    if len(lines) > 2:
                        resources_text = '\n'.join(lines[1:-1])
                        if resources_text.startswith('json'):
                            resources_text = '\n'.join(lines[2:-1])
                
                try:
                    resources_data = json.loads(resources_text)
                except json.JSONDecodeError as e:
                    print(f"\nJSON parse error for resources: {e}")
                    print(f"Response text: {resources_text[:200]}...")
                    resources_data = {"helpful_resources": []}
            
            # Create enriched entry
            enriched_entry = entry.copy()
            
            # Always update troubleshooting with enhanced version
            if overview_data.get('troubleshooting'):
                enriched_entry['troubleshooting'] = overview_data['troubleshooting']
            
            # Add new fields
            enriched_entry['ai_overview'] = overview_data.get('ai_overview', '')
            enriched_entry['helpful_resources'] = resources_data.get('helpful_resources', [])
            enriched_entry['enrichment_metadata'] = {
                'enriched_at': datetime.utcnow().isoformat() + 'Z',
                'model_used': self.model,
                'web_search_enabled': True,
                'api_calls': 2,
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
        Enrich the boiler fault data.
        
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
        enriched_faults = []
        
        with tqdm(total=len(boiler_faults), desc="Enriching entries") as pbar:
            for index, entry in enumerate(boiler_faults):
                # Skip if already processed
                if index in self.processed_indices:
                    enriched_faults.append(entry)
                    pbar.update(1)
                    continue
                
                # Enrich entry
                enriched_entry = self._enrich_entry(entry, index)
                enriched_faults.append(enriched_entry)
                
                # Save progress
                self._save_progress(index)
                
                # Save batch
                if (index + 1) % self.batch_size == 0:
                    self._save_output(enriched_faults, test_mode)
                    print(f"\nProgress saved: {index + 1}/{len(boiler_faults)} entries")
                
                # Rate limiting
                time.sleep(self.rate_limit_delay)
                
                pbar.update(1)
        
        # Final save
        self._save_output(enriched_faults, test_mode)
        print(f"\n✓ Enrichment complete! Output saved to {self.output_file}")
        
        # Clean up progress file
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
            print("Progress file cleaned up")
    
    def _save_output(self, enriched_faults: List[Dict], test_mode: bool = False):
        """Save enriched data to output file."""
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
    
    args = parser.parse_args()
    
    # Create enricher
    enricher = BoilerDataEnricher(
        input_file=args.input,
        output_file=args.output,
        model=args.model,
        batch_size=args.batch_size,
        rate_limit_delay=args.delay
    )
    
    # Run enrichment
    enricher.enrich_data(test_mode=args.test, test_count=args.test_count)


if __name__ == '__main__':
    main()
