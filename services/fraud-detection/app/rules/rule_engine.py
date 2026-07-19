from typing import List, Dict, Any, Callable
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RuleSeverity(Enum):
    """Severity levels for fraud rules."""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class FraudRule:
    """Represents a fraud detection rule."""
    rule_id: str
    name: str
    description: str
    severity: RuleSeverity
    condition: Callable[[Dict[str, Any]], bool]
    score: float  # Risk score if rule triggers (0-100)
    enabled: bool = True


@dataclass
class RuleResult:
    """Result of rule evaluation."""
    rule_id: str
    rule_name: str
    triggered: bool
    severity: RuleSeverity
    score: float
    reason: str
    timestamp: datetime


class RuleEngine:
    """
    Rule-based fraud detection engine.
    Implements Drools-style rule evaluation for real estate transactions.
    """
    
    def __init__(self):
        self.rules: List[FraudRule] = []
        self._initialize_rules()
        logger.info(f"Rule engine initialized with {len(self.rules)} rules")
    
    def _initialize_rules(self):
        """Initialize fraud detection rules."""
        
        # Transaction Amount Rules
        self.rules.append(FraudRule(
            rule_id="R001",
            name="Unusually High Transaction Amount",
            description="Transaction amount significantly exceeds user's historical average",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_high_amount(data),
            score=75.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R002",
            name="Round Number Transaction",
            description="Transaction amount is a suspiciously round number",
            severity=RuleSeverity.LOW,
            condition=lambda data: self._check_round_number(data),
            score=15.0
        ))
        
        # Velocity Rules
        self.rules.append(FraudRule(
            rule_id="R003",
            name="High Transaction Velocity",
            description="Multiple transactions in short time period",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_transaction_velocity(data),
            score=90.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R004",
            name="Rapid Property Flipping",
            description="Property bought and sold within suspicious timeframe",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_rapid_flipping(data),
            score=80.0
        ))
        
        # Geographic Rules
        self.rules.append(FraudRule(
            rule_id="R005",
            name="Geographic Anomaly",
            description="Transaction from unusual geographic location",
            severity=RuleSeverity.MEDIUM,
            condition=lambda data: self._check_geographic_anomaly(data),
            score=50.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R006",
            name="High-Risk Location",
            description="Transaction involves property in high-risk area",
            severity=RuleSeverity.MEDIUM,
            condition=lambda data: self._check_high_risk_location(data),
            score=45.0
        ))
        
        # User Behavior Rules
        self.rules.append(FraudRule(
            rule_id="R007",
            name="New User Large Transaction",
            description="New user attempting large transaction",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_new_user_large_transaction(data),
            score=70.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R008",
            name="Unusual Time of Day",
            description="Transaction at unusual hour",
            severity=RuleSeverity.LOW,
            condition=lambda data: self._check_unusual_time(data),
            score=20.0
        ))
        
        # Document Rules
        self.rules.append(FraudRule(
            rule_id="R009",
            name="Missing Required Documents",
            description="Critical documents missing from transaction",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_missing_documents(data),
            score=95.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R010",
            name="Document Inconsistency",
            description="Inconsistencies detected in submitted documents",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_document_inconsistency(data),
            score=85.0
        ))
        
        # Payment Rules
        self.rules.append(FraudRule(
            rule_id="R011",
            name="Suspicious Payment Method",
            description="Payment method commonly associated with fraud",
            severity=RuleSeverity.MEDIUM,
            condition=lambda data: self._check_suspicious_payment_method(data),
            score=55.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R012",
            name="Multiple Payment Sources",
            description="Payment from multiple unrelated sources",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_multiple_payment_sources(data),
            score=75.0
        ))
        
        # Price Rules
        self.rules.append(FraudRule(
            rule_id="R013",
            name="Price Significantly Below Market",
            description="Property price significantly below market value",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_below_market_price(data),
            score=90.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R014",
            name="Price Significantly Above Market",
            description="Property price significantly above market value (money laundering)",
            severity=RuleSeverity.HIGH,
            condition=lambda data: self._check_above_market_price(data),
            score=80.0
        ))
        
        # Identity Rules
        self.rules.append(FraudRule(
            rule_id="R015",
            name="Identity Verification Failed",
            description="User identity verification failed or incomplete",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_identity_verification(data),
            score=100.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R016",
            name="Watchlist Match",
            description="User or entity appears on fraud watchlist",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_watchlist(data),
            score=100.0
        ))
        
        # Network Rules
        self.rules.append(FraudRule(
            rule_id="R017",
            name="Connected to Known Fraudster",
            description="User connected to known fraudulent accounts",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_fraudster_connection(data),
            score=95.0
        ))
        
        self.rules.append(FraudRule(
            rule_id="R018",
            name="Circular Transaction Pattern",
            description="Circular money flow detected",
            severity=RuleSeverity.CRITICAL,
            condition=lambda data: self._check_circular_pattern(data),
            score=95.0
        ))
    
    def evaluate(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate all rules against transaction data.
        
        Returns:
            Dictionary containing evaluation results and risk score
        """
        results = []
        total_score = 0.0
        triggered_rules = []
        
        for rule in self.rules:
            if not rule.enabled:
                continue
            
            try:
                triggered = rule.condition(transaction_data)
                
                result = RuleResult(
                    rule_id=rule.rule_id,
                    rule_name=rule.name,
                    triggered=triggered,
                    severity=rule.severity,
                    score=rule.score if triggered else 0.0,
                    reason=rule.description if triggered else "",
                    timestamp=datetime.now()
                )
                
                results.append(result)
                
                if triggered:
                    total_score += rule.score
                    triggered_rules.append({
                        'rule_id': rule.rule_id,
                        'name': rule.name,
                        'severity': rule.severity.name,
                        'score': rule.score,
                        'reason': rule.description
                    })
                    
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.rule_id}: {str(e)}")
        
        # Normalize score to 0-100
        risk_score = min(total_score, 100.0)
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = "CRITICAL"
        elif risk_score >= 60:
            risk_level = "HIGH"
        elif risk_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'triggered_rules': triggered_rules,
            'total_rules_evaluated': len(self.rules),
            'rules_triggered': len(triggered_rules),
            'recommendation': self._get_recommendation(risk_level),
            'timestamp': datetime.now().isoformat()
        }
    
    def _get_recommendation(self, risk_level: str) -> str:
        """Get recommendation based on risk level."""
        recommendations = {
            'CRITICAL': 'BLOCK - Manual review required before proceeding',
            'HIGH': 'REVIEW - Enhanced due diligence recommended',
            'MEDIUM': 'MONITOR - Additional verification may be needed',
            'LOW': 'APPROVE - Transaction appears legitimate'
        }
        return recommendations.get(risk_level, 'REVIEW')
    
    # Rule condition implementations
    
    def _check_high_amount(self, data: Dict) -> bool:
        """Check if transaction amount is unusually high."""
        amount = data.get('amount', 0)
        avg_amount = data.get('user_avg_transaction', 0)
        return amount > avg_amount * 3 if avg_amount > 0 else amount > 1000000
    
    def _check_round_number(self, data: Dict) -> bool:
        """Check if amount is suspiciously round."""
        amount = data.get('amount', 0)
        return amount > 0 and amount % 100000 == 0
    
    def _check_transaction_velocity(self, data: Dict) -> bool:
        """Check transaction velocity."""
        recent_transactions = data.get('recent_transaction_count', 0)
        return recent_transactions > 5  # More than 5 transactions in 24 hours
    
    def _check_rapid_flipping(self, data: Dict) -> bool:
        """Check for rapid property flipping."""
        days_since_purchase = data.get('days_since_purchase', 999)
        return days_since_purchase < 30  # Sold within 30 days of purchase
    
    def _check_geographic_anomaly(self, data: Dict) -> bool:
        """Check for geographic anomalies."""
        user_location = data.get('user_location', '')
        property_location = data.get('property_location', '')
        distance = data.get('location_distance_km', 0)
        return distance > 5000  # More than 5000km from user's typical location
    
    def _check_high_risk_location(self, data: Dict) -> bool:
        """Check if property is in high-risk area."""
        high_risk_areas = data.get('high_risk_areas', [])
        property_location = data.get('property_location', '')
        return property_location in high_risk_areas
    
    def _check_new_user_large_transaction(self, data: Dict) -> bool:
        """Check if new user is making large transaction."""
        account_age_days = data.get('account_age_days', 0)
        amount = data.get('amount', 0)
        return account_age_days < 30 and amount > 500000
    
    def _check_unusual_time(self, data: Dict) -> bool:
        """Check if transaction is at unusual time."""
        transaction_hour = data.get('transaction_hour', 12)
        return transaction_hour < 6 or transaction_hour > 23
    
    def _check_missing_documents(self, data: Dict) -> bool:
        """Check for missing required documents."""
        required_docs = ['title_deed', 'identity_proof', 'proof_of_funds']
        submitted_docs = data.get('submitted_documents', [])
        return not all(doc in submitted_docs for doc in required_docs)
    
    def _check_document_inconsistency(self, data: Dict) -> bool:
        """Check for document inconsistencies."""
        return data.get('document_verification_failed', False)
    
    def _check_suspicious_payment_method(self, data: Dict) -> bool:
        """Check for suspicious payment methods."""
        suspicious_methods = ['cryptocurrency', 'wire_transfer_offshore', 'cash']
        payment_method = data.get('payment_method', '')
        return payment_method in suspicious_methods
    
    def _check_multiple_payment_sources(self, data: Dict) -> bool:
        """Check for multiple payment sources."""
        payment_sources = data.get('payment_source_count', 1)
        return payment_sources > 3
    
    def _check_below_market_price(self, data: Dict) -> bool:
        """Check if price is significantly below market."""
        price = data.get('price', 0)
        market_value = data.get('market_value', 0)
        return market_value > 0 and price < market_value * 0.7  # 30% below market
    
    def _check_above_market_price(self, data: Dict) -> bool:
        """Check if price is significantly above market (money laundering indicator)."""
        price = data.get('price', 0)
        market_value = data.get('market_value', 0)
        return market_value > 0 and price > market_value * 1.5  # 50% above market
    
    def _check_identity_verification(self, data: Dict) -> bool:
        """Check identity verification status."""
        return not data.get('identity_verified', False)
    
    def _check_watchlist(self, data: Dict) -> bool:
        """Check if user is on watchlist."""
        return data.get('on_watchlist', False)
    
    def _check_fraudster_connection(self, data: Dict) -> bool:
        """Check for connections to known fraudsters."""
        return data.get('connected_to_fraudster', False)
    
    def _check_circular_pattern(self, data: Dict) -> bool:
        """Check for circular transaction patterns."""
        return data.get('circular_pattern_detected', False)
    
    def add_rule(self, rule: FraudRule):
        """Add a new rule to the engine."""
        self.rules.append(rule)
        logger.info(f"Added rule: {rule.name}")
    
    def remove_rule(self, rule_id: str):
        """Remove a rule from the engine."""
        self.rules = [r for r in self.rules if r.rule_id != rule_id]
        logger.info(f"Removed rule: {rule_id}")
    
    def enable_rule(self, rule_id: str):
        """Enable a rule."""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                rule.enabled = True
                logger.info(f"Enabled rule: {rule_id}")
                break
    
    def disable_rule(self, rule_id: str):
        """Disable a rule."""
        for rule in self.rules:
            if rule.rule_id == rule_id:
                rule.enabled = False
                logger.info(f"Disabled rule: {rule_id}")
                break
    
    def get_rules(self) -> List[Dict]:
        """Get all rules."""
        return [
            {
                'rule_id': rule.rule_id,
                'name': rule.name,
                'description': rule.description,
                'severity': rule.severity.name,
                'score': rule.score,
                'enabled': rule.enabled
            }
            for rule in self.rules
        ]
