"""
Ollama-powered AI Chatbot Service for Real Estate Platform
Provides intelligent property assistance, tour scheduling, and document explanations
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Ollama configuration
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama2')

# System prompts for different contexts
SYSTEM_PROMPTS = {
    'general': """You are a helpful real estate assistant. You help users find properties, 
    schedule tours, understand documents, and answer questions about the real estate market. 
    Be professional, friendly, and concise. If you don't know something, admit it.""",
    
    'property_search': """You are a real estate property search assistant. Help users find 
    their dream home by understanding their requirements (budget, location, bedrooms, amenities). 
    Ask clarifying questions and provide personalized recommendations.""",
    
    'tour_scheduling': """You are a tour scheduling assistant. Help users schedule property 
    tours by collecting necessary information (preferred date/time, tour type: in-person or virtual, 
    contact details). Be efficient and confirm all details.""",
    
    'document_explanation': """You are a real estate document expert. Explain complex real estate 
    documents (purchase agreements, disclosure forms, mortgage documents) in simple terms. 
    Highlight important clauses and potential concerns.""",
    
    'investment_advice': """You are a real estate investment advisor. Help users analyze 
    properties for investment potential, calculate ROI, assess market trends, and understand 
    risks. Provide data-driven insights."""
}

def call_ollama(messages, context='general', stream=False):
    """Call Ollama API with conversation history"""
    try:
        # Prepend system prompt
        full_messages = [
            {"role": "system", "content": SYSTEM_PROMPTS.get(context, SYSTEM_PROMPTS['general'])}
        ] + messages
        
        payload = {
            "model": OLLAMA_MODEL,
            "messages": full_messages,
            "stream": stream
        }
        
        response = requests.post(
            f"{OLLAMA_API_URL}/api/chat",
            json=payload,
            stream=stream
        )
        
        if stream:
            return response
        else:
            response.raise_for_status()
            return response.json()
            
    except requests.exceptions.RequestException as e:
        print(f"Ollama API error: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Check if Ollama is running
        response = requests.get(f"{OLLAMA_API_URL}/api/tags")
        ollama_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        ollama_status = "unreachable"
    
    return jsonify({
        "status": "healthy",
        "ollama": ollama_status,
        "model": OLLAMA_MODEL,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    data = request.json
    messages = data.get('messages', [])
    context = data.get('context', 'general')
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400
    
    # Call Ollama
    result = call_ollama(messages, context)
    
    if result is None:
        return jsonify({"error": "Failed to get response from Ollama"}), 500
    
    return jsonify({
        "message": result.get('message', {}),
        "model": result.get('model'),
        "created_at": result.get('created_at'),
        "done": result.get('done', True)
    })

@app.route('/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming chat endpoint for real-time responses"""
    data = request.json
    messages = data.get('messages', [])
    context = data.get('context', 'general')
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400
    
    def generate():
        response = call_ollama(messages, context, stream=True)
        if response is None:
            yield json.dumps({"error": "Failed to connect to Ollama"}) + "\n"
            return
        
        for line in response.iter_lines():
            if line:
                yield line.decode('utf-8') + "\n"
    
    return app.response_class(generate(), mimetype='application/x-ndjson')

@app.route('/analyze/property', methods=['POST'])
def analyze_property():
    """Analyze property details and provide insights"""
    data = request.json
    property_data = data.get('property', {})
    
    # Create analysis prompt
    prompt = f"""Analyze this property and provide insights:
    
    Property Details:
    - Price: ${property_data.get('price', 'N/A')}
    - Location: {property_data.get('location', 'N/A')}
    - Bedrooms: {property_data.get('bedrooms', 'N/A')}
    - Bathrooms: {property_data.get('bathrooms', 'N/A')}
    - Square Feet: {property_data.get('squareFeet', 'N/A')}
    - Year Built: {property_data.get('yearBuilt', 'N/A')}
    - Property Type: {property_data.get('type', 'N/A')}
    
    Provide:
    1. Market value assessment
    2. Investment potential
    3. Key pros and cons
    4. Comparable properties analysis
    5. Negotiation tips
    """
    
    messages = [{"role": "user", "content": prompt}]
    result = call_ollama(messages, context='investment_advice')
    
    if result is None:
        return jsonify({"error": "Failed to analyze property"}), 500
    
    return jsonify({
        "analysis": result.get('message', {}).get('content', ''),
        "property_id": property_data.get('id')
    })

@app.route('/explain/document', methods=['POST'])
def explain_document():
    """Explain real estate document in simple terms"""
    data = request.json
    document_text = data.get('text', '')
    document_type = data.get('type', 'general')
    
    if not document_text:
        return jsonify({"error": "No document text provided"}), 400
    
    prompt = f"""Explain this {document_type} real estate document in simple terms:

    {document_text}
    
    Provide:
    1. Summary of key points
    2. Important clauses to note
    3. Potential concerns or red flags
    4. Questions to ask
    5. Next steps
    """
    
    messages = [{"role": "user", "content": prompt}]
    result = call_ollama(messages, context='document_explanation')
    
    if result is None:
        return jsonify({"error": "Failed to explain document"}), 500
    
    return jsonify({
        "explanation": result.get('message', {}).get('content', ''),
        "document_type": document_type
    })

@app.route('/recommend/properties', methods=['POST'])
def recommend_properties():
    """Generate personalized property recommendations"""
    data = request.json
    user_preferences = data.get('preferences', {})
    user_history = data.get('history', [])
    
    prompt = f"""Based on user preferences and viewing history, recommend properties:
    
    User Preferences:
    - Budget: ${user_preferences.get('minPrice', 0)} - ${user_preferences.get('maxPrice', 0)}
    - Location: {user_preferences.get('location', 'Any')}
    - Bedrooms: {user_preferences.get('bedrooms', 'Any')}
    - Property Type: {user_preferences.get('type', 'Any')}
    - Must-have amenities: {', '.join(user_preferences.get('amenities', []))}
    
    Recently Viewed: {len(user_history)} properties
    
    Provide personalized recommendations with reasoning.
    """
    
    messages = [{"role": "user", "content": prompt}]
    result = call_ollama(messages, context='property_search')
    
    if result is None:
        return jsonify({"error": "Failed to generate recommendations"}), 500
    
    return jsonify({
        "recommendations": result.get('message', {}).get('content', '')
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available Ollama models"""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags")
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
