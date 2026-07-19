"""
Enhanced Ollama-powered AI Chatbot Service with Lakehouse Integration
Provides intelligent property assistance with conversation logging to Kafka/Delta Lake
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
import uuid

# Kafka integration (optional - gracefully degrades if not available)
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    print("[WARNING] kafka-python not installed. Conversation logging disabled.")

app = Flask(__name__)
CORS(app)

# ============================================================================
# Configuration
# ============================================================================

# Ollama configuration
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama2')

# Kafka configuration for lakehouse integration
KAFKA_ENABLED = os.getenv('KAFKA_ENABLED', 'false').lower() == 'true'
KAFKA_BROKERS = os.getenv('KAFKA_BROKERS', 'localhost:29092').split(',')
KAFKA_TOPIC_CONVERSATIONS = 'ollama.conversations'
KAFKA_TOPIC_ANALYTICS = 'ollama.analytics'

# MLflow configuration
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5050')

# ============================================================================
# Kafka Producer (Lakehouse Integration)
# ============================================================================

kafka_producer = None

if KAFKA_ENABLED and KAFKA_AVAILABLE:
    try:
        kafka_producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            acks='all',
            retries=3,
        )
        print(f"[Kafka] Connected to brokers: {KAFKA_BROKERS}")
    except Exception as e:
        print(f"[Kafka] Failed to connect: {e}")
        kafka_producer = None

def log_conversation_to_lakehouse(
    conversation_id: str,
    user_id: Optional[str],
    messages: List[Dict],
    response: Dict,
    context: str,
    metadata: Optional[Dict] = None
):
    """
    Log conversation to Kafka → Bronze Layer (Delta Lake)
    
    This enables:
    - Conversation analytics in Silver layer
    - Model fine-tuning data in Gold layer
    - User behavior tracking
    - Model performance monitoring
    """
    if not kafka_producer:
        return
    
    try:
        event = {
            'event_id': str(uuid.uuid4()),
            'event_type': 'ollama.conversation',
            'timestamp': datetime.utcnow().isoformat(),
            'conversation_id': conversation_id,
            'user_id': user_id,
            'context': context,
            'model': OLLAMA_MODEL,
            'messages': messages,
            'response': {
                'content': response.get('message', {}).get('content', ''),
                'role': response.get('message', {}).get('role', 'assistant'),
                'model': response.get('model'),
                'created_at': response.get('created_at'),
                'done': response.get('done', True),
            },
            'metadata': metadata or {},
        }
        
        kafka_producer.send(
            KAFKA_TOPIC_CONVERSATIONS,
            key=conversation_id,
            value=event
        )
        kafka_producer.flush()
        print(f"[Lakehouse] Logged conversation {conversation_id} to Kafka")
        
    except Exception as e:
        print(f"[Lakehouse] Failed to log conversation: {e}")

def log_analytics_event(
    event_type: str,
    user_id: Optional[str],
    data: Dict
):
    """
    Log analytics events to Kafka for real-time processing
    
    Events flow: Kafka → Flink → ClickHouse → Analytics Dashboard
    """
    if not kafka_producer:
        return
    
    try:
        event = {
            'event_id': str(uuid.uuid4()),
            'event_type': f'ollama.{event_type}',
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'model': OLLAMA_MODEL,
            'data': data,
        }
        
        kafka_producer.send(
            KAFKA_TOPIC_ANALYTICS,
            key=user_id or 'anonymous',
            value=event
        )
        
    except Exception as e:
        print(f"[Analytics] Failed to log event: {e}")

# ============================================================================
# System Prompts
# ============================================================================

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

# ============================================================================
# Ollama API Integration
# ============================================================================

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
            stream=stream,
            timeout=60
        )
        
        if stream:
            return response
        else:
            response.raise_for_status()
            return response.json()
            
    except requests.exceptions.RequestException as e:
        print(f"Ollama API error: {e}")
        return None

# ============================================================================
# API Endpoints
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Check if Ollama is running
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        ollama_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        ollama_status = "unreachable"
    
    return jsonify({
        "status": "healthy",
        "ollama": ollama_status,
        "model": OLLAMA_MODEL,
        "kafka_enabled": KAFKA_ENABLED and kafka_producer is not None,
        "mlflow_uri": MLFLOW_TRACKING_URI,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint with lakehouse logging"""
    data = request.json
    messages = data.get('messages', [])
    context = data.get('context', 'general')
    user_id = data.get('user_id')
    conversation_id = data.get('conversation_id', str(uuid.uuid4()))
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400
    
    # Call Ollama
    start_time = datetime.utcnow()
    result = call_ollama(messages, context)
    end_time = datetime.utcnow()
    
    if result is None:
        return jsonify({"error": "Failed to get response from Ollama"}), 500
    
    # Log to lakehouse
    response_time_ms = (end_time - start_time).total_seconds() * 1000
    log_conversation_to_lakehouse(
        conversation_id=conversation_id,
        user_id=user_id,
        messages=messages,
        response=result,
        context=context,
        metadata={
            'response_time_ms': response_time_ms,
            'message_count': len(messages),
        }
    )
    
    # Log analytics event
    log_analytics_event(
        event_type='chat_completion',
        user_id=user_id,
        data={
            'conversation_id': conversation_id,
            'context': context,
            'response_time_ms': response_time_ms,
            'message_count': len(messages),
        }
    )
    
    return jsonify({
        "message": result.get('message', {}),
        "model": result.get('model'),
        "created_at": result.get('created_at'),
        "done": result.get('done', True),
        "conversation_id": conversation_id,
    })

