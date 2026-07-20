"""
Paystack Payment Provider Service

Nigerian payment gateway with excellent local support for cards, bank transfers, USSD, and mobile money.
Optimized for Nigerian market with fast settlement times.

Port: 5013
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
logger = get_logger("paystack-service")

app = Flask(__name__)
CORS(app)

# Configuration
PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY', '')
PAYSTACK_PUBLIC_KEY = os.getenv('PAYSTACK_PUBLIC_KEY', '')
PAYSTACK_API_URL = os.getenv('PAYSTACK_API_URL', 'https://api.paystack.co')
PAYSTACK_WEBHOOK_SECRET = os.getenv('PAYSTACK_WEBHOOK_SECRET', 'change_me_in_production')

# Supported currencies (Paystack primarily focuses on Nigerian market)
SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GHS', 'ZAR', 'KES']

# In-memory storage (replace with Redis in production)
escrow_store: Dict[str, Dict[str, Any]] = {}


def get_headers() -> Dict[str, str]:
    """Get API request headers"""
    return {
        'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json'
    }


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify webhook signature"""
    expected = hmac.new(
        PAYSTACK_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Paystack API connectivity
        response = requests.get(
            f"{PAYSTACK_API_URL}/bank",
            headers=get_headers(),
            timeout=5
        )
        paystack_healthy = response.status_code == 200
    except Exception as e:
        logger.error(f"Paystack health check failed: {e}")
        paystack_healthy = False

    return jsonify({
        'status': 'healthy' if paystack_healthy else 'degraded',
        'service': 'paystack-payment-provider',
        'paystack_api': 'connected' if paystack_healthy else 'disconnected',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if paystack_healthy else 503


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
        metadata = data.get('metadata', {})

        # Validate currency
        if currency not in SUPPORTED_CURRENCIES:
            return jsonify({
                'success': False,
                'error': f'Currency {currency} not supported'
            }), 400

        # Paystack uses kobo for NGN, cents for others (amount in smallest unit)
        # Our amount is already in smallest unit (kobo/cents)

        # Create transaction reference
        reference = f"escrow_{escrow_id}_{uuid.uuid4().hex[:8]}"

        # Initialize transaction
        init_payload = {
            'email': buyer_email,
            'amount': amount,  # Already in kobo/cents
            'currency': currency,
            'reference': reference,
            'callback_url': f'https://example.com/payment/callback?escrow_id={escrow_id}',
            'metadata': {
                'escrow_id': escrow_id,
                'buyer_id': buyer_id,
                'seller_id': seller_id,
                'custom_fields': [
                    {
                        'display_name': 'Escrow ID',
                        'variable_name': 'escrow_id',
                        'value': escrow_id
                    }
                ],
                **metadata
            }
        }

        logger.info(f"Initializing Paystack transaction for escrow {escrow_id}")
        response = requests.post(
            f"{PAYSTACK_API_URL}/transaction/initialize",
            json=init_payload,
            headers=get_headers(),
            timeout=30
        )

        if response.status_code not in [200, 201]:
            logger.error(f"Transaction initialization failed: {response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to initialize transaction',
                'details': response.json()
            }), 500

        response_data = response.json()
        
        if not response_data.get('status'):
            return jsonify({
                'success': False,
                'error': response_data.get('message', 'Transaction initialization failed')
            }), 500

        transaction_data = response_data['data']

        # Store escrow data
        escrow_store[escrow_id] = {
            'escrow_id': escrow_id,
            'provider_escrow_id': reference,
            'access_code': transaction_data['access_code'],
            'authorization_url': transaction_data['authorization_url'],
            'reference': reference,
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
            'provider_escrow_id': reference,
            'status': 'pending',
            'authorization_url': transaction_data['authorization_url'],
            'access_code': transaction_data['access_code'],
            'metadata': {
                'reference': reference
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
        "provider_escrow_id": "escrow_123_abc",
        "amount": 10000,  # optional, full amount if not specified
        "seller_bank_code": "058",
        "seller_account_number": "0123456789",
        "seller_account_name": "John Seller"
    }
    """
    try:
        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        release_amount = data.get('amount')
        seller_bank_code = data.get('seller_bank_code')
        seller_account_number = data.get('seller_account_number')
        seller_account_name = data.get('seller_account_name', 'Seller')

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

        # Create transfer recipient first (if not exists)
        recipient_code = escrow_data.get('recipient_code')
        
        if not recipient_code:
            recipient_payload = {
                'type': 'nuban',
                'name': seller_account_name,
                'account_number': seller_account_number,
                'bank_code': seller_bank_code,
                'currency': escrow_data['currency']
            }

            logger.info(f"Creating transfer recipient for escrow {provider_escrow_id}")
            recipient_response = requests.post(
                f"{PAYSTACK_API_URL}/transferrecipient",
                json=recipient_payload,
                headers=get_headers(),
                timeout=30
            )

            if recipient_response.status_code not in [200, 201]:
                logger.error(f"Recipient creation failed: {recipient_response.text}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to create transfer recipient',
                    'details': recipient_response.json()
                }), 500

            recipient_data = recipient_response.json()
            if not recipient_data.get('status'):
                return jsonify({
                    'success': False,
                    'error': recipient_data.get('message', 'Recipient creation failed')
                }), 500

            recipient_code = recipient_data['data']['recipient_code']
            escrow_data['recipient_code'] = recipient_code

        # Initiate transfer
        transfer_reference = f"release_{escrow_data['escrow_id']}_{uuid.uuid4().hex[:8]}"

        transfer_payload = {
            'source': 'balance',
            'amount': release_amount,  # Already in kobo/cents
            'recipient': recipient_code,
            'reason': f"Escrow release for {escrow_data['escrow_id']}",
            'currency': escrow_data['currency'],
            'reference': transfer_reference
        }

        logger.info(f"Initiating transfer for escrow release {provider_escrow_id}")
        transfer_response = requests.post(
            f"{PAYSTACK_API_URL}/transfer",
            json=transfer_payload,
            headers=get_headers(),
            timeout=30
        )

        if transfer_response.status_code not in [200, 201]:
            logger.error(f"Transfer initiation failed: {transfer_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to initiate transfer',
                'details': transfer_response.json()
            }), 500

        transfer_data = transfer_response.json()
        
        if not transfer_data.get('status'):
            return jsonify({
                'success': False,
                'error': transfer_data.get('message', 'Transfer failed')
            }), 500

        # Update escrow state
        escrow_data['held_amount'] -= release_amount
        escrow_data['released_amount'] += release_amount
        escrow_data['release_transfer_code'] = transfer_data['data']['transfer_code']
        escrow_data['release_reference'] = transfer_reference
        escrow_data['released_at'] = datetime.utcnow().isoformat()
        
        if escrow_data['held_amount'] == 0:
            escrow_data['status'] = 'released'

        logger.info(f"Escrow {provider_escrow_id} released successfully")

        return jsonify({
            'success': True,
            'transaction_id': transfer_data['data']['transfer_code'],
            'amount': release_amount,
            'transfer_status': transfer_data['data']['status']
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
        "provider_escrow_id": "escrow_123_abc",
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

        # Get transaction ID for refund
        # First verify the transaction to get the ID
        verify_response = requests.get(
            f"{PAYSTACK_API_URL}/transaction/verify/{escrow_data['reference']}",
            headers=get_headers(),
            timeout=10
        )

        if verify_response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Failed to verify transaction for refund'
            }), 500

        verify_data = verify_response.json()
        if not verify_data.get('status'):
            return jsonify({
                'success': False,
                'error': 'Transaction not found'
            }), 404

        transaction_id = verify_data['data']['id']

        # Create refund
        refund_payload = {
            'transaction': transaction_id,
            'amount': refund_amount,  # Already in kobo/cents
            'currency': escrow_data['currency'],
            'customer_note': f"Refund for escrow {escrow_data['escrow_id']}",
            'merchant_note': f"Escrow refund - {escrow_data['escrow_id']}"
        }

        logger.info(f"Creating refund for escrow {provider_escrow_id}")
        refund_response = requests.post(
            f"{PAYSTACK_API_URL}/refund",
            json=refund_payload,
            headers=get_headers(),
            timeout=30
        )

        if refund_response.status_code not in [200, 201]:
            logger.error(f"Refund creation failed: {refund_response.text}")
            return jsonify({
                'success': False,
                'error': 'Failed to create refund',
                'details': refund_response.json()
            }), 500

        refund_data = refund_response.json()
        
        if not refund_data.get('status'):
            return jsonify({
                'success': False,
                'error': refund_data.get('message', 'Refund failed')
            }), 500

        # Update escrow state
        escrow_data['held_amount'] -= refund_amount
        escrow_data['refunded_amount'] += refund_amount
        escrow_data['refund_id'] = refund_data['data']['id']
        escrow_data['refunded_at'] = datetime.utcnow().isoformat()
        
        if escrow_data['held_amount'] == 0:
            escrow_data['status'] = 'refunded'

        logger.info(f"Escrow {provider_escrow_id} refunded successfully")

        return jsonify({
            'success': True,
            'transaction_id': str(refund_data['data']['id']),
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
            # Try to fetch from Paystack
            try:
                response = requests.get(
                    f"{PAYSTACK_API_URL}/transaction/verify/{provider_escrow_id}",
                    headers=get_headers(),
                    timeout=10
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('status'):
                        tx_data = response_data['data']
                        amount = tx_data['amount']  # Already in kobo/cents
                        
                        return jsonify({
                            'escrow_id': provider_escrow_id,
                            'status': tx_data['status'],
                            'held_amount': amount if tx_data['status'] == 'success' else 0,
                            'released_amount': 0,
                            'refunded_amount': 0
                        }), 200
            except Exception as e:
                logger.error(f"Error fetching from Paystack: {e}")

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
    """Handle Paystack webhooks"""
    try:
        # Verify signature
        signature = request.headers.get('x-paystack-signature', '')
        payload = request.get_data(as_text=True)
        
        if not verify_webhook_signature(payload, signature):
            logger.warning("Invalid webhook signature")
            return jsonify({'error': 'Invalid signature'}), 401

        data = request.json
        event_type = data.get('event')

        logger.info(f"Received webhook: {event_type}")

        if event_type == 'charge.success':
            # Payment successful
            charge_data = data['data']
            reference = charge_data['reference']
            
            # Find escrow by reference
            for escrow in escrow_store.values():
                if escrow.get('reference') == reference:
                    escrow['status'] = 'held'
                    escrow['held_amount'] = escrow['amount']
                    logger.info(f"Payment successful for escrow {escrow['escrow_id']}")
                    break

        elif event_type == 'transfer.success':
            # Transfer successful
            transfer_data = data['data']
            reference = transfer_data['reference']
            
            # Find escrow by release reference
            for escrow in escrow_store.values():
                if escrow.get('release_reference') == reference:
                    logger.info(f"Transfer successful for escrow {escrow['escrow_id']}")
                    break

        elif event_type == 'transfer.failed':
            # Transfer failed
            transfer_data = data['data']
            reference = transfer_data['reference']
            
            logger.error(f"Transfer failed for reference {reference}")

        return jsonify({'success': True}), 200

    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/info', methods=['GET'])
def get_provider_info():
    """Get provider information"""
    return jsonify({
        'name': 'paystack',
        'display_name': 'Paystack',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'capabilities': ['escrow', 'cards', 'bank_transfer', 'ussd', 'mobile_money', 'qr'],
        'regions': ['Nigeria', 'Ghana', 'South Africa', 'Kenya'],
        'payment_methods': ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code'],
        'settlement_time': 'T+1 (next business day)',
        'fees': {
            'local_cards': '1.5% + NGN 100',
            'international_cards': '3.9% + NGN 100',
            'bank_transfer': 'NGN 50',
            'note': 'Capped at NGN 2,000 per transaction'
        },
        'features': [
            'Instant settlement available',
            'Recurring payments',
            'Split payments',
            'Subscriptions',
            'Invoices'
        ]
    }), 200


@app.route('/verify-transaction/<reference>', methods=['GET'])
def verify_transaction(reference: str):
    """Verify transaction status (for frontend callback)"""
    try:
        response = requests.get(
            f"{PAYSTACK_API_URL}/transaction/verify/{reference}",
            headers=get_headers(),
            timeout=10
        )

        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Verification failed'
            }), 500

        response_data = response.json()
        
        if not response_data.get('status'):
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
            'reference': tx_data['reference'],
            'transaction_id': tx_data['id'],
            'paid_at': tx_data.get('paid_at')
        }), 200

    except Exception as e:
        logger.error(f"Error verifying transaction: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/banks', methods=['GET'])
def list_banks():
    """List supported banks (for bank transfer setup)"""
    try:
        country = request.args.get('country', 'nigeria')
        
        response = requests.get(
            f"{PAYSTACK_API_URL}/bank?country={country}",
            headers=get_headers(),
            timeout=10
        )

        if response.status_code != 200:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch banks'
            }), 500

        response_data = response.json()
        
        if not response_data.get('status'):
            return jsonify({
                'success': False,
                'error': 'Failed to fetch banks'
            }), 500

        return jsonify({
            'success': True,
            'banks': response_data['data']
        }), 200

    except Exception as e:
        logger.error(f"Error listing banks: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    logger.info("Starting Paystack Payment Provider Service on port 5013")
    app.run(host='0.0.0.0', port=5013, debug=False)
