"""
NLP Semantic Search Service
Provides semantic search, multi-language support, and NLP analysis for property search
"""

from flask import Flask, request, jsonify
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging
import os
from datetime import datetime
import re
from collections import defaultdict

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SUPPORTED_LANGUAGES = ['en', 'yo', 'ig', 'ha', 'fr', 'ar']  # English, Yoruba, Igbo, Hausa, French, Arabic

class SemanticSearchEngine:
    """Semantic search engine with multi-language support"""
    
    def __init__(self):
        self.embeddings_cache = {}
        self.language_models = {}
        self.query_expansions = self._load_query_expansions()
        self.synonyms = self._load_synonyms()
        
    def _load_query_expansions(self) -> Dict[str, List[str]]:
        """Load query expansion rules for real estate domain"""
        return {
            # Property types
            'apartment': ['flat', 'condo', 'unit', 'suite'],
            'house': ['home', 'residence', 'dwelling', 'property'],
            'villa': ['mansion', 'estate', 'luxury home'],
            'duplex': ['two-family', 'double house'],
            'bungalow': ['single-story house', 'ranch'],
            
            # Features
            'pool': ['swimming pool', 'pool area', 'poolside'],
            'garage': ['parking', 'carport', 'parking space'],
            'garden': ['yard', 'lawn', 'outdoor space', 'backyard'],
            'balcony': ['terrace', 'patio', 'deck'],
            'gym': ['fitness center', 'workout room', 'exercise room'],
            
            # Locations (Nigerian cities)
            'lagos': ['lagos state', 'eko', 'lekki', 'victoria island', 'ikoyi'],
            'abuja': ['fct', 'federal capital territory', 'garki', 'wuse', 'maitama'],
            'port harcourt': ['ph', 'rivers state', 'garden city'],
            'kano': ['kano state', 'sabon gari'],
            'ibadan': ['oyo state'],
            
            # Amenities
            'furnished': ['fully furnished', 'equipped', 'move-in ready'],
            'modern': ['contemporary', 'new', 'recently built', 'updated'],
            'luxury': ['premium', 'high-end', 'upscale', 'exclusive'],
            'spacious': ['large', 'roomy', 'big', 'ample space'],
            
            # Price ranges
            'cheap': ['affordable', 'budget', 'low-cost', 'economical'],
            'expensive': ['premium', 'high-end', 'luxury', 'upscale'],
        }
    
    def _load_synonyms(self) -> Dict[str, Dict[str, List[str]]]:
        """Load multi-language synonyms"""
        return {
            'en': {
                'bedroom': ['room', 'bed', 'br'],
                'bathroom': ['bath', 'toilet', 'wc'],
                'kitchen': ['cooking area', 'kitchenette'],
                'living room': ['sitting room', 'lounge', 'parlor'],
            },
            'yo': {  # Yoruba
                'ile': ['house', 'home'],
                'yara': ['room', 'bedroom'],
                'balẹ': ['bathroom', 'toilet'],
                'ibi idana': ['kitchen'],
            },
            'ig': {  # Igbo
                'ụlọ': ['house', 'home'],
                'ọnụ ụlọ': ['room'],
                'ebe ịsa ahụ': ['bathroom'],
            },
            'ha': {  # Hausa
                'gida': ['house', 'home'],
                'ɗaki': ['room'],
                'bandaki': ['bathroom'],
            },
            'fr': {  # French
                'maison': ['house', 'home'],
                'chambre': ['bedroom', 'room'],
                'salle de bain': ['bathroom'],
                'cuisine': ['kitchen'],
            },
            'ar': {  # Arabic
                'منزل': ['house', 'home'],
                'غرفة': ['room'],
                'حمام': ['bathroom'],
            }
        }
    
    def detect_language(self, text: str) -> str:
        """Detect language of input text"""
        # Simple heuristic-based detection
        # In production, use langdetect or similar library
        
        text_lower = text.lower()
        
        # Check for Nigerian language keywords
        yoruba_keywords = ['ile', 'yara', 'owo', 'ọjọ']
        igbo_keywords = ['ụlọ', 'ego', 'ụbọchị']
        hausa_keywords = ['gida', 'kuɗi', 'rana']
        french_keywords = ['maison', 'chambre', 'prix', 'jour']
        arabic_keywords = ['منزل', 'غرفة', 'سعر']
        
        if any(kw in text_lower for kw in yoruba_keywords):
            return 'yo'
        elif any(kw in text_lower for kw in igbo_keywords):
            return 'ig'
        elif any(kw in text_lower for kw in hausa_keywords):
            return 'ha'
        elif any(kw in text_lower for kw in french_keywords):
            return 'fr'
        elif any(kw in text for kw in arabic_keywords):
            return 'ar'
        else:
            return 'en'
    
    def translate_to_english(self, text: str, source_lang: str) -> str:
        """Translate text to English"""
        if source_lang == 'en':
            return text
        
        # Simple dictionary-based translation for common terms
        # In production, use Google Translate API or similar
        
        translated = text.lower()
        
        if source_lang in self.synonyms:
            for term, translations in self.synonyms[source_lang].items():
                for translation in translations:
                    translated = translated.replace(term, translation)
        
        return translated
    
    def expand_query(self, query: str) -> List[str]:
        """Expand query with synonyms and related terms"""
        expanded = [query]
        query_lower = query.lower()
        
        # Add synonyms
        for term, synonyms in self.query_expansions.items():
            if term in query_lower:
                for synonym in synonyms:
                    expanded_query = query_lower.replace(term, synonym)
                    if expanded_query not in expanded:
                        expanded.append(expanded_query)
        
        return expanded[:10]  # Limit to top 10 expansions
    
    def extract_search_features(self, query: str) -> Dict:
        """Extract structured features from natural language query"""
        features = {
            'property_type': None,
            'bedrooms': None,
            'bathrooms': None,
            'price_min': None,
            'price_max': None,
            'location': None,
            'amenities': [],
            'keywords': []
        }
        
        query_lower = query.lower()
        
        # Extract property type
        property_types = ['apartment', 'house', 'villa', 'duplex', 'bungalow', 'flat', 'condo']
        for ptype in property_types:
            if ptype in query_lower:
                features['property_type'] = ptype
                break
        
        # Extract bedrooms
        bedroom_patterns = [
            r'(\d+)\s*(?:bed(?:room)?s?|br)',
            r'(\d+)\s*(?:room|chamber)',
        ]
        for pattern in bedroom_patterns:
            match = re.search(pattern, query_lower)
            if match:
                features['bedrooms'] = int(match.group(1))
                break
        
        # Extract bathrooms
        bathroom_patterns = [
            r'(\d+)\s*(?:bath(?:room)?s?|toilet)',
        ]
        for pattern in bathroom_patterns:
            match = re.search(pattern, query_lower)
            if match:
                features['bathrooms'] = int(match.group(1))
                break
        
        # Extract price range
        price_patterns = [
            r'(?:under|below|less than)\s*(?:₦|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)?',
            r'(?:₦|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)?\s*(?:to|-)\s*(?:₦|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)?',
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, query_lower)
            if match:
                if len(match.groups()) == 1:
                    features['price_max'] = self._parse_price(match.group(1))
                else:
                    features['price_min'] = self._parse_price(match.group(1))
                    features['price_max'] = self._parse_price(match.group(2))
                break
        
        # Extract location
        nigerian_cities = ['lagos', 'abuja', 'port harcourt', 'kano', 'ibadan', 'kaduna', 'benin', 'jos', 'ilorin', 'owerri']
        for city in nigerian_cities:
            if city in query_lower:
                features['location'] = city.title()
                break
        
        # Extract amenities
        amenities = ['pool', 'gym', 'garden', 'garage', 'balcony', 'security', 'generator', 'borehole', 'fence']
        for amenity in amenities:
            if amenity in query_lower:
                features['amenities'].append(amenity)
        
        # Extract keywords (remove common words)
        stop_words = {'a', 'an', 'the', 'in', 'on', 'at', 'for', 'with', 'to', 'from', 'by', 'of', 'and', 'or'}
        words = query_lower.split()
        features['keywords'] = [w for w in words if w not in stop_words and len(w) > 2]
        
        return features
    
    def _parse_price(self, price_str: str) -> float:
        """Parse price string to float"""
        # Remove commas and convert
        price_str = price_str.replace(',', '')
        price = float(price_str)
        
        # Convert millions to actual value
        # Assume values < 1000 are in millions
        if price < 1000:
            price = price * 1_000_000
        
        return price
    
    def semantic_search(self, query: str, properties: List[Dict], top_k: int = 10) -> List[Tuple[Dict, float]]:
        """
        Perform semantic search on properties
        
        Args:
            query: Search query
            properties: List of property dictionaries
            top_k: Number of top results to return
            
        Returns:
            List of (property, score) tuples
        """
        # Detect language and translate if needed
        lang = self.detect_language(query)
        if lang != 'en':
            query = self.translate_to_english(query, lang)
        
        # Expand query
        expanded_queries = self.expand_query(query)
        
        # Extract features
        features = self.extract_search_features(query)
        
        # Score each property
        scored_properties = []
        
        for prop in properties:
            score = self._calculate_relevance_score(prop, query, expanded_queries, features)
            scored_properties.append((prop, score))
        
        # Sort by score and return top K
        scored_properties.sort(key=lambda x: x[1], reverse=True)
        
        return scored_properties[:top_k]
    
    def _calculate_relevance_score(self, property: Dict, query: str, expanded_queries: List[str], features: Dict) -> float:
        """Calculate relevance score for a property"""
        score = 0.0
        
        # Text matching score
        property_text = f"{property.get('title', '')} {property.get('description', '')} {property.get('address', '')}".lower()
        
        # Direct query match
        if query.lower() in property_text:
            score += 10.0
        
        # Expanded query matches
        for exp_query in expanded_queries:
            if exp_query in property_text:
                score += 5.0
        
        # Feature matching
        if features['property_type'] and property.get('type', '').lower() == features['property_type']:
            score += 15.0
        
        if features['bedrooms'] and property.get('bedrooms') == features['bedrooms']:
            score += 10.0
        
        if features['bathrooms'] and property.get('bathrooms') == features['bathrooms']:
            score += 5.0
        
        if features['location'] and features['location'].lower() in property.get('city', '').lower():
            score += 20.0
        
        # Price range matching
        prop_price = property.get('price', 0)
        if features['price_min'] and features['price_max']:
            if features['price_min'] <= prop_price <= features['price_max']:
                score += 15.0
        elif features['price_max']:
            if prop_price <= features['price_max']:
                score += 10.0
        
        # Amenity matching
        prop_amenities = property.get('amenities', [])
        for amenity in features['amenities']:
            if amenity in str(prop_amenities).lower():
                score += 3.0
        
        # Keyword matching
        for keyword in features['keywords']:
            if keyword in property_text:
                score += 2.0
        
        return score
    
    def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment of property review or description"""
        # Simple rule-based sentiment analysis
        # In production, use VADER or transformer-based models
        
        positive_words = ['excellent', 'great', 'amazing', 'beautiful', 'perfect', 'love', 'wonderful', 'fantastic', 'good', 'nice', 'clean', 'spacious', 'modern', 'luxury']
        negative_words = ['bad', 'terrible', 'awful', 'poor', 'dirty', 'small', 'old', 'broken', 'noisy', 'expensive', 'overpriced']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        total = positive_count + negative_count
        
        if total == 0:
            sentiment = 'neutral'
            score = 0.5
        else:
            score = positive_count / total
            if score > 0.6:
                sentiment = 'positive'
            elif score < 0.4:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'score': round(score, 2),
            'positive_count': positive_count,
            'negative_count': negative_count
        }
    
    def extract_entities(self, text: str) -> Dict:
        """Extract named entities from text"""
        entities = {
            'locations': [],
            'prices': [],
            'property_types': [],
            'features': []
        }
        
        text_lower = text.lower()
        
        # Extract locations
        nigerian_cities = ['lagos', 'abuja', 'port harcourt', 'kano', 'ibadan', 'kaduna', 'benin', 'jos', 'ilorin']
        for city in nigerian_cities:
            if city in text_lower:
                entities['locations'].append(city.title())
        
        # Extract prices
        price_patterns = [
            r'(?:₦|ngn|naira)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m)?',
        ]
        for pattern in price_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                entities['prices'].append(self._parse_price(match))
        
        # Extract property types
        property_types = ['apartment', 'house', 'villa', 'duplex', 'bungalow', 'flat', 'condo']
        for ptype in property_types:
            if ptype in text_lower:
                entities['property_types'].append(ptype)
        
        # Extract features
        features = ['pool', 'gym', 'garden', 'garage', 'balcony', 'security']
        for feature in features:
            if feature in text_lower:
                entities['features'].append(feature)
        
        return entities


# Global engine instance
search_engine = SemanticSearchEngine()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'nlp-semantic-search',
        'supported_languages': SUPPORTED_LANGUAGES,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/search/semantic', methods=['POST'])
def semantic_search():
    """Semantic search endpoint"""
    try:
        data = request.json
        query = data.get('query', '')
        properties = data.get('properties', [])
        top_k = data.get('topK', 10)
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Perform semantic search
        results = search_engine.semantic_search(query, properties, top_k)
        
        return jsonify({
            'query': query,
            'results': [
                {
                    'property': prop,
                    'score': float(score)
                }
                for prop, score in results
            ],
            'total': len(results)
        })
    
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/query/expand', methods=['POST'])
def expand_query():
    """Query expansion endpoint"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        expanded = search_engine.expand_query(query)
        
        return jsonify({
            'original': query,
            'expanded': expanded
        })
    
    except Exception as e:
        logger.error(f"Error expanding query: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/query/analyze', methods=['POST'])
def analyze_query():
    """Analyze query and extract features"""
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Detect language
        lang = search_engine.detect_language(query)
        
        # Translate if needed
        translated = search_engine.translate_to_english(query, lang) if lang != 'en' else query
        
        # Extract features
        features = search_engine.extract_search_features(translated)
        
        return jsonify({
            'original': query,
            'language': lang,
            'translated': translated,
            'features': features
        })
    
    except Exception as e:
        logger.error(f"Error analyzing query: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/sentiment/analyze', methods=['POST'])
def analyze_sentiment():
    """Sentiment analysis endpoint"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        sentiment = search_engine.analyze_sentiment(text)
        
        return jsonify(sentiment)
    
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/entities/extract', methods=['POST'])
def extract_entities():
    """Entity extraction endpoint"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        entities = search_engine.extract_entities(text)
        
        return jsonify(entities)
    
    except Exception as e:
        logger.error(f"Error extracting entities: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/language/detect', methods=['POST'])
def detect_language():
    """Language detection endpoint"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        lang = search_engine.detect_language(text)
        
        return jsonify({
            'text': text,
            'language': lang,
            'supported': lang in SUPPORTED_LANGUAGES
        })
    
    except Exception as e:
        logger.error(f"Error detecting language: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5005))
    app.run(host='0.0.0.0', port=port, debug=False)
