from flask import Flask, request, jsonify
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class MLRecommendationService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=100)
        self.property_features = {}
        self.user_preferences = {}
        
    def extract_property_features(self, property_data: Dict[str, Any]) -> np.ndarray:
        features = []
        features.append(property_data.get('price', 0) / 1000000)
        features.append(property_data.get('bedrooms', 0))
        features.append(property_data.get('bathrooms', 0))
        features.append(property_data.get('sqft', 0) / 1000)
        features.append(1 if property_data.get('hasParking') else 0)
        features.append(1 if property_data.get('hasPool') else 0)
        features.append(1 if property_data.get('hasSecurity') else 0)
        
        location_score = {
            'Lekki': 0.9, 'Victoria Island': 1.0, 'Ikoyi': 0.95,
            'Banana Island': 1.0, 'Ikeja': 0.7, 'Surulere': 0.6
        }.get(property_data.get('location', ''), 0.5)
        features.append(location_score)
        
        return np.array(features)
    
    def collaborative_filtering(self, user_id: str, properties: List[Dict]) -> List[Dict]:
        user_history = self.user_preferences.get(user_id, [])
        
        if not user_history:
            return self.content_based_filtering(properties, {})[:10]
        
        property_scores = []
        for prop in properties:
            score = 0
            for hist_prop in user_history:
                if hist_prop['location'] == prop.get('location'):
                    score += 0.3
                if abs(hist_prop['price'] - prop.get('price', 0)) < 5000000:
                    score += 0.2
                if hist_prop['bedrooms'] == prop.get('bedrooms'):
                    score += 0.2
                if hist_prop['propertyType'] == prop.get('propertyType'):
                    score += 0.3
            
            property_scores.append({
                **prop,
                'recommendationScore': score,
                'reason': 'Based on your viewing history'
            })
        
        property_scores.sort(key=lambda x: x['recommendationScore'], reverse=True)
        return property_scores[:10]
    
    def content_based_filtering(self, properties: List[Dict], user_prefs: Dict) -> List[Dict]:
        if not properties:
            return []
        
        features_matrix = np.array([
            self.extract_property_features(prop) for prop in properties
        ])
        
        if user_prefs:
            user_feature = self.extract_property_features(user_prefs)
            similarities = cosine_similarity([user_feature], features_matrix)[0]
        else:
            avg_feature = np.mean(features_matrix, axis=0)
            similarities = cosine_similarity([avg_feature], features_matrix)[0]
        
        for i, prop in enumerate(properties):
            prop['recommendationScore'] = float(similarities[i])
            prop['reason'] = 'Matches your preferences'
        
        properties.sort(key=lambda x: x['recommendationScore'], reverse=True)
        return properties
    
    def hybrid_recommendation(
        self, 
        user_id: str, 
        properties: List[Dict],
        user_prefs: Dict,
        weights: Dict[str, float] = None
    ) -> List[Dict]:
        if weights is None:
            weights = {'collaborative': 0.6, 'content': 0.4}
        
        collab_results = self.collaborative_filtering(user_id, properties)
        content_results = self.content_based_filtering(properties, user_prefs)
        
        combined_scores = {}
        for prop in properties:
            prop_id = prop.get('id', prop.get('propertyId'))
            
            collab_score = next(
                (p['recommendationScore'] for p in collab_results if p.get('id') == prop_id),
                0
            )
            content_score = next(
                (p['recommendationScore'] for p in content_results if p.get('id') == prop_id),
                0
            )
            
            combined_scores[prop_id] = (
                collab_score * weights['collaborative'] +
                content_score * weights['content']
            )
        
        for prop in properties:
            prop_id = prop.get('id', prop.get('propertyId'))
            prop['recommendationScore'] = combined_scores.get(prop_id, 0)
            prop['reason'] = 'Personalized recommendation'
        
        properties.sort(key=lambda x: x['recommendationScore'], reverse=True)
        return properties[:10]
    
    def location_based_recommendation(
        self,
        user_location: Dict[str, float],
        properties: List[Dict],
        max_distance_km: float = 10
    ) -> List[Dict]:
        def haversine_distance(lat1, lon1, lat2, lon2):
            R = 6371
            dlat = np.radians(lat2 - lat1)
            dlon = np.radians(lon2 - lon1)
            a = (np.sin(dlat/2)**2 + 
                 np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * 
                 np.sin(dlon/2)**2)
            c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
            return R * c
        
        user_lat = user_location.get('latitude')
        user_lon = user_location.get('longitude')
        
        nearby_properties = []
        for prop in properties:
            prop_lat = prop.get('latitude')
            prop_lon = prop.get('longitude')
            
            if prop_lat and prop_lon:
                distance = haversine_distance(user_lat, user_lon, prop_lat, prop_lon)
                if distance <= max_distance_km:
                    prop['distance_km'] = round(distance, 2)
                    prop['recommendationScore'] = 1 - (distance / max_distance_km)
                    prop['reason'] = f'{distance:.1f}km from your location'
                    nearby_properties.append(prop)
        
        nearby_properties.sort(key=lambda x: x['distance_km'])
        return nearby_properties
    
    def price_prediction(self, property_features: Dict) -> Dict:
        bedrooms = property_features.get('bedrooms', 3)
        bathrooms = property_features.get('bathrooms', 2)
        sqft = property_features.get('sqft', 1500)
        location = property_features.get('location', 'Ikeja')
        
        location_multiplier = {
            'Lekki': 1.2, 'Victoria Island': 1.5, 'Ikoyi': 1.4,
            'Banana Island': 2.0, 'Ikeja': 1.0, 'Surulere': 0.8
        }.get(location, 1.0)
        
        base_price = (bedrooms * 15000000 + 
                     bathrooms * 5000000 + 
                     sqft * 150000)
        
        predicted_price = base_price * location_multiplier
        
        confidence_interval = predicted_price * 0.15
        
        return {
            'predicted_price': int(predicted_price),
            'price_range': {
                'min': int(predicted_price - confidence_interval),
                'max': int(predicted_price + confidence_interval)
            },
            'confidence': 0.85,
            'factors': {
                'location_impact': f'{(location_multiplier - 1) * 100:.1f}%',
                'size_impact': f'{(sqft / 1000) * 10:.1f}%',
                'bedrooms_impact': f'{bedrooms * 5:.1f}%'
            }
        }
    
    def update_user_preferences(self, user_id: str, viewed_property: Dict):
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = []
        
        self.user_preferences[user_id].append(viewed_property)
        
        if len(self.user_preferences[user_id]) > 50:
            self.user_preferences[user_id] = self.user_preferences[user_id][-50:]

