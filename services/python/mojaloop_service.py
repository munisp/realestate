"""
Mojaloop Payment Provider Service

Enables mobile money payments across Africa (M-Pesa, MTN Mobile Money, Airtel Money, etc.)
through the Mojaloop open-source payment platform.

Port: 5010
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import logging
import hashlib
import hmac
import json
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
MOJALOOP_API_URL = os.getenv('MOJALOOP_API_URL', 'http://localhost:4001')
MOJALOOP_API_KEY = os.getenv('MOJALOOP_API_KEY', '')
MOJALOOP_FSP_ID = os.getenv('MOJALOOP_FSP_ID', 'escrow_fsp')
MOJALOOP_WEBHOOK_SECRET = os.getenv('MOJALOOP_WEBHOOK_SECRET', 'change_me_in_production')

# Supported currencies
SUPPORTED_CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'NGN', 'ZAR', 'GHS']

# In-memory storage (replace with Redis in production)
escrow_store: Dict[str, Dict[str, Any]] = {}


def generate_ilp_packet(amount: float, currency: str) -> str:
    """Generate ILP (Interledger Protocol) packet"""
    data = f"{amount}:{currency}:{datetime.utcnow().isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()


def generate_condition(ilp_packet: str) -> str:
    """Generate condition hash for transfer"""
    return hashlib.sha256(ilp_packet.encode()).hexdigest()


def generate_fulfilment(condition: str) -> str:
    """Generate fulfilment for condition"""
    return hashlib.sha256(condition.encode()).hexdigest()


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify webhook signature"""
    expected = hmac.new(
        MOJALOOP_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Mojaloop API connectivity
        response = requests.get(
            f"{MOJALOOP_API_URL}/health",
            timeout=5
        )
        mojaloop_healthy = response.status_code == 200
    except Exception as e:
        logger.error(f"Mojaloop health check failed: {e}")
        mojaloop_healthy = False

    return jsonify({
        'status': 'healthy' if mojaloop_healthy else 'degraded',
        'service': 'mojaloop-payment-provider',
        'mojaloop_api': 'connected' if mojaloop_healthy else 'disconnected',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if mojaloop_healthy else 503


@app.route('/escrow/create', methods=['POST'])
def create_escrow():
    """
    Create escrow and hold funds
    
    Request:
    {
        "escrow_id": "123",
        "amount": 10000,
        "currency": "KES",
        "buyer_id": "254712345678",
        "seller_id": "254787654321",
        "metadata": {}
    }
    """
    try:
        data = request.json
        escrow_id = data['escrow_id']
        amount = data['amount']
        currency = data['currency']
        buyer_id = data['buyer_id']
        seller_id = data['seller_id']
        metadata = data.get('metadata', {})

        # Validate currency
        if currency not in SUPPORTED_CURRENCIES:
            return jsonify({
                'success': False,
                'error': f'Currency {currency} not supported'
            }), 400

        # Convert amount to decimal (Mojaloop uses decimal amounts)
        amount_decimal = amount / 100.0

        # Step 1: Create quote request
        quote_id = f"quote_{escrow_id}_{uuid.uuid4().hex[:8]}"
        transaction_id = f"tx_{escrow_id}_{uuid.uuid4().hex[:8]}"

        quote_payload = {
            'quoteId': quote_id,
            'transactionId': transaction_id,
            'transactionRequestId': f"txreq_{escrow_id}",
            'payee': {
                'partyIdInfo': {
                    'partyIdType': 'MSISDN',
                    'partyIdentifier': str(seller_id),
                    'fspId': MOJALOOP_FSP_ID
                }
            },
            'payer': {
                'partyIdInfo': {
                    'partyIdType': 'MSISDN',
                    'partyIdentifier': str(buyer_id),
                    'fspId': MOJALOOP_FSP_ID
                }
            },
            'amountType': 'SEND',
            'amount': {
                'amount': str(amount_decimal),
                'currency': currency
            },
            'transactionType': {
                'scenario': 'TRANSFER',
                'initiator': 'PAYER',
                'initiatorType': 'CONSUMER'
            },
            'note': f'Escrow payment for transaction {escrow_id}'
        }

        logger.info(f"Creating quote for escrow {escrow_id}")
        quote_response = requests.post(
            f"{MOJALOOP_API_URL}/quotes",
            json=quote_payload,
            headers={
                'Authorization': f'Bearer {MOJALOOP_API_KEY}',
                'Content-Type': 'application/json',
                'FSPIOP-Source': MOJALOOP_FSP_ID,
                'FSPIOP-Destination': MOJALOOP_FSP_ID
            },
            timeout=30
        )

        if quote_response.status_code not in [200, 201, 202]:
            logger.error(f"Quote creation failed: {quote_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create quote',
                'details': quote_response.text
            }), 500

        quote_data = quote_response.json()
        
        # Generate ILP packet and condition
        ilp_packet = generate_ilp_packet(amount_decimal, currency)
        condition = generate_condition(ilp_packet)

        # Step 2: Create transfer (hold funds)
        transfer_id = f"transfer_{escrow_id}_{uuid.uuid4().hex[:8]}"

        transfer_payload = {
            'transferId': transfer_id,
            'payerFsp': MOJALOOP_FSP_ID,
            'payeeFsp': MOJALOOP_FSP_ID,
            'amount': {
                'amount': str(amount_decimal),
                'currency': currency
            },
            'ilpPacket': ilp_packet,
            'condition': condition,
            'expiration': quote_data.get('expiration', 
                datetime.utcnow().replace(microsecond=0).isoformat() + 'Z')
        }

        logger.info(f"Creating transfer for escrow {escrow_id}")
        transfer_response = requests.post(
            f"{MOJALOOP_API_URL}/transfers",
            json=transfer_payload,
            headers={
                'Authorization': f'Bearer {MOJALOOP_API_KEY}',
                'Content-Type': 'application/json',
                'FSPIOP-Source': MOJALOOP_FSP_ID,
                'FSPIOP-Destination': MOJALOOP_FSP_ID
            },
            timeout=30
        )

        if transfer_response.status_code not in [200, 201, 202]:
            logger.error(f"Transfer creation failed: {transfer_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create transfer',
                'details': transfer_response.text
            }), 500

        transfer_data = transfer_response.json()

        # Store escrow data
        escrow_store[escrow_id] = {
            'escrow_id': escrow_id,
            'provider_escrow_id': transfer_id,
            'quote_id': quote_id,
            'transaction_id': transaction_id,
            'transfer_id': transfer_id,
            'amount': amount,
            'currency': currency,
            'buyer_id': buyer_id,
            'seller_id': seller_id,
            'status': 'RESERVED',
            'condition': condition,
            'ilp_packet': ilp_packet,
            'metadata': metadata,
            'created_at': datetime.utcnow().isoformat(),
            'held_amount': amount,
            'released_amount': 0,
            'refunded_amount': 0
        }

        logger.info(f"Escrow {escrow_id} created successfully")

        return jsonify({
            'success': True,
            'provider_escrow_id': transfer_id,
            'status': 'RESERVED',
            'metadata': {
                'quote_id': quote_id,
                'transaction_id': transaction_id,
                'transfer_id': transfer_id,
                'condition': condition
            }
        }), 201

    except KeyError as e:
        logger.error(f"Missing required field: {e}")
        return jsonify({
            'success': False,
            'error': f'Missing required field: {e}'
        }), 400
    except Exception as e:
        logger.error(f"Error creating escrow: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/escrow/release', methods=['POST'])
def release_escrow():
    """
    Release escrow funds to seller
    
    Request:
    {
        "provider_escrow_id": "transfer_123_abc",
        "amount": 10000  # optional, full amount if not specified
    }
    """
    try:
        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        release_amount = data.get('amount')

        # Find escrow by provider ID
        escrow_data = None
        for escrow in escrow_store.values():
            if escrow['provider_escrow_id'] == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        # Validate release amount
        if release_amount is None:
            release_amount = escrow_data['held_amount']
        
        if release_amount > escrow_data['held_amount']:
            return jsonify({
                'success': False,
                'error': 'Release amount exceeds held amount'
            }), 400

        # Generate fulfilment from condition
        fulfilment = generate_fulfilment(escrow_data['condition'])

        # Fulfill transfer (release funds)
        fulfil_payload = {
            'fulfilment': fulfilment,
            'transferState': 'COMMITTED',
            'completedTimestamp': datetime.utcnow().isoformat() + 'Z'
        }

        logger.info(f"Releasing escrow {provider_escrow_id}")
        fulfil_response = requests.put(
            f"{MOJALOOP_API_URL}/transfers/{provider_escrow_id}",
            json=fulfil_payload,
            headers={
                'Authorization': f'Bearer {MOJALOOP_API_KEY}',
                'Content-Type': 'application/json',
                'FSPIOP-Source': MOJALOOP_FSP_ID,
                'FSPIOP-Destination': MOJALOOP_FSP_ID
            },
            timeout=30
        )

        if fulfil_response.status_code not in [200, 201]:
            logger.error(f"Transfer fulfilment failed: {fulfil_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to release funds',
                'details': fulfil_response.text
            }), 500

        # Update escrow state
        escrow_data['status'] = 'COMMITTED'
        escrow_data['held_amount'] -= release_amount
        escrow_data['released_amount'] += release_amount
        escrow_data['released_at'] = datetime.utcnow().isoformat()

        logger.info(f"Escrow {provider_escrow_id} released successfully")

        return jsonify({
            'success': True,
            'transaction_id': escrow_data['transfer_id'],
            'amount': release_amount
        }), 200

    except KeyError as e:
        logger.error(f"Missing required field: {e}")
        return jsonify({
            'success': False,
            'error': f'Missing required field: {e}'
        }), 400
    except Exception as e:
        logger.error(f"Error releasing escrow: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/escrow/refund', methods=['POST'])
def refund_escrow():
    """
    Refund escrow funds to buyer
    
    Request:
    {
        "provider_escrow_id": "transfer_123_abc",
        "amount": 10000  # optional, full amount if not specified
    }
    """
    try:
        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        refund_amount = data.get('amount')

        # Find escrow by provider ID
        escrow_data = None
        for escrow in escrow_store.values():
            if escrow['provider_escrow_id'] == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        # Validate refund amount
        if refund_amount is None:
            refund_amount = escrow_data['held_amount']
        
        if refund_amount > escrow_data['held_amount']:
            return jsonify({
                'success': False,
                'error': 'Refund amount exceeds held amount'
            }), 400

        # Abort transfer (refund)
        abort_payload = {
            'transferState': 'ABORTED',
            'errorInformation': {
                'errorCode': '3100',
                'errorDescription': 'Transaction cancelled by buyer'
            }
        }

        logger.info(f"Refunding escrow {provider_escrow_id}")
        abort_response = requests.put(
            f"{MOJALOOP_API_URL}/transfers/{provider_escrow_id}",
            json=abort_payload,
            headers={
                'Authorization': f'Bearer {MOJALOOP_API_KEY}',
                'Content-Type': 'application/json',
                'FSPIOP-Source': MOJALOOP_FSP_ID,
                'FSPIOP-Destination': MOJALOOP_FSP_ID
            },
            timeout=30
        )

        if abort_response.status_code not in [200, 201]:
            logger.error(f"Transfer abort failed: {abort_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to refund',
                'details': abort_response.text
            }), 500

        # Update escrow state
        escrow_data['status'] = 'ABORTED'
        escrow_data['held_amount'] -= refund_amount
        escrow_data['refunded_amount'] += refund_amount
        escrow_data['refunded_at'] = datetime.utcnow().isoformat()

        logger.info(f"Escrow {provider_escrow_id} refunded successfully")

        return jsonify({
            'success': True,
            'transaction_id': escrow_data['transfer_id'],
            'amount': refund_amount
        }), 200

    except KeyError as e:
        logger.error(f"Missing required field: {e}")
        return jsonify({
            'success': False,
            'error': f'Missing required field: {e}'
        }), 400
    except Exception as e:
        logger.error(f"Error refunding escrow: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/escrow/status/<provider_escrow_id>', methods=['GET'])
def get_escrow_status(provider_escrow_id: str):
    """Get escrow status"""
    try:
        # Find escrow by provider ID
        escrow_data = None
        for escrow in escrow_store.values():
            if escrow['provider_escrow_id'] == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            # Try to fetch from Mojaloop
            try:
                response = requests.get(
                    f"{MOJALOOP_API_URL}/transfers/{provider_escrow_id}",
                    headers={
                        'Authorization': f'Bearer {MOJALOOP_API_KEY}',
                        'FSPIOP-Source': MOJALOOP_FSP_ID
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    transfer_data = response.json()
                    return jsonify({
                        'escrow_id': provider_escrow_id,
                        'status': transfer_data.get('transferState', 'UNKNOWN'),
                        'held_amount': 0,
                        'released_amount': 0,
                        'refunded_amount': 0
                    }), 200
            except Exception as e:
                logger.error(f"Error fetching from Mojaloop: {e}")

            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        return jsonify({
            'escrow_id': provider_escrow_id,
            'status': escrow_data['status'],
            'held_amount': escrow_data['held_amount'],
            'released_amount': escrow_data['released_amount'],
            'refunded_amount': escrow_data['refunded_amount'],
            'currency': escrow_data['currency'],
            'created_at': escrow_data['created_at']
        }), 200

    except Exception as e:
        logger.error(f"Error getting escrow status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """Handle Mojaloop webhooks"""
    try:
        # Verify signature
        signature = request.headers.get('X-Mojaloop-Signature', '')
        payload = request.get_data(as_text=True)
        
        if not verify_webhook_signature(payload, signature):
            logger.warning("Invalid webhook signature")
            return jsonify({'error': 'Invalid signature'}), 401

        data = request.json
        event_type = data.get('eventType')
        transfer_id = data.get('transferId')

        logger.info(f"Received webhook: {event_type} for transfer {transfer_id}")

        # Update local state based on webhook
        for escrow in escrow_store.values():
            if escrow['transfer_id'] == transfer_id:
                if event_type == 'transfer.commit':
                    escrow['status'] = 'COMMITTED'
                elif event_type == 'transfer.abort':
                    escrow['status'] = 'ABORTED'
                elif event_type == 'transfer.timeout':
                    escrow['status'] = 'EXPIRED'
                break

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/info', methods=['GET'])
def get_provider_info():
    """Get provider information"""
    return jsonify({
        'name': 'mojaloop',
        'display_name': 'Mojaloop',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'capabilities': ['escrow', 'mobile_money', 'cross_border', 'instant_transfer'],
        'regions': ['Africa', 'Asia'],
        'payment_methods': ['mobile_money', 'bank_transfer'],
        'settlement_time': 'instant',
        'fees': {
            'escrow_creation': '0%',
            'release': '0%',
            'refund': '0%',
            'note': 'FSP fees may apply'
        }
    }), 200


if __name__ == '__main__':
    logger.info("Starting Mojaloop Payment Provider Service on port 5010")
    app.run(host='0.0.0.0', port=5010, debug=False)
