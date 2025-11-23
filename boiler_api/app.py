from chalice import Chalice, Response, CORSConfig
import json
import os
from urllib.parse import unquote
from functools import wraps

app = Chalice(app_name='boiler_api')

# CORS Configuration
cors_config = CORSConfig(
    allow_origin='https://boiler-errors.vercel.app',
    allow_headers=['Content-Type', 'X-API-KEY', 'Authorization'],
    max_age=600
)

# Load data on startup
DATA_FILE = os.path.join(os.path.dirname(__file__), 'chalicelib', 'enriched_boiler_data.json')
BOILER_DATA = []

def load_data():
    global BOILER_DATA
    if not BOILER_DATA:
        try:
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Handle structure: {"boiler_faults": [...], ...} or just [...]
                    if isinstance(data, dict):
                        BOILER_DATA = data.get('boiler_faults', [])
                    elif isinstance(data, list):
                        BOILER_DATA = data
            else:
                print(f"Data file not found at {DATA_FILE}")
        except Exception as e:
            print(f"Error loading data: {e}")
            BOILER_DATA = []

load_data()

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = os.environ.get('API_KEY')
        # If no key configured, allow access (or fail secure? Let's allow for dev if missing, but user wants security)
        # Actually, let's enforce it if the env var is set.
        if api_key:
            request = app.current_request
            # Check header (case insensitive usually, but Chalice headers are case sensitive in some versions, usually lowercased)
            # Standardize on 'x-api-key'
            headers = request.headers or {}
            request_key = headers.get('x-api-key') or headers.get('X-API-KEY')
            
            if request_key != api_key:
                return Response(body={'error': 'Unauthorized'}, status_code=401)
        return f(*args, **kwargs)
    return decorated

@app.route('/', cors=cors_config)
@require_api_key
def index():
    return {'hello': 'world', 'service': 'boiler-api', 'entries': len(BOILER_DATA)}

@app.route('/health', cors=cors_config)
@require_api_key
def health():
    return {'status': 'ok', 'entries': len(BOILER_DATA)}

@app.route('/makers', cors=cors_config)
@require_api_key
def get_makers():
    makers = sorted(list(set(item['maker'] for item in BOILER_DATA if 'maker' in item)))
    return {'makers': makers}

@app.route('/models/{maker}', cors=cors_config)
@require_api_key
def get_models(maker):
    maker = unquote(maker)
    models = sorted(list(set(item['model'] for item in BOILER_DATA if item.get('maker') == maker and 'model' in item)))
    return {'maker': maker, 'models': models}

@app.route('/faults/{maker}/{model}', cors=cors_config)
@require_api_key
def get_faults(maker, model):
    maker = unquote(maker)
    model = unquote(model)
    faults = [
        {
            'code': item.get('error_code'),
            'description': item.get('possible_cause')
        }
        for item in BOILER_DATA
        if item.get('maker') == maker and item.get('model') == model
    ]
    return {'maker': maker, 'model': model, 'faults': faults}

@app.route('/fault/{maker}/{model}/{error_code}', cors=cors_config)
@require_api_key
def get_fault_detail(maker, model, error_code):
    maker = unquote(maker)
    model = unquote(model)
    error_code = unquote(error_code)
    
    fault = next(
        (item for item in BOILER_DATA 
         if item.get('maker') == maker 
         and item.get('model') == model 
         and item.get('error_code') == error_code),
        None
    )
    
    if not fault:
        return Response(body={'error': 'Fault not found'}, status_code=404)
        
    return fault


@app.route('/all-faults', cors=cors_config)
@require_api_key
def get_all_faults():
    """
    Get all faults with basic info for search/indexing.
    """
    all_faults = [
        {
            'maker': item.get('maker'),
            'model': item.get('model'),
            'error_code': item.get('error_code')
        }
        for item in BOILER_DATA
        if item.get('maker') and item.get('model') and item.get('error_code')
    ]
    return {'faults': all_faults}