service = MLRecommendationService()

@app.route('/recommend/collaborative', methods=['POST'])
def collaborative_recommend():
    data = request.json
    user_id = data.get('userId')
    properties = data.get('properties', [])
    
    recommendations = service.collaborative_filtering(user_id, properties)
    return jsonify(recommendations)

@app.route('/recommend/content', methods=['POST'])
def content_recommend():
    data = request.json
    properties = data.get('properties', [])
    user_prefs = data.get('userPreferences', {})
    
    recommendations = service.content_based_filtering(properties, user_prefs)
    return jsonify(recommendations)

@app.route('/recommend/hybrid', methods=['POST'])
def hybrid_recommend():
    data = request.json
    user_id = data.get('userId')
    properties = data.get('properties', [])
    user_prefs = data.get('userPreferences', {})
    weights = data.get('weights')
    
    recommendations = service.hybrid_recommendation(user_id, properties, user_prefs, weights)
    return jsonify(recommendations)

@app.route('/recommend/location', methods=['POST'])
def location_recommend():
    data = request.json
    user_location = data.get('userLocation')
    properties = data.get('properties', [])
    max_distance = data.get('maxDistanceKm', 10)
    
    recommendations = service.location_based_recommendation(user_location, properties, max_distance)
    return jsonify(recommendations)

@app.route('/predict/price', methods=['POST'])
def predict_price():
    data = request.json
    prediction = service.price_prediction(data)
    return jsonify(prediction)

@app.route('/user/preferences', methods=['POST'])
def update_preferences():
    data = request.json
    user_id = data.get('userId')
    viewed_property = data.get('property')
    
    service.update_user_preferences(user_id, viewed_property)
    return jsonify({'success': True})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'ml-recommendation'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5103))
    app.run(host='0.0.0.0', port=port, debug=True)
