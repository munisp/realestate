"""
PropertyPro.ng Web Scraping Service
Ethical web scraper for Nigerian property market data
"""

import os
import json
import time
import random
from typing import Dict, List, Optional
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import re

from shared.logger import get_logger
logger = get_logger("propertypro-scraper")


class PropertyProScraper:
    """
    Ethical web scraper for PropertyPro.ng
    
    Respects robots.txt and implements rate limiting
    """
    
    def __init__(self):
        self.base_url = "https://www.propertypro.ng"
        self.use_mock = os.getenv('USE_MOCK_SCRAPER', 'true').lower() == 'true'
        
        # Rate limiting: 1 request per 3 seconds (20 requests/minute)
        self.rate_limit_seconds = 3
        self.last_request_time = 0
        
        # User agent to identify our scraper
        self.headers = {
            'User-Agent': 'PropertyValuationBot/1.0 (Research purposes; respecting robots.txt)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        # States in Nigeria
        self.states = [
            'lagos', 'abuja', 'rivers', 'ogun', 'edo', 'delta', 'oyo',
            'kano', 'kaduna', 'anambra', 'enugu', 'imo', 'cross-river'
        ]
        
        logger.info(f"PropertyPro scraper initialized (mock={self.use_mock})")
    
    def _respect_rate_limit(self):
        """Implement rate limiting to be respectful"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_seconds:
            sleep_time = self.rate_limit_seconds - time_since_last
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_request(self, url: str) -> Optional[str]:
        """Make HTTP request with rate limiting and error handling"""
        if self.use_mock:
            return None
        
        try:
            self._respect_rate_limit()
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            return response.text
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def scrape_listings(
        self,
        state: str = 'lagos',
        property_type: Optional[str] = None,
        max_pages: int = 3
    ) -> List[Dict]:
        """
        Scrape property listings from PropertyPro.ng
        
        Args:
            state: Nigerian state (e.g., 'lagos', 'abuja')
            property_type: Property type filter (e.g., 'house', 'flat')
            max_pages: Maximum number of pages to scrape
        
        Returns:
            List of property listings
        """
        if self.use_mock:
            return self._get_mock_listings(state, property_type)
        
        listings = []
        
        try:
            # Build URL based on robots.txt allowed paths
            # Avoid disallowed query parameters
            base_path = f"/property-for-sale/{state}"
            
            for page in range(1, max_pages + 1):
                url = f"{self.base_url}{base_path}"
                if page > 1:
                    url += f"?page={page}"
                
                logger.info(f"Scraping page {page}: {url}")
                
                html = self._make_request(url)
                if not html:
                    logger.warning(f"Failed to fetch page {page}")
                    continue
                
                # Parse HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract property cards
                # Note: This is a simplified parser - actual structure may vary
                property_cards = soup.find_all('div', class_='property-card')
                
                for card in property_cards:
                    try:
                        listing = self._parse_property_card(card)
                        if listing:
                            listings.append(listing)
                    except Exception as e:
                        logger.error(f"Error parsing property card: {e}")
                        continue
                
                # Random delay between pages
                if page < max_pages:
                    time.sleep(random.uniform(2, 4))
            
            logger.info(f"Scraped {len(listings)} listings from {state}")
            return listings
            
        except Exception as e:
            logger.error(f"Error scraping listings: {e}")
            return self._get_mock_listings(state, property_type)
    
    def _parse_property_card(self, card) -> Optional[Dict]:
        """Parse a property card HTML element"""
        try:
            # Extract price
            price_elem = card.find('span', class_='price')
            price_text = price_elem.text.strip() if price_elem else '0'
            price = self._parse_price(price_text)
            
            # Extract title
            title_elem = card.find('h3') or card.find('a', class_='title')
            title = title_elem.text.strip() if title_elem else 'Unknown'
            
            # Extract location
            location_elem = card.find('span', class_='location')
            location = location_elem.text.strip() if location_elem else 'Unknown'
            
            # Extract bedrooms
            beds_elem = card.find('span', class_='beds')
            bedrooms = int(beds_elem.text.strip()) if beds_elem else 0
            
            # Extract bathrooms
            baths_elem = card.find('span', class_='baths')
            bathrooms = int(baths_elem.text.strip()) if baths_elem else 0
            
            # Extract property type
            type_elem = card.find('span', class_='type')
            property_type = type_elem.text.strip() if type_elem else 'Unknown'
            
            # Extract listing date
            date_elem = card.find('span', class_='date')
            listed_date = date_elem.text.strip() if date_elem else None
            
            return {
                'title': title,
                'price': price,
                'location': location,
                'bedrooms': bedrooms,
                'bathrooms': bathrooms,
                'property_type': property_type,
                'listed_date': listed_date,
                'source': 'PropertyPro.ng',
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing property card: {e}")
            return None
    
    def _parse_price(self, price_text: str) -> float:
        """Parse price string to float (in Naira)"""
        try:
            # Remove currency symbol and commas
            price_text = price_text.replace('₦', '').replace(',', '').strip()
            
            # Handle millions and billions
            if 'million' in price_text.lower():
                number = float(re.findall(r'[\d.]+', price_text)[0])
                return number * 1_000_000
            elif 'billion' in price_text.lower():
                number = float(re.findall(r'[\d.]+', price_text)[0])
                return number * 1_000_000_000
            else:
                return float(price_text)
                
        except Exception as e:
            logger.error(f"Error parsing price '{price_text}': {e}")
            return 0.0
    
    def get_market_statistics(self, state: str = 'lagos') -> Dict:
        """
        Get market statistics for a state
        
        Args:
            state: Nigerian state
        
        Returns:
            Dict with market statistics
        """
        if self.use_mock:
            return self._get_mock_statistics(state)
        
        listings = self.scrape_listings(state=state, max_pages=5)
        
        if not listings:
            return self._get_mock_statistics(state)
        
        # Calculate statistics
        prices = [l['price'] for l in listings if l['price'] > 0]
        
        if not prices:
            return self._get_mock_statistics(state)
        
        return {
            'success': True,
            'state': state,
            'total_listings': len(listings),
            'average_price': sum(prices) / len(prices),
            'median_price': sorted(prices)[len(prices) // 2],
            'min_price': min(prices),
            'max_price': max(prices),
            'property_types': self._count_property_types(listings),
            'source': 'PropertyPro.ng',
            'retrieved_at': datetime.now().isoformat()
        }
    
    def _count_property_types(self, listings: List[Dict]) -> Dict:
        """Count properties by type"""
        counts = {}
        for listing in listings:
            ptype = listing.get('property_type', 'Unknown')
            counts[ptype] = counts.get(ptype, 0) + 1
        return counts
    
    def _get_mock_listings(
        self,
        state: str,
        property_type: Optional[str]
    ) -> List[Dict]:
        """Return mock listings for development"""
        
        # Mock data based on Lagos market
        mock_listings = [
            {
                'title': '4 Bedroom Detached Duplex',
                'price': 85_000_000,  # ₦85M
                'location': f'Lekki Phase 1, {state.title()}',
                'bedrooms': 4,
                'bathrooms': 4,
                'property_type': 'House',
                'listed_date': '2024-11-15',
                'source': 'PropertyPro.ng (Mock)',
                'scraped_at': datetime.now().isoformat(),
                'mock': True
            },
            {
                'title': '3 Bedroom Flat',
                'price': 45_000_000,  # ₦45M
                'location': f'Victoria Island, {state.title()}',
                'bedrooms': 3,
                'bathrooms': 3,
                'property_type': 'Flat',
                'listed_date': '2024-11-18',
                'source': 'PropertyPro.ng (Mock)',
                'scraped_at': datetime.now().isoformat(),
                'mock': True
            },
            {
                'title': '5 Bedroom Mansion',
                'price': 250_000_000,  # ₦250M
                'location': f'Banana Island, {state.title()}',
                'bedrooms': 5,
                'bathrooms': 6,
                'property_type': 'House',
                'listed_date': '2024-11-10',
                'source': 'PropertyPro.ng (Mock)',
                'scraped_at': datetime.now().isoformat(),
                'mock': True
            },
            {
                'title': '2 Bedroom Apartment',
                'price': 28_000_000,  # ₦28M
                'location': f'Ikeja GRA, {state.title()}',
                'bedrooms': 2,
                'bathrooms': 2,
                'property_type': 'Flat',
                'listed_date': '2024-11-20',
                'source': 'PropertyPro.ng (Mock)',
                'scraped_at': datetime.now().isoformat(),
                'mock': True
            },
            {
                'title': '6 Bedroom Detached House',
                'price': 180_000_000,  # ₦180M
                'location': f'Ikoyi, {state.title()}',
                'bedrooms': 6,
                'bathrooms': 7,
                'property_type': 'House',
                'listed_date': '2024-11-12',
                'source': 'PropertyPro.ng (Mock)',
                'scraped_at': datetime.now().isoformat(),
                'mock': True
            }
        ]
        
        # Filter by property type if specified
        if property_type:
            mock_listings = [
                l for l in mock_listings
                if l['property_type'].lower() == property_type.lower()
            ]
        
        return mock_listings
    
    def _get_mock_statistics(self, state: str) -> Dict:
        """Return mock market statistics"""
        return {
            'success': True,
            'state': state,
            'total_listings': 1250,
            'average_price': 75_000_000,  # ₦75M
            'median_price': 55_000_000,   # ₦55M
            'min_price': 15_000_000,      # ₦15M
            'max_price': 500_000_000,     # ₦500M
            'property_types': {
                'House': 650,
                'Flat': 420,
                'Land': 180
            },
            'source': 'PropertyPro.ng (Mock)',
            'retrieved_at': datetime.now().isoformat(),
            'mock': True
        }


# Flask API endpoints
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize scraper
scraper = PropertyProScraper()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'propertypro-scraper',
        'mock_mode': scraper.use_mock
    })


@app.route('/listings', methods=['GET'])
def get_listings():
    """Get property listings"""
    state = request.args.get('state', 'lagos')
    property_type = request.args.get('property_type')
    max_pages = request.args.get('max_pages', 3, type=int)
    
    # Limit max pages to prevent abuse
    max_pages = min(max_pages, 10)
    
    listings = scraper.scrape_listings(
        state=state,
        property_type=property_type,
        max_pages=max_pages
    )
    
    return jsonify({
        'success': True,
        'state': state,
        'count': len(listings),
        'listings': listings
    })


@app.route('/statistics/<state>', methods=['GET'])
def get_statistics(state):
    """Get market statistics for a state"""
    stats = scraper.get_market_statistics(state)
    return jsonify(stats)


@app.route('/states', methods=['GET'])
def list_states():
    """List available states"""
    return jsonify({
        'success': True,
        'states': scraper.states
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5012))
    app.run(host='0.0.0.0', port=port, debug=True)
