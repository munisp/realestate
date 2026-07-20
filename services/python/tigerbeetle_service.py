"""
TigerBeetle Payment Provider Service

High-performance double-entry accounting for escrow with microsecond latency.
Uses TigerBeetle distributed ledger for financial transactions.

Port: 5011
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime
from typing import Dict, Any, Optional
import uuid
import struct

# Configure logging
from shared.logger import get_logger
logger = get_logger("tigerbeetle-service")

app = Flask(__name__)
CORS(app)

# Configuration
TIGERBEETLE_CLUSTER_ID = int(os.getenv('TIGERBEETLE_CLUSTER_ID', '0'))
TIGERBEETLE_ADDRESSES = os.getenv('TIGERBEETLE_ADDRESSES', '127.0.0.1:3000').split(',')

# Ledger IDs
ESCROW_LEDGER = 1
PROPERTY_LEDGER = 2

# Account codes
BUYER_ACCOUNT = 1
SELLER_ACCOUNT = 2
ESCROW_ACCOUNT = 3
PLATFORM_FEE_ACCOUNT = 4

# Transfer codes
ESCROW_HOLD = 1
ESCROW_RELEASE = 2
ESCROW_REFUND = 3
PLATFORM_FEE = 4

# Supported currencies (represented as different ledgers or account metadata)
SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR']

# In-memory storage for escrow metadata (TigerBeetle stores balances)
escrow_metadata: Dict[str, Dict[str, Any]] = {}

# TigerBeetle client (lazy initialization)
tb_client = None


def get_tigerbeetle_client():
    """Get or create TigerBeetle client"""
    global tb_client
    if tb_client is None:
        try:
            # Import TigerBeetle client
            from tigerbeetle import Client, Account, Transfer, CreateAccountError, CreateTransferError
            
            tb_client = Client(
                cluster_id=TIGERBEETLE_CLUSTER_ID,
                replica_addresses=TIGERBEETLE_ADDRESSES
            )
            logger.info(f"Connected to TigerBeetle cluster {TIGERBEETLE_CLUSTER_ID}")
        except ImportError:
            logger.error("TigerBeetle Python client not installed. Install with: pip install tigerbeetle-python")
            tb_client = None
        except Exception as e:
            logger.error(f"Failed to connect to TigerBeetle: {e}")
            tb_client = None
    
    return tb_client


def generate_account_id(prefix: str, identifier: str) -> int:
    """Generate deterministic account ID from string"""
    # Use first 8 bytes of hash as uint64
    import hashlib
    hash_bytes = hashlib.sha256(f"{prefix}:{identifier}".encode()).digest()[:8]
    return struct.unpack('>Q', hash_bytes)[0]


def generate_transfer_id() -> int:
    """Generate unique transfer ID"""
    # Use timestamp + random for uniqueness
    timestamp = int(datetime.utcnow().timestamp() * 1000000)  # microseconds
    random_part = uuid.uuid4().int & 0xFFFFFFFF  # 32 bits
    return (timestamp << 32) | random_part


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    client = get_tigerbeetle_client()
    
    if client is None:
        return jsonify({
            'status': 'unhealthy',
            'service': 'tigerbeetle-payment-provider',
            'tigerbeetle': 'disconnected',
            'error': 'TigerBeetle client not available',
            'timestamp': datetime.utcnow().isoformat()
        }), 503

    try:
        # Try to lookup a test account to verify connectivity
        from tigerbeetle import Account
        test_accounts = client.lookup_accounts([1])
        
        return jsonify({
            'status': 'healthy',
            'service': 'tigerbeetle-payment-provider',
            'tigerbeetle': 'connected',
            'cluster_id': TIGERBEETLE_CLUSTER_ID,
            'supported_currencies': SUPPORTED_CURRENCIES,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"TigerBeetle health check failed: {e}")
        return jsonify({
            'status': 'degraded',
            'service': 'tigerbeetle-payment-provider',
            'tigerbeetle': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@app.route('/escrow/create', methods=['POST'])
def create_escrow():
    """
    Create escrow and hold funds
    
    Request:
    {
        "escrow_id": "123",
        "amount": 10000,
        "currency": "USD",
        "buyer_id": "buyer_456",
        "seller_id": "seller_789",
        "metadata": {}
    }
    """
    try:
        client = get_tigerbeetle_client()
        if client is None:
            return jsonify({
                'success': False,
                'error': 'TigerBeetle service unavailable'
            }), 503

        from tigerbeetle import Account, Transfer, CreateAccountError, CreateTransferError

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

        # Generate account IDs
        escrow_account_id = generate_account_id('escrow', escrow_id)
        buyer_account_id = generate_account_id('buyer', str(buyer_id))
        seller_account_id = generate_account_id('seller', str(seller_id))

        # Create escrow account if it doesn't exist
        try:
            escrow_account = Account(
                id=escrow_account_id,
                ledger=ESCROW_LEDGER,
                code=ESCROW_ACCOUNT,
                flags=0,  # No special flags
                user_data_128=0,
                user_data_64=0,
                user_data_32=0
            )
            client.create_accounts([escrow_account])
            logger.info(f"Created escrow account {escrow_account_id}")
        except CreateAccountError as e:
            # Account might already exist, which is fine
            if 'exists' not in str(e).lower():
                logger.error(f"Error creating escrow account: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to create escrow account: {e}'
                }), 500

        # Ensure buyer and seller accounts exist
        try:
            buyer_account = Account(
                id=buyer_account_id,
                ledger=ESCROW_LEDGER,
                code=BUYER_ACCOUNT,
                flags=0
            )
            seller_account = Account(
                id=seller_account_id,
                ledger=ESCROW_LEDGER,
                code=SELLER_ACCOUNT,
                flags=0
            )
            client.create_accounts([buyer_account, seller_account])
        except CreateAccountError:
            # Accounts might already exist
            pass

        # Create transfer from buyer to escrow (hold funds)
        transfer_id = generate_transfer_id()
        
        transfer = Transfer(
            id=transfer_id,
            debit_account_id=buyer_account_id,
            credit_account_id=escrow_account_id,
            amount=amount,
            ledger=ESCROW_LEDGER,
            code=ESCROW_HOLD,
            flags=0,
            user_data_128=0,
            user_data_64=0,
            user_data_32=0,
            timeout=0,
            timestamp=0  # TigerBeetle will set this
        )

        try:
            client.create_transfers([transfer])
            logger.info(f"Created escrow transfer {transfer_id} for {amount}")
        except CreateTransferError as e:
            logger.error(f"Error creating transfer: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to hold funds: {e}'
            }), 500

        # Store escrow metadata
        escrow_metadata[escrow_id] = {
            'escrow_id': escrow_id,
            'escrow_account_id': escrow_account_id,
            'buyer_id': buyer_id,
            'buyer_account_id': buyer_account_id,
            'seller_id': seller_id,
            'seller_account_id': seller_account_id,
            'amount': amount,
            'currency': currency,
            'status': 'held',
            'hold_transfer_id': transfer_id,
            'metadata': metadata,
            'created_at': datetime.utcnow().isoformat(),
            'held_amount': amount,
            'released_amount': 0,
            'refunded_amount': 0
        }

        logger.info(f"Escrow {escrow_id} created successfully")

        return jsonify({
            'success': True,
            'provider_escrow_id': str(escrow_account_id),
            'status': 'held',
            'metadata': {
                'escrow_account_id': escrow_account_id,
                'transfer_id': transfer_id
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
        "provider_escrow_id": "123456789",
        "amount": 10000  # optional, full amount if not specified
    }
    """
    try:
        client = get_tigerbeetle_client()
        if client is None:
            return jsonify({
                'success': False,
                'error': 'TigerBeetle service unavailable'
            }), 503

        from tigerbeetle import Transfer, CreateTransferError

        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        release_amount = data.get('amount')

        # Find escrow metadata
        escrow_data = None
        for escrow in escrow_metadata.values():
            if str(escrow['escrow_account_id']) == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        # Get current escrow balance
        escrow_account_id = escrow_data['escrow_account_id']
        accounts = client.lookup_accounts([escrow_account_id])
        
        if not accounts:
            return jsonify({
                'success': False,
                'error': 'Escrow account not found'
            }), 404

        current_balance = accounts[0].credits_posted - accounts[0].debits_posted

        # Determine release amount
        if release_amount is None:
            release_amount = current_balance
        
        if release_amount > current_balance:
            return jsonify({
                'success': False,
                'error': f'Release amount ({release_amount}) exceeds held amount ({current_balance})'
            }), 400

        # Create transfer from escrow to seller
        transfer_id = generate_transfer_id()
        
        transfer = Transfer(
            id=transfer_id,
            debit_account_id=escrow_account_id,
            credit_account_id=escrow_data['seller_account_id'],
            amount=release_amount,
            ledger=ESCROW_LEDGER,
            code=ESCROW_RELEASE,
            flags=0,
            user_data_128=0,
            user_data_64=0,
            user_data_32=0,
            timeout=0,
            timestamp=0
        )

        try:
            client.create_transfers([transfer])
            logger.info(f"Released {release_amount} from escrow to seller")
        except CreateTransferError as e:
            logger.error(f"Error releasing funds: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to release funds: {e}'
            }), 500

        # Update metadata
        escrow_data['status'] = 'released'
        escrow_data['held_amount'] -= release_amount
        escrow_data['released_amount'] += release_amount
        escrow_data['release_transfer_id'] = transfer_id
        escrow_data['released_at'] = datetime.utcnow().isoformat()

        logger.info(f"Escrow {escrow_data['escrow_id']} released successfully")

        return jsonify({
            'success': True,
            'transaction_id': str(transfer_id),
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
        "provider_escrow_id": "123456789",
        "amount": 10000  # optional, full amount if not specified
    }
    """
    try:
        client = get_tigerbeetle_client()
        if client is None:
            return jsonify({
                'success': False,
                'error': 'TigerBeetle service unavailable'
            }), 503

        from tigerbeetle import Transfer, CreateTransferError

        data = request.json
        provider_escrow_id = data['provider_escrow_id']
        refund_amount = data.get('amount')

        # Find escrow metadata
        escrow_data = None
        for escrow in escrow_metadata.values():
            if str(escrow['escrow_account_id']) == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        # Get current escrow balance
        escrow_account_id = escrow_data['escrow_account_id']
        accounts = client.lookup_accounts([escrow_account_id])
        
        if not accounts:
            return jsonify({
                'success': False,
                'error': 'Escrow account not found'
            }), 404

        current_balance = accounts[0].credits_posted - accounts[0].debits_posted

        # Determine refund amount
        if refund_amount is None:
            refund_amount = current_balance
        
        if refund_amount > current_balance:
            return jsonify({
                'success': False,
                'error': f'Refund amount ({refund_amount}) exceeds held amount ({current_balance})'
            }), 400

        # Create transfer from escrow back to buyer
        transfer_id = generate_transfer_id()
        
        transfer = Transfer(
            id=transfer_id,
            debit_account_id=escrow_account_id,
            credit_account_id=escrow_data['buyer_account_id'],
            amount=refund_amount,
            ledger=ESCROW_LEDGER,
            code=ESCROW_REFUND,
            flags=0,
            user_data_128=0,
            user_data_64=0,
            user_data_32=0,
            timeout=0,
            timestamp=0
        )

        try:
            client.create_transfers([transfer])
            logger.info(f"Refunded {refund_amount} from escrow to buyer")
        except CreateTransferError as e:
            logger.error(f"Error refunding: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to refund: {e}'
            }), 500

        # Update metadata
        escrow_data['status'] = 'refunded'
        escrow_data['held_amount'] -= refund_amount
        escrow_data['refunded_amount'] += refund_amount
        escrow_data['refund_transfer_id'] = transfer_id
        escrow_data['refunded_at'] = datetime.utcnow().isoformat()

        logger.info(f"Escrow {escrow_data['escrow_id']} refunded successfully")

        return jsonify({
            'success': True,
            'transaction_id': str(transfer_id),
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
        client = get_tigerbeetle_client()
        if client is None:
            return jsonify({
                'success': False,
                'error': 'TigerBeetle service unavailable'
            }), 503

        # Find escrow metadata
        escrow_data = None
        for escrow in escrow_metadata.values():
            if str(escrow['escrow_account_id']) == provider_escrow_id:
                escrow_data = escrow
                break

        if not escrow_data:
            return jsonify({
                'success': False,
                'error': 'Escrow not found'
            }), 404

        # Get current balance from TigerBeetle
        escrow_account_id = int(provider_escrow_id)
        accounts = client.lookup_accounts([escrow_account_id])
        
        if accounts:
            current_balance = accounts[0].credits_posted - accounts[0].debits_posted
        else:
            current_balance = 0

        return jsonify({
            'escrow_id': provider_escrow_id,
            'status': escrow_data['status'],
            'held_amount': current_balance,
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
    """Handle webhooks (TigerBeetle doesn't use webhooks, but kept for API consistency)"""
    return jsonify({
        'success': True,
        'message': 'TigerBeetle does not use webhooks'
    }), 200


@app.route('/info', methods=['GET'])
def get_provider_info():
    """Get provider information"""
    return jsonify({
        'name': 'tigerbeetle',
        'display_name': 'TigerBeetle',
        'supported_currencies': SUPPORTED_CURRENCIES,
        'capabilities': ['escrow', 'instant_transfer', 'double_entry', 'high_performance'],
        'regions': ['Global'],
        'payment_methods': ['ledger_transfer'],
        'settlement_time': 'instant (microseconds)',
        'performance': {
            'latency': '< 1ms',
            'throughput': '1M+ TPS',
            'consistency': 'strict serializability'
        },
        'fees': {
            'escrow_creation': '0%',
            'release': '0%',
            'refund': '0%',
            'note': 'No transaction fees, infrastructure costs only'
        }
    }), 200


@app.route('/accounts/<account_id>', methods=['GET'])
def get_account_balance(account_id: str):
    """Get account balance (admin endpoint)"""
    try:
        client = get_tigerbeetle_client()
        if client is None:
            return jsonify({
                'success': False,
                'error': 'TigerBeetle service unavailable'
            }), 503

        account_id_int = int(account_id)
        accounts = client.lookup_accounts([account_id_int])
        
        if not accounts:
            return jsonify({
                'success': False,
                'error': 'Account not found'
            }), 404

        account = accounts[0]
        balance = account.credits_posted - account.debits_posted

        return jsonify({
            'account_id': account_id,
            'balance': balance,
            'credits_posted': account.credits_posted,
            'debits_posted': account.debits_posted,
            'credits_pending': account.credits_pending,
            'debits_pending': account.debits_pending,
            'ledger': account.ledger,
            'code': account.code
        }), 200

    except ValueError:
        return jsonify({
            'success': False,
            'error': 'Invalid account ID format'
        }), 400
    except Exception as e:
        logger.error(f"Error getting account balance: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    logger.info("Starting TigerBeetle Payment Provider Service on port 5011")
    logger.info(f"Cluster ID: {TIGERBEETLE_CLUSTER_ID}")
    logger.info(f"Addresses: {TIGERBEETLE_ADDRESSES}")
    app.run(host='0.0.0.0', port=5011, debug=False)
