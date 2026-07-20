"""
Flutterwave Payment Provider Service

African payment gateway supporting cards, mobile money, bank transfers, and USSD.
Comprehensive payment solution for African markets.

Port: 5012
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import hashlib
import hmac
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

# Configure logging
from shared.logger import get_logger
logger = get_logger("flutterwave-service")

app = Flask(__name__)
CORS(app)

# Configuration
FLUTTERWAVE_SECRET_KEY = os.getenv('FLUTTERWAVE_SECRET_KEY', '')
FLUTTERWAVE_PUBLIC_KEY = os.getenv('FLUTTERWAVE_PUBLIC_KEY', '')
FLUTTERWAVE_ENCRYPTION_KEY = os.getenv('FLUTTERWAVE_ENCRYPTION_KEY', '')
FLUTTERWAVE_API_URL = os.getenv('FLUTTERWAVE_API_URL', 'https://api.flutterwave.com/v3')
FLUTTERWAVE_WEBHOOK_SECRET = os.getenv('FLUTTERWAVE_WEBHOOK_SECRET', 'change_me_in_production')

# Supported currencies
SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GHS', 'KES', 'UGX', 'ZAR', 'XAF', 'XOF', 'RWF', 'TZS']

# In-memory storage (replace with Redis in production)
escrow_store: Dict[str, Dict[str, Any]] = {}


def get_headers() -> Dict[str, str]:
    """Get API request headers"""
    return {
        'Authorization': f'Bearer {FLUTTERWAVE_SECRET_KEY}',
        'Content-Type': 'application/json'
    }


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify webhook signature"""
    expected = hmac.new(
        FLUTTERWAVE_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Flutterwave API connectivity
        response = requests.get(
            f"{FLUTTERWAVE_API_URL}/balances",
            headers=get_headers(),
            timeout=5
        )
        flutterwave_healthy = response.status_code == 200
    except Exception as e:
        logger.error(f"Flutterwave health check failed: {e}")
        flutterwave_healthy = False

    return jsonify({
        'status': 'healthy' if flutterwave_healthy else 'degraded',
        'service': 'flutterwave-payment-provider',
        'flutterwave_api': 'connected' if flutterwave_healthy else 'disconnected',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if flutterwave_healthy else 503


@app.route('/escrow/create', methods=['POST'])
def create_escrow():
    """
    Create escrow and hold funds
    
    Request:
    {
        "escrow_id": "123",
        "amount": 10000,
        "currency": "NGN",
        "buyer_id": "buyer_456",
        "seller_id": "seller_789",
        "buyer_email": "buyer@example.com",
        "buyer_name": "John Doe",
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
        buyer_email = data.get('buyer_email', f'buyer_{buyer_id}@example.com')
        buyer_name = data.get('buyer_name', f'Buyer {buyer_id}')
        metadata = data.get('metadata', {})

        # Validate currency
        if currency not in SUPPORTED_CURRENCIES:
            return jsonify({
                'success': False,
                'error': f'Currency {currency} not supported'
            }), 400

        # Convert amount to decimal (Flutterwave uses decimal amounts)
        amount_decimal = amount / 100.0

        # Create payment transaction reference
        tx_ref = f"escrow_{escrow_id}_{uuid.uuid4().hex[:8]}"

        # Create charge/payment
        charge_payload = {
            'tx_ref': tx_ref,
            'amount': amount_decimal,
            'currency': currency,
            'redirect_url': f'https://example.com/payment/callback?escrow_id={escrow_id}',
            'payment_options': 'card,mobilemoney,ussd,banktransfer',
            'customer': {
                'email': buyer_email,
                'name': buyer_name,
                'phonenumber': data.get('buyer_phone', '')
            },
            'customizations': {
                'title': 'Escrow Payment',
                'description': f'Escrow payment for transaction {escrow_id}',
                'logo': 'https://example.com/logo.png'
            },
            'meta': {
                'escrow_id': escrow_id,
                'buyer_id': buyer_id,
                'seller_id': seller_id,
                **metadata
            }
        }

        logger.info(f"Creating Flutterwave charge for escrow {escrow_id}")
        response = requests.post(
            f"{FLUTTERWAVE_API_URL}/payments",
            json=charge_payload,
            headers=get_headers(),
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Charge creation failed: {response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create payment',
                'details': response.json()
            }), 500

        response_data = response.json()
        
        if response_data['status'] != 'success':
            return jsonify({
                'success': False,
                'error': response_data.get('message', 'Payment creation failed')
            }), 500

        payment_data = response_data['data']

        # Store escrow data
        escrow_store[escrow_id] = {
            'escrow_id': escrow_id,
            'provider_escrow_id': str(payment_data['id']),
            'tx_ref': tx_ref,
            'payment_link': payment_data.get('link'),
            'amount': amount,
            'currency': currency,
            'buyer_id': buyer_id,
            'seller_id': seller_id,
            'buyer_email': buyer_email,
            'status': 'pending',
            'metadata': metadata,
            'created_at': datetime.utcnow().isoformat(),
            'held_amount': 0,  # Will be updated after payment confirmation
            'released_amount': 0,
            'refunded_amount': 0
        }

        logger.info(f"Escrow {escrow_id} created successfully")

        return jsonify({
            'success': True,
            'provider_escrow_id': str(payment_data['id']),
            'status': 'pending',
            'payment_link': payment_data.get('link'),
            'metadata': {
                'tx_ref': tx_ref,
                'payment_id': payment_data['id']
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
        "provider_escrow_id": "123456",
        "amount": 10000,  # optional, full amount if not specified
        "seller_bank_code": "044",
        "seller_account_number": "0690000031",
        "seller_account_name": "John Seller"
    }
    """
    try:
        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        release_amount = data.get('amount')
        seller_bank_code = data.get('seller_bank_code')
        seller_account_number = data.get('seller_account_number')

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

        # Convert amount to decimal
        amount_decimal = release_amount / 100.0

        # Create transfer to seller
        transfer_ref = f"release_{escrow_data['escrow_id']}_{uuid.uuid4().hex[:8]}"

        transfer_payload = {
            'account_bank': seller_bank_code,
            'account_number': seller_account_number,
            'amount': amount_decimal,
            'currency': escrow_data['currency'],
            'narration': f"Escrow release for {escrow_data['escrow_id']}",
            'reference': transfer_ref,
            'callback_url': 'https://example.com/transfer/callback',
            'debit_currency': escrow_data['currency']
        }

        logger.info(f"Creating transfer for escrow release {provider_escrow_id}")
        response = requests.post(
            f"{FLUTTERWAVE_API_URL}/transfers",
            json=transfer_payload,
            headers=get_headers(),
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Transfer creation failed: {response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create transfer',
                'details': response.json()
            }), 500

        response_data = response.json()
        
        if response_data['status'] != 'success':
            return jsonify({
                'success': False,
                'error': response_data.get('message', 'Transfer failed')
            }), 500

        transfer_data = response_data['data']

        # Update escrow state
        escrow_data['held_amount'] -= release_amount
        escrow_data['released_amount'] += release_amount
        escrow_data['release_transfer_id'] = transfer_data['id']
        escrow_data['release_reference'] = transfer_ref
        escrow_data['released_at'] = datetime.utcnow().isoformat()
        
        if escrow_data['held_amount'] == 0:
            escrow_data['status'] = 'released'

        logger.info(f"Escrow {provider_escrow_id} released successfully")

        return jsonify({
            'success': True,
            'transaction_id': str(transfer_data['id']),
            'amount': release_amount,
            'transfer_status': transfer_data.get('status')
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
        "provider_escrow_id": "123456",
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

        # Convert amount to decimal
        amount_decimal = refund_amount / 100.0

        # Create refund
        refund_payload = {
            'id': provider_escrow_id,
            'amount': amount_decimal
        }

        logger.info(f"Creating refund for escrow {provider_escrow_id}")
        response = requests.post(
            f"{FLUTTERWAVE_API_URL}/transactions/{provider_escrow_id}/refund",
            json=refund_payload,
            headers=get_headers(),
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Refund creation failed: {response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create refund',
                'details': response.json()
            }), 500

        response_data = response.json()
        
        if response_data['status'] != 'success':
            return jsonify({
                'success': False,
                'error': response_data.get('message', 'Refund failed')
            }), 500

        refund_data = response_data['data']

        # Update escrow state
        escrow_data['held_amount'] -= refund_amount
        escrow_data['refunded_amount'] += refund_amount
        escrow_data['refund_id'] = refund_data['id']
        escrow_data['refunded_at'] = datetime.utcnow().isoformat()
        
        if escrow_data['held_amount'] == 0:
            escrow_data['status'] = 'refunded'

        logger.info(f"Escrow {provider_escrow_id} refunded successfully")

        return jsonify({
            'success': True,
            'transaction_id': str(refund_data['id']),
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
            # Try to fetch from Flutterwave
            try:
                response = requests.get(
                    f"{FLUTTERWAVE_API_URL}/transactions/{provider_escrow_id}/verify",
                    headers=get_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data['status'] == 'success':
                        tx_data = response_data['data']
                        amount = int(float(tx_data['amount']) * 100)
                        
                        return jsonify({
                            'escrow_id': provider_escrow_id,
                            'status': tx_data['status'],
                            'held_amount': amount if tx_data['status'] == 'successful' else 0,
                            'released_amount': 0,
                            'refunded_amount': 0
                        }), 200
            except Exception as e:
                logger.error(f"Error fetching from Flutterwave: {e}")

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
    """Handle Flutterwave webhooks"""
    try:
        # Verify signature
        signature = request.headers.get('verif-hash', '')
        
        if signature != FLUTTERWAVE_WEBHOOK_SECRET:
            logger.warning("Invalid webhook signature")
            return jsonify({'error': 'Invalid signature'}), 401

        data = request.json
        event_type = data.get('event')
        tx_ref = data.get('txRef')

        logger.info(f"Received webhook: {event_type} for tx {tx_ref}")

        # Find escrow by tx_ref
        for escrow in escrow_store.values():
            if escrow.get('tx_ref') == tx_ref:
                if event_type == 'charge.completed':
                    # Payment successful, update held amount
                    escrow['status'] = 'held'
                    escrow['held_amount'] = escrow['amount']
                    logger.info(f"Payment completed for escrow {escrow['escrow_id']}")
                elif event_type == 'transfer.completed':
                    logger.info(f"Transfer completed for escrow {escrow['escrow_id']}")
                break

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/info', methods=['GET'])
def get_provider_info():
    """Get provider information"""
    return jsonify({
        'name': 'flutterwave',
        'display_name': 'Flutterwave',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'capabilities': ['escrow', 'cards', 'mobile_money', 'bank_transfer', 'ussd'],
        'regions': ['Africa', 'Global'],
        'payment_methods': ['card', 'mobile_money', 'bank_transfer', 'ussd', 'mpesa', 'ghana_mobile_money', 'uganda_mobile_money'],
        'settlement_time': '24-48 hours',
        'fees': {
            'local_cards': '1.4%',
            'international_cards': '3.8%',
            'mobile_money': '1.4%',
            'bank_transfer': 'NGN 50',
            'note': 'Fees vary by payment method and country'
        }
    }), 200


@app.route('/verify-payment/<tx_ref>', methods=['GET'])
def verify_payment(tx_ref: str):
    """Verify payment status (for frontend callback)"""
    try:
        response = requests.get(
            f"{FLUTTERWAVE_API_URL}/transactions/verify_by_reference?tx_ref={tx_ref}",
            headers=get_headers(),
            timeout=10
        )

        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Verification failed'
            }), 500

        response_data = response.json()
        
        if response_data['status'] != 'success':
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        tx_data = response_data['data']

        return jsonify({
            'success': True,
            'status': tx_data['status'],
            'amount': tx_data['amount'],
            'currency': tx_data['currency'],
            'tx_ref': tx_data['tx_ref'],
            'transaction_id': tx_data['id']
        }), 200

    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    logger.info("Starting Flutterwave Payment Provider Service on port 5012")
    app.run(host='0.0.0.0', port=5012, debug=False)
