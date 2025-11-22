# Boiler Error Code Data Enrichment System

A Python tool to enrich boiler error code data with AI-generated overviews, troubleshooting tips, and helpful resource links using OpenAI's GPT models.

## Features

- 🤖 **AI-Powered Enrichment**: Uses GPT-4o-mini to generate comprehensive error explanations
- 📚 **Resource Discovery**: Finds relevant YouTube videos and articles for each error
- 💾 **Resume Capability**: Automatically saves progress and can resume if interrupted
- 🔄 **Rate Limiting**: Respects API limits to avoid throttling
- 📊 **Progress Tracking**: Real-time progress bar and status updates
- 💰 **Cost Effective**: Uses GPT-4o-mini for affordable enrichment (~$1-2 for 975 entries)

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key

Create a `.env` file in the project directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**How to get an OpenAI API key:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy and paste it into your `.env` file

### 3. Verify Setup

Make sure you have the input JSON file in the same directory:
- `www.freeboilermanuals.com__.2025-11-19T13_43_22.968Z.json`

## Usage

### Test Mode (Recommended First)

Test with just 5 entries to verify everything works:

```bash
python enrich_boiler_data.py --test
```

This will create `enriched_boiler_data.json` with 5 enriched entries.

### Full Enrichment

Process all 975 entries:

```bash
python enrich_boiler_data.py
```

### Advanced Options

```bash
# Custom input/output files
python enrich_boiler_data.py --input my_data.json --output my_output.json

# Use a different model
python enrich_boiler_data.py --model gpt-4o

# Test with 10 entries instead of 5
python enrich_boiler_data.py --test --test-count 10

# Adjust rate limiting (2 second delay between calls)
python enrich_boiler_data.py --delay 2.0

# Change batch save frequency (save every 20 entries)
python enrich_boiler_data.py --batch-size 20
```

### Resume After Interruption

If the script is interrupted, simply run the same command again. It will automatically resume from where it left off using the progress file.

## Output Format

The enriched JSON file will contain only the boiler fault data with enhanced fields:

```json
{
  "boiler_faults": [
    {
      "maker": "Atag",
      "model": "ATAG Boiler",
      "error_code": "10",
      "error_type": "",
      "possible_cause": "Outside sensor error",
      "troubleshooting": "Detailed troubleshooting steps...",
      "ai_overview": "Comprehensive AI-generated overview...",
      "helpful_resources": [
        {
          "type": "video",
          "title": "How to Fix Atag Error Code 10",
          "url": "https://youtube.com/...",
          "description": "Step-by-step video guide..."
        }
      ],
      "enrichment_metadata": {
        "enriched_at": "2025-11-19T15:11:08Z",
        "model_used": "gpt-4o-mini"
      }
    }
  ],
  "metadata": {
    "total_entries": 975,
    "enriched_at": "2025-11-19T15:11:08Z",
    "model_used": "gpt-4o-mini",
    "test_mode": false
  }
}
```

## Cost Estimation

Using **GPT-4o-mini** (recommended):
- Cost per entry: ~$0.001 - $0.002
- Total for 975 entries: **~$1 - $2**
- Processing time: ~20-30 minutes

Using **GPT-4o**:
- Cost per entry: ~$0.01 - $0.02
- Total for 975 entries: **~$10 - $20**
- Processing time: ~20-30 minutes

## Troubleshooting

### "OPENAI_API_KEY not found"
- Make sure you created a `.env` file
- Verify the API key is correctly set in `.env`
- Check there are no extra spaces or quotes around the key

### Rate Limit Errors
- Increase the delay: `--delay 2.0`
- Check your OpenAI account has sufficient credits
- Verify you're not hitting tier limits

### Script Crashes
- The script saves progress every 10 entries (by default)
- Simply run the same command again to resume
- Check `enriched_boiler_data_progress.json` for progress status

### Invalid JSON Output
- This is rare but can happen with API errors
- The script will continue processing and mark the error in metadata
- Review the output file and re-run specific entries if needed

## Files Generated

- `enriched_boiler_data.json` - Main output file with enriched data
- `enriched_boiler_data_progress.json` - Progress tracking (auto-deleted when complete)

## License

This tool is provided as-is for enriching boiler error code data.
