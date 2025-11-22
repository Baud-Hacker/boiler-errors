from chalice import Chalice, Response
import json
import os
from urllib.parse import unquote

app = Chalice(app_name='boiler_api')

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

@app.route('/', cors=True)
def index():
    return {'hello': 'world', 'service': 'boiler-api', 'entries': len(BOILER_DATA)}

@app.route('/health', cors=True)
def health():
    return {'status': 'ok', 'entries': len(BOILER_DATA)}

@app.route('/makers', cors=True)
def get_makers():
    makers = sorted(list(set(item['maker'] for item in BOILER_DATA if 'maker' in item)))
    return {'makers': makers}

@app.route('/models/{maker}', cors=True)
def get_models(maker):
    maker = unquote(maker)
    models = sorted(list(set(item['model'] for item in BOILER_DATA if item.get('maker') == maker and 'model' in item)))
    return {'maker': maker, 'models': models}

@app.route('/faults/{maker}/{model}', cors=True)
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

@app.route('/fault/{maker}/{model}/{error_code}', cors=True)
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
