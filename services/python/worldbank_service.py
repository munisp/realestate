"""
World Bank Economic Indicators Service
Provides Nigerian economic data for property valuation
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import requests

from shared.logger import get_logger
logger = get_logger("worldbank-service")


class WorldBankService:
    """Service for fetching economic indicators from World Bank API"""
    
    def __init__(self):
        self.base_url = "https://api.worldbank.org/v2"
        self.country_code = "NG"  # Nigeria
        self.use_mock = os.getenv('USE_MOCK_WORLDBANK', 'false').lower() == 'true'
        
        # Key economic indicators for Nigeria
        self.indicators = {
            'gdp': 'NY.GDP.MKTP.CD',  # GDP (current US$)
            'gdp_growth': 'NY.GDP.MKTP.KD.ZG',  # GDP growth (annual %)
            'gdp_per_capita': 'NY.GDP.PCAP.CD',  # GDP per capita (current US$)
            'inflation': 'FP.CPI.TOTL.ZG',  # Inflation, consumer prices (annual %)
            'unemployment': 'SL.UEM.TOTL.ZS',  # Unemployment, total (% of total labor force)
            'population': 'SP.POP.TOTL',  # Population, total
            'urban_population': 'SP.URB.TOTL.IN.ZS',  # Urban population (% of total)
            'interest_rate': 'FR.INR.RINR',  # Real interest rate (%)
            'exchange_rate': 'PA.NUS.FCRF',  # Official exchange rate (LCU per US$)
        }
        
        logger.info(f"WorldBank service initialized (mock={self.use_mock})")
    
    def get_indicator(
        self,
        indicator_code: str,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None
    ) -> Dict:
        """
        Fetch a specific indicator for Nigeria
        
        Args:
            indicator_code: World Bank indicator code
            start_year: Start year for data range
            end_year: End year for data range
        
        Returns:
            Dict with indicator data
        """
        if self.use_mock:
            return self._get_mock_indicator(indicator_code)
        
        try:
            # Default to last 5 years
            if not end_year:
                end_year = datetime.now().year - 1  # Most recent complete year
            if not start_year:
                start_year = end_year - 4
            
            # Build API URL
            date_range = f"{start_year}:{end_year}"
            url = f"{self.base_url}/country/{self.country_code}/indicator/{indicator_code}"
            
            params = {
                'format': 'json',
                'date': date_range,
                'per_page': 100
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # World Bank API returns [metadata, data]
            if len(data) < 2 or not data[1]:
                logger.warning(f"No data found for indicator {indicator_code}")
                return self._get_mock_indicator(indicator_code)
            
            # Extract values
            values = []
            for entry in data[1]:
                if entry['value'] is not None:
                    values.append({
                        'year': int(entry['date']),
                        'value': float(entry['value']),
                        'country': entry['country']['value'],
                        'indicator': entry['indicator']['value']
                    })
            
            # Sort by year descending
            values.sort(key=lambda x: x['year'], reverse=True)
            
            return {
                'success': True,
                'indicator_code': indicator_code,
                'country': 'Nigeria',
                'country_code': self.country_code,
                'data': values,
                'latest_value': values[0]['value'] if values else None,
                'latest_year': values[0]['year'] if values else None,
                'source': 'World Bank',
                'retrieved_at': datetime.now().isoformat()
            }
            
        except requests.RequestException as e:
            logger.error(f"Error fetching World Bank data: {e}")
            return self._get_mock_indicator(indicator_code)
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return self._get_mock_indicator(indicator_code)
    
    def get_economic_indicators(
        self,
        indicators: Optional[List[str]] = None
    ) -> Dict:
        """
        Fetch multiple economic indicators for Nigeria
        
        Args:
            indicators: List of indicator keys (gdp, inflation, etc.)
                       If None, fetches all default indicators
        
        Returns:
            Dict with all indicator data
        """
        if indicators is None:
            indicators = list(self.indicators.keys())
        
        results = {}
        
        for indicator_key in indicators:
            if indicator_key not in self.indicators:
                logger.warning(f"Unknown indicator: {indicator_key}")
                continue
            
            indicator_code = self.indicators[indicator_key]
            data = self.get_indicator(indicator_code)
            results[indicator_key] = data
        
        return {
            'success': True,
            'country': 'Nigeria',
            'indicators': results,
            'retrieved_at': datetime.now().isoformat()
        }
    
    def get_state_level_data(self, state: str) -> Dict:
        """
        Get state-level economic data for Nigeria
        Note: World Bank doesn't provide state-level data for Nigeria
        This would need to integrate with National Bureau of Statistics (NBS)
        
        For now, returns mock data based on national indicators
        """
        logger.info(f"State-level data requested for {state} (using national proxy)")
        
        # Get national data
        national_data = self.get_economic_indicators()
        
        # Apply state-specific adjustments (mock)
        # In production, this would query NBS or state statistical agencies
        state_multipliers = {
            'Lagos': 1.3,  # Lagos has higher economic activity
            'Abuja': 1.2,
            'Rivers': 1.1,
            'Kano': 0.9,
            'Oyo': 0.95,
            'Delta': 1.0,
            'Edo': 0.95,
            'Kaduna': 0.9,
        }
        
        multiplier = state_multipliers.get(state, 1.0)
        
        return {
            'success': True,
            'state': state,
            'country': 'Nigeria',
            'data_source': 'national_proxy',
            'adjustment_factor': multiplier,
            'national_indicators': national_data,
            'note': 'State-level data estimated from national indicators. Production would use NBS data.',
            'retrieved_at': datetime.now().isoformat()
        }
    
    def _get_mock_indicator(self, indicator_code: str) -> Dict:
        """Return mock indicator data for development"""
        
        # Mock data based on recent Nigerian economic conditions
        mock_data = {
            'NY.GDP.MKTP.CD': {  # GDP
                'latest_value': 440834000000,  # ~$441 billion
                'values': [
                    {'year': 2023, 'value': 440834000000},
                    {'year': 2022, 'value': 477386000000},
                    {'year': 2021, 'value': 440834000000},
                ]
            },
            'NY.GDP.MKTP.KD.ZG': {  # GDP growth
                'latest_value': 2.9,
                'values': [
                    {'year': 2023, 'value': 2.9},
                    {'year': 2022, 'value': 3.3},
                    {'year': 2021, 'value': 3.6},
                ]
            },
            'NY.GDP.PCAP.CD': {  # GDP per capita
                'latest_value': 2066,
                'values': [
                    {'year': 2023, 'value': 2066},
                    {'year': 2022, 'value': 2184},
                    {'year': 2021, 'value': 2066},
                ]
            },
            'FP.CPI.TOTL.ZG': {  # Inflation
                'latest_value': 24.5,
                'values': [
                    {'year': 2023, 'value': 24.5},
                    {'year': 2022, 'value': 18.8},
                    {'year': 2021, 'value': 17.0},
                ]
            },
            'SL.UEM.TOTL.ZS': {  # Unemployment
                'latest_value': 5.3,
                'values': [
                    {'year': 2023, 'value': 5.3},
                    {'year': 2022, 'value': 5.0},
                    {'year': 2021, 'value': 6.0},
                ]
            },
            'SP.POP.TOTL': {  # Population
                'latest_value': 223804632,
                'values': [
                    {'year': 2023, 'value': 223804632},
                    {'year': 2022, 'value': 218541212},
                    {'year': 2021, 'value': 213401323},
                ]
            },
            'SP.URB.TOTL.IN.ZS': {  # Urban population %
                'latest_value': 53.5,
                'values': [
                    {'year': 2023, 'value': 53.5},
                    {'year': 2022, 'value': 53.0},
                    {'year': 2021, 'value': 52.5},
                ]
            },
            'FR.INR.RINR': {  # Real interest rate
                'latest_value': -6.5,
                'values': [
                    {'year': 2023, 'value': -6.5},
                    {'year': 2022, 'value': -3.2},
                    {'year': 2021, 'value': 0.5},
                ]
            },
            'PA.NUS.FCRF': {  # Exchange rate
                'latest_value': 770.0,
                'values': [
                    {'year': 2023, 'value': 770.0},
                    {'year': 2022, 'value': 435.0},
                    {'year': 2021, 'value': 410.0},
                ]
            },
        }
        
        data = mock_data.get(indicator_code, {
            'latest_value': 0,
            'values': []
        })
        
        return {
            'success': True,
            'indicator_code': indicator_code,
            'country': 'Nigeria',
            'country_code': self.country_code,
            'data': data['values'],
            'latest_value': data['latest_value'],
            'latest_year': 2023,
            'source': 'World Bank (Mock)',
            'retrieved_at': datetime.now().isoformat(),
            'mock': True
        }


# Flask API endpoints
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize service
worldbank_service = WorldBankService()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'worldbank',
        'mock_mode': worldbank_service.use_mock
    })


@app.route('/indicator/<indicator_code>', methods=['GET'])
def get_indicator(indicator_code):
    """Get a specific economic indicator"""
    start_year = request.args.get('start_year', type=int)
    end_year = request.args.get('end_year', type=int)
    
    result = worldbank_service.get_indicator(
        indicator_code=indicator_code,
        start_year=start_year,
        end_year=end_year
    )
    
    return jsonify(result)


@app.route('/indicators', methods=['GET'])
def get_indicators():
    """Get multiple economic indicators"""
    # Accept comma-separated list of indicators
    indicators_param = request.args.get('indicators')
    
    if indicators_param:
        indicators = [i.strip() for i in indicators_param.split(',')]
    else:
        indicators = None
    
    result = worldbank_service.get_economic_indicators(indicators)
    
    return jsonify(result)


@app.route('/state/<state>', methods=['GET'])
def get_state_data(state):
    """Get state-level economic data"""
    result = worldbank_service.get_state_level_data(state)
    
    return jsonify(result)


@app.route('/available-indicators', methods=['GET'])
def list_indicators():
    """List available indicators"""
    return jsonify({
        'success': True,
        'indicators': worldbank_service.indicators,
        'country': 'Nigeria'
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5011))
    app.run(host='0.0.0.0', port=port, debug=True)