@app.route('/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming chat endpoint for real-time responses"""
    data = request.json
    messages = data.get('messages', [])
    context = data.get('context', 'general')
    user_id = data.get('user_id')
    conversation_id = data.get('conversation_id', str(uuid.uuid4()))
    
    if not messages:
        return jsonify({"error": "No messages provided"}), 400
    
    def generate():
        response = call_ollama(messages, context, stream=True)
        if response is None:
            yield json.dumps({"error": "Failed to connect to Ollama"}) + "\n"
            return
        
        full_response = ""
        for line in response.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                yield decoded + "\n"
                
                # Accumulate response for logging
                try:
                    chunk = json.loads(decoded)
                    if 'message' in chunk and 'content' in chunk['message']:
                        full_response += chunk['message']['content']
                except:
                    pass
        
        # Log completed conversation
        if full_response:
            log_conversation_to_lakehouse(
                conversation_id=conversation_id,
                user_id=user_id,
                messages=messages,
                response={'message': {'content': full_response, 'role': 'assistant'}},
                context=context,
                metadata={'streaming': True}
            )
    
    return Response(generate(), mimetype='application/x-ndjson')

@app.route('/analyze/property', methods=['POST'])
def analyze_property():
    """Analyze property details and provide insights"""
    data = request.json
    property_data = data.get('property', {})
    user_id = data.get('user_id')
    
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
    
    # Log analytics
    log_analytics_event(
        event_type='property_analysis',
        user_id=user_id,
        data={
            'property_id': property_data.get('id'),
            'property_price': property_data.get('price'),
            'property_type': property_data.get('type'),
        }
    )
    
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
    user_id = data.get('user_id')
    
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
    
    # Log analytics
    log_analytics_event(
        event_type='document_explanation',
        user_id=user_id,
        data={
            'document_type': document_type,
            'document_length': len(document_text),
        }
    )
    
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
    user_id = data.get('user_id')
    
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
    
    # Log analytics
    log_analytics_event(
        event_type='recommendation_request',
        user_id=user_id,
        data={
            'preferences': user_preferences,
            'history_count': len(user_history),
        }
    )
    
    return jsonify({
        "recommendations": result.get('message', {}).get('content', '')
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available Ollama models"""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models/pull', methods=['POST'])
def pull_model():
    """Download a new Ollama model"""
    data = request.json
    model_name = data.get('model')
    
    if not model_name:
        return jsonify({"error": "No model name provided"}), 400
    
    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/pull",
            json={"name": model_name},
            stream=True,
            timeout=300
        )
        
        def generate():
            for line in response.iter_lines():
                if line:
                    yield line.decode('utf-8') + "\n"
        
        return Response(generate(), mimetype='application/x-ndjson')
        
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analytics/summary', methods=['GET'])
def analytics_summary():
    """Get conversation analytics summary (from lakehouse)"""
    # This would query the lakehouse Gold layer for aggregated analytics
    # For now, return placeholder data
    return jsonify({
        "total_conversations": 0,
        "total_messages": 0,
        "avg_response_time_ms": 0,
        "most_used_context": "general",
        "note": "Analytics data available when lakehouse is running"
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=True)
