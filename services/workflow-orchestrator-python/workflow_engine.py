from flask import Flask, request, jsonify
import asyncio
import aiohttp
from typing import List, Dict, Any
from enum import Enum
import uuid
from datetime import datetime

app = Flask(__name__)

class StepStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class WorkflowStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"

class WorkflowStep:
    def __init__(self, name: str, service_url: str, method: str, payload: Dict = None):
        self.id = str(uuid.uuid4())
        self.name = name
        self.service_url = service_url
        self.method = method
        self.payload = payload or {}
        self.status = StepStatus.PENDING
        self.result = None
        self.error = None
        self.retry_count = 0
        self.max_retries = 3

class Workflow:
    def __init__(self, name: str, workflow_type: str):
        self.id = str(uuid.uuid4())
        self.name = name
        self.type = workflow_type
        self.steps: List[WorkflowStep] = []
        self.status = WorkflowStatus.PENDING
        self.created_at = datetime.utcnow().isoformat()
        self.completed_at = None
        self.current_step_index = 0

class WorkflowEngine:
    def __init__(self):
        self.workflows: Dict[str, Workflow] = {}
        self.service_ports = {
            'user-service': 5111,
            'property-service': 5112,
            'kyc-service': 5050,
            'transaction-service': 5110,
            'notification-service': 5104,
            'escrow-service': 5109,
            'compliance-service': 5100
        }

    def create_property_purchase_workflow(self, data: Dict) -> Workflow:
        workflow = Workflow("Property Purchase", "PROPERTY_PURCHASE")
        
        workflow.steps = [
            WorkflowStep(
                "Verify Buyer KYC",
                f"http://localhost:{self.service_ports['kyc-service']}/verify/buyer",
                "POST",
                {"userId": data.get('buyerId')}
            ),
            WorkflowStep(
                "Run Compliance Check",
                f"http://localhost:{self.service_ports['compliance-service']}/check/aml",
                "POST",
                {"userId": data.get('buyerId'), "amount": data.get('amount')}
            ),
            WorkflowStep(
                "Create Transaction",
                f"http://localhost:{self.service_ports['transaction-service']}/transactions",
                "POST",
                {
                    "userId": data.get('buyerId'),
                    "type": "PURCHASE",
                    "amount": data.get('amount'),
                    "propertyId": data.get('propertyId')
                }
            ),
            WorkflowStep(
                "Create Escrow",
                f"http://localhost:{self.service_ports['escrow-service']}/escrow/create",
                "POST",
                {
                    "buyerId": data.get('buyerId'),
                    "sellerId": data.get('sellerId'),
                    "amount": data.get('amount')
                }
            ),
            WorkflowStep(
                "Update Property Status",
                f"http://localhost:{self.service_ports['property-service']}/properties/{data.get('propertyId')}/status",
                "PATCH",
                {"status": "PENDING"}
            ),
            WorkflowStep(
                "Send Buyer Notification",
                f"http://localhost:{self.service_ports['notification-service']}/send/email",
                "POST",
                {
                    "to": data.get('buyerEmail'),
                    "subject": "Property Purchase Initiated",
                    "html": f"Your purchase for property {data.get('propertyId')} has been initiated."
                }
            ),
            WorkflowStep(
                "Send Seller Notification",
                f"http://localhost:{self.service_ports['notification-service']}/send/email",
                "POST",
                {
                    "to": data.get('sellerEmail'),
                    "subject": "Property Sale Initiated",
                    "html": f"A buyer has initiated purchase for your property {data.get('propertyId')}."
                }
            )
        ]
        
        self.workflows[workflow.id] = workflow
        return workflow

    def create_kyc_verification_workflow(self, data: Dict) -> Workflow:
        workflow = Workflow("KYC Verification", "KYC_VERIFICATION")
        
        workflow.steps = [
            WorkflowStep(
                "Verify Identity Documents",
                f"http://localhost:{self.service_ports['kyc-service']}/verify/documents",
                "POST",
                {"userId": data.get('userId'), "documents": data.get('documents')}
            ),
            WorkflowStep(
                "Perform Biometric Check",
                f"http://localhost:{self.service_ports['kyc-service']}/verify/biometric",
                "POST",
                {"userId": data.get('userId'), "selfie": data.get('selfie')}
            ),
            WorkflowStep(
                "Run Background Check",
                f"http://localhost:{self.service_ports['compliance-service']}/check/background",
                "POST",
                {"userId": data.get('userId')}
            ),
            WorkflowStep(
                "Update User KYC Status",
                f"http://localhost:{self.service_ports['user-service']}/users/{data.get('userId')}/kyc",
                "PATCH",
                {"status": "VERIFIED"}
            ),
            WorkflowStep(
                "Send Verification Notification",
                f"http://localhost:{self.service_ports['notification-service']}/send/email",
                "POST",
                {
                    "to": data.get('userEmail'),
                    "subject": "KYC Verification Complete",
                    "html": "Your identity verification is complete."
                }
            )
        ]
        
        self.workflows[workflow.id] = workflow
        return workflow

    async def execute_workflow(self, workflow_id: str) -> Workflow:
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")

        workflow.status = WorkflowStatus.RUNNING

        async with aiohttp.ClientSession() as session:
            for i, step in enumerate(workflow.steps):
                workflow.current_step_index = i
                step.status = StepStatus.RUNNING

                success = await self._execute_step(session, step)

                if not success:
                    workflow.status = WorkflowStatus.FAILED
                    return workflow

        workflow.status = WorkflowStatus.COMPLETED
        workflow.completed_at = datetime.utcnow().isoformat()
        return workflow

    async def _execute_step(self, session: aiohttp.ClientSession, step: WorkflowStep) -> bool:
        while step.retry_count < step.max_retries:
            try:
                async with session.request(
                    step.method,
                    step.service_url,
                    json=step.payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status < 400:
                        step.result = await response.json()
                        step.status = StepStatus.COMPLETED
                        return True
                    else:
                        step.error = await response.text()
                        step.retry_count += 1
            except Exception as e:
                step.error = str(e)
                step.retry_count += 1
                await asyncio.sleep(2 ** step.retry_count)

        step.status = StepStatus.FAILED
        return False

    def get_workflow(self, workflow_id: str) -> Workflow:
        return self.workflows.get(workflow_id)

    def list_workflows(self) -> List[Workflow]:
        return list(self.workflows.values())

engine = WorkflowEngine()

@app.route('/workflows/property-purchase', methods=['POST'])
def create_property_purchase():
    data = request.json
    workflow = engine.create_property_purchase_workflow(data)
    return jsonify({
        'id': workflow.id,
        'name': workflow.name,
        'type': workflow.type,
        'status': workflow.status.value,
        'steps': [{'id': s.id, 'name': s.name, 'status': s.status.value} for s in workflow.steps]
    }), 201

@app.route('/workflows/kyc-verification', methods=['POST'])
def create_kyc_verification():
    data = request.json
    workflow = engine.create_kyc_verification_workflow(data)
    return jsonify({
        'id': workflow.id,
        'name': workflow.name,
        'type': workflow.type,
        'status': workflow.status.value,
        'steps': [{'id': s.id, 'name': s.name, 'status': s.status.value} for s in workflow.steps]
    }), 201

@app.route('/workflows/<workflow_id>/execute', methods=['POST'])
def execute_workflow(workflow_id):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        workflow = loop.run_until_complete(engine.execute_workflow(workflow_id))
        return jsonify({
            'id': workflow.id,
            'name': workflow.name,
            'status': workflow.status.value,
            'steps': [{
                'id': s.id,
                'name': s.name,
                'status': s.status.value,
                'result': s.result,
                'error': s.error
            } for s in workflow.steps],
            'completed_at': workflow.completed_at
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        loop.close()

@app.route('/workflows/<workflow_id>', methods=['GET'])
def get_workflow(workflow_id):
    workflow = engine.get_workflow(workflow_id)
    if not workflow:
        return jsonify({'error': 'Workflow not found'}), 404
    
    return jsonify({
        'id': workflow.id,
        'name': workflow.name,
        'type': workflow.type,
        'status': workflow.status.value,
        'current_step': workflow.current_step_index,
        'steps': [{
            'id': s.id,
            'name': s.name,
            'status': s.status.value,
            'result': s.result,
            'error': s.error
        } for s in workflow.steps],
        'created_at': workflow.created_at,
        'completed_at': workflow.completed_at
    })

@app.route('/workflows', methods=['GET'])
def list_workflows():
    workflows = engine.list_workflows()
    return jsonify([{
        'id': w.id,
        'name': w.name,
        'type': w.type,
        'status': w.status.value,
        'created_at': w.created_at
    } for w in workflows])

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'workflow-orchestrator-python'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5116, debug=True)
