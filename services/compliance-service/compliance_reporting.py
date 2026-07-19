"""
Compliance Reporting Service

Automated generation of regulatory reports for Nigerian authorities.

Reports:
- STR (Suspicious Transaction Report) for NFIU
- Quarterly compliance reports for SCUML
- Audit trail exports for regulatory inspections
- Transaction monitoring reports
"""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import csv
from io import StringIO
import pandas as pd

class ComplianceReportingService:
    def __init__(self):
        self.nfiu_api_key = os.getenv('NFIU_API_KEY')
        self.nfiu_institution_code = os.getenv('NFIU_INSTITUTION_CODE')
        self.scuml_registration_number = os.getenv('SCUML_REGISTRATION_NUMBER')
        
        # Thresholds for STR triggers (in NGN)
        self.str_thresholds = {
            'single_transaction': 5000000,  # ₦5M
            'daily_aggregate': 10000000,    # ₦10M
            'weekly_aggregate': 50000000,   # ₦50M
            'cash_transaction': 2000000     # ₦2M cash
        }
    
    async def generate_str(
        self,
        transaction_id: int,
        user_id: int,
        transaction_data: Dict[str, Any],
        suspicion_reason: str,
        supporting_evidence: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate Suspicious Transaction Report for NFIU
        
        Args:
            transaction_id: Transaction identifier
            user_id: User identifier
            transaction_data: Transaction details
            suspicion_reason: Reason for suspicion
            supporting_evidence: List of evidence items
        
        Returns:
            {
                "success": bool,
                "str_id": str,
                "str_number": str,
                "submission_status": str,
                "report_data": dict,
                "pdf_path": str
            }
        """
        
        # Generate STR number
        str_number = self._generate_str_number()
        
        # Compile report data
        report_data = {
            "str_number": str_number,
            "reporting_institution": {
                "name": "Real Estate Platform",
                "code": self.nfiu_institution_code,
                "scuml_registration": self.scuml_registration_number,
                "contact": {
                    "compliance_officer": "Compliance Officer",
                    "email": "compliance@realestate.com",
                    "phone": "+234-XXX-XXX-XXXX"
                }
            },
            "report_date": datetime.now().isoformat(),
            "transaction_details": {
                "transaction_id": transaction_id,
                "date": transaction_data.get('date'),
                "amount": transaction_data.get('amount'),
                "currency": transaction_data.get('currency', 'NGN'),
                "type": transaction_data.get('type'),
                "description": transaction_data.get('description')
            },
            "subject_information": {
                "user_id": user_id,
                "name": transaction_data.get('user_name'),
                "identification": {
                    "nin": transaction_data.get('nin'),
                    "bvn": transaction_data.get('bvn'),
                    "phone": transaction_data.get('phone'),
                    "email": transaction_data.get('email')
                },
                "address": transaction_data.get('address'),
                "occupation": transaction_data.get('occupation')
            },
            "suspicion_details": {
                "reason": suspicion_reason,
                "indicators": self._identify_str_indicators(transaction_data),
                "risk_level": transaction_data.get('risk_level', 'HIGH'),
                "supporting_evidence": supporting_evidence
            },
            "related_transactions": await self._get_related_transactions(user_id),
            "compliance_officer_notes": "",
            "attachments": []
        }
        
        # Generate PDF report
        pdf_path = await self._generate_str_pdf(report_data)
        
        # Submit to NFIU (if API available)
        submission_status = await self._submit_to_nfiu(report_data)
        
        # Store in database
        str_id = await self._store_str(report_data)
        
        return {
            "success": True,
            "str_id": str_id,
            "str_number": str_number,
            "submission_status": submission_status,
            "report_data": report_data,
            "pdf_path": pdf_path,
            "timestamp": datetime.now().isoformat()
        }
    
    async def generate_quarterly_report(
        self,
        quarter: int,  # 1-4
        year: int
    ) -> Dict[str, Any]:
        """
        Generate quarterly compliance report for SCUML
        
        Returns:
            {
                "success": bool,
                "report_id": str,
                "period": str,
                "statistics": dict,
                "pdf_path": str,
                "csv_path": str
            }
        """
        
        # Calculate date range
        start_date, end_date = self._get_quarter_dates(quarter, year)
        
        # Gather statistics
        statistics = await self._gather_quarterly_statistics(start_date, end_date)
        
        # Compile report data
        report_data = {
            "report_type": "SCUML Quarterly Compliance Report",
            "institution": {
                "name": "Real Estate Platform",
                "scuml_registration": self.scuml_registration_number,
                "reporting_period": f"Q{quarter} {year}"
            },
            "period": {
                "quarter": quarter,
                "year": year,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "statistics": statistics,
            "str_summary": {
                "total_strs_filed": statistics['str_count'],
                "strs_by_category": statistics['str_by_category'],
                "high_risk_transactions": statistics['high_risk_count']
            },
            "kyc_compliance": {
                "total_customers": statistics['total_customers'],
                "kyc_completed": statistics['kyc_completed'],
                "kyc_pending": statistics['kyc_pending'],
                "compliance_rate": statistics['kyc_compliance_rate']
            },
            "transaction_monitoring": {
                "total_transactions": statistics['total_transactions'],
                "total_value": statistics['total_transaction_value'],
                "flagged_transactions": statistics['flagged_transactions'],
                "false_positives": statistics['false_positives']
            },
            "training_and_awareness": {
                "staff_trained": 0,  # Placeholder
                "training_sessions": 0,
                "compliance_updates": 0
            },
            "recommendations": self._generate_recommendations(statistics)
        }
        
        # Generate PDF report
        pdf_path = await self._generate_quarterly_pdf(report_data)
        
        # Generate CSV data export
        csv_path = await self._generate_quarterly_csv(start_date, end_date)
        
        # Store report
        report_id = await self._store_quarterly_report(report_data)
        
        return {
            "success": True,
            "report_id": report_id,
            "period": f"Q{quarter} {year}",
            "statistics": statistics,
            "pdf_path": pdf_path,
            "csv_path": csv_path,
            "timestamp": datetime.now().isoformat()
        }
    
    async def generate_audit_trail(
        self,
        user_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        transaction_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate audit trail export for regulatory inspection
        
        Returns:
            {
                "success": bool,
                "audit_id": str,
                "record_count": int,
                "csv_path": str,
                "json_path": str
            }
        """
        
        # Set default date range (last 90 days)
        if not start_date:
            start_date = datetime.now() - timedelta(days=90)
        if not end_date:
            end_date = datetime.now()
        
        # Fetch audit records
        audit_records = await self._fetch_audit_records(
            user_id, start_date, end_date, transaction_types
        )
        
        # Generate CSV export
        csv_path = await self._generate_audit_csv(audit_records)
        
        # Generate JSON export
        json_path = await self._generate_audit_json(audit_records)
        
        # Generate audit ID
        audit_id = f"AUDIT_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            "success": True,
            "audit_id": audit_id,
            "record_count": len(audit_records),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "csv_path": csv_path,
            "json_path": json_path,
            "timestamp": datetime.now().isoformat()
        }
    
    async def check_str_triggers(
        self,
        transaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check if transaction triggers STR requirements
        
        Returns:
            {
                "requires_str": bool,
                "triggers": List[str],
                "risk_score": float,
                "recommendation": str
            }
        """
        
        triggers = []
        risk_score = 0.0
        
        amount = transaction_data.get('amount', 0)
        transaction_type = transaction_data.get('type', '')
        user_id = transaction_data.get('user_id')
        
        # Check amount thresholds
        if amount >= self.str_thresholds['single_transaction']:
            triggers.append("Large single transaction (≥₦5M)")
            risk_score += 30
        
        # Check cash transactions
        if transaction_type == 'cash' and amount >= self.str_thresholds['cash_transaction']:
            triggers.append("Large cash transaction (≥₦2M)")
            risk_score += 40
        
        # Check daily aggregate
        daily_total = await self._get_daily_transaction_total(user_id)
        if daily_total >= self.str_thresholds['daily_aggregate']:
            triggers.append("Daily aggregate exceeds threshold (≥₦10M)")
            risk_score += 35
        
        # Check structuring (multiple transactions just below threshold)
        if await self._detect_structuring(user_id, amount):
            triggers.append("Possible structuring detected")
            risk_score += 50
        
        # Check unusual patterns
        if await self._detect_unusual_pattern(user_id, transaction_data):
            triggers.append("Unusual transaction pattern")
            risk_score += 25
        
        # Check high-risk countries
        if transaction_data.get('country') in self._get_high_risk_countries():
            triggers.append("Transaction involves high-risk jurisdiction")
            risk_score += 20
        
        # Check PEP involvement
        if transaction_data.get('pep_match'):
            triggers.append("Transaction involves Politically Exposed Person")
            risk_score += 30
        
        requires_str = risk_score >= 50 or len(triggers) >= 2
        
        recommendation = self._get_str_recommendation(risk_score, triggers)
        
        return {
            "requires_str": requires_str,
            "triggers": triggers,
            "risk_score": min(100, risk_score),
            "recommendation": recommendation
        }
    
    def _generate_str_number(self) -> str:
        """Generate unique STR number"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"STR-{self.nfiu_institution_code}-{timestamp}"
    
    def _identify_str_indicators(self, transaction_data: Dict[str, Any]) -> List[str]:
        """Identify red flag indicators"""
        indicators = []
        
        if transaction_data.get('amount', 0) >= 5000000:
            indicators.append("Large transaction amount")
        
        if transaction_data.get('cash_transaction'):
            indicators.append("Cash transaction")
        
        if transaction_data.get('rapid_movement'):
            indicators.append("Rapid movement of funds")
        
        if transaction_data.get('no_economic_purpose'):
            indicators.append("No apparent economic purpose")
        
        if transaction_data.get('complex_structure'):
            indicators.append("Unnecessarily complex transaction structure")
        
        return indicators
    
    async def _get_related_transactions(self, user_id: int) -> List[Dict[str, Any]]:
        """Get related transactions for STR context"""
        # Placeholder - implement actual DB query
        return []
    
    async def _generate_str_pdf(self, report_data: Dict[str, Any]) -> str:
        """Generate PDF version of STR"""
        # Placeholder - implement PDF generation
        pdf_path = f"/tmp/str_{report_data['str_number']}.pdf"
        return pdf_path
    
    async def _submit_to_nfiu(self, report_data: Dict[str, Any]) -> str:
        """Submit STR to NFIU portal"""
        # Placeholder - implement NFIU API submission
        return "pending_submission"
    
    async def _store_str(self, report_data: Dict[str, Any]) -> str:
        """Store STR in database"""
        # Placeholder - implement DB storage
        return f"str_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    def _get_quarter_dates(self, quarter: int, year: int) -> tuple:
        """Get start and end dates for quarter"""
        quarter_months = {
            1: (1, 3),
            2: (4, 6),
            3: (7, 9),
            4: (10, 12)
        }
        
        start_month, end_month = quarter_months[quarter]
        start_date = datetime(year, start_month, 1)
        
        if end_month == 12:
            end_date = datetime(year, 12, 31)
        else:
            end_date = datetime(year, end_month + 1, 1) - timedelta(days=1)
        
        return start_date, end_date
    
    async def _gather_quarterly_statistics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Gather statistics for quarterly report"""
        # Placeholder - implement actual data gathering
        return {
            'str_count': 0,
            'str_by_category': {},
            'high_risk_count': 0,
            'total_customers': 0,
            'kyc_completed': 0,
            'kyc_pending': 0,
            'kyc_compliance_rate': 0.0,
            'total_transactions': 0,
            'total_transaction_value': 0.0,
            'flagged_transactions': 0,
            'false_positives': 0
        }
    
    async def _generate_quarterly_pdf(self, report_data: Dict[str, Any]) -> str:
        """Generate PDF for quarterly report"""
        # Placeholder - implement PDF generation
        pdf_path = f"/tmp/quarterly_q{report_data['period']['quarter']}_{report_data['period']['year']}.pdf"
        return pdf_path
    
    async def _generate_quarterly_csv(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> str:
        """Generate CSV data export for quarterly report"""
        # Placeholder - implement CSV generation
        csv_path = f"/tmp/quarterly_data_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"
        return csv_path
    
    async def _store_quarterly_report(self, report_data: Dict[str, Any]) -> str:
        """Store quarterly report in database"""
        # Placeholder - implement DB storage
        return f"qr_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    def _generate_recommendations(self, statistics: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on statistics"""
        recommendations = []
        
        if statistics['kyc_compliance_rate'] < 0.9:
            recommendations.append("Improve KYC completion rate through user education and streamlined processes")
        
        if statistics['false_positives'] > statistics['flagged_transactions'] * 0.5:
            recommendations.append("Review and refine transaction monitoring rules to reduce false positives")
        
        if statistics['str_count'] == 0:
            recommendations.append("Ensure transaction monitoring systems are functioning correctly")
        
        return recommendations
    
    async def _fetch_audit_records(
        self,
        user_id: Optional[int],
        start_date: datetime,
        end_date: datetime,
        transaction_types: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """Fetch audit records from database"""
        # Placeholder - implement actual DB query
        return []
    
    async def _generate_audit_csv(self, audit_records: List[Dict[str, Any]]) -> str:
        """Generate CSV file from audit records"""
        csv_path = f"/tmp/audit_trail_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
        
        if audit_records:
            df = pd.DataFrame(audit_records)
            df.to_csv(csv_path, index=False)
        
        return csv_path
    
    async def _generate_audit_json(self, audit_records: List[Dict[str, Any]]) -> str:
        """Generate JSON file from audit records"""
        json_path = f"/tmp/audit_trail_{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        
        with open(json_path, 'w') as f:
            json.dump(audit_records, f, indent=2, default=str)
        
        return json_path
    
    async def _get_daily_transaction_total(self, user_id: int) -> float:
        """Get total transaction amount for today"""
        # Placeholder - implement actual DB query
        return 0.0
    
    async def _detect_structuring(self, user_id: int, amount: float) -> bool:
        """Detect possible structuring (smurfing)"""
        # Placeholder - implement structuring detection logic
        return False
    
    async def _detect_unusual_pattern(
        self,
        user_id: int,
        transaction_data: Dict[str, Any]
    ) -> bool:
        """Detect unusual transaction patterns"""
        # Placeholder - implement pattern detection logic
        return False
    
    def _get_high_risk_countries(self) -> List[str]:
        """Get list of high-risk countries"""
        # Based on FATF high-risk jurisdictions
        return [
            'KP',  # North Korea
            'IR',  # Iran
            'MM',  # Myanmar
            'SY',  # Syria
            # Add more as per FATF list
        ]
    
    def _get_str_recommendation(self, risk_score: float, triggers: List[str]) -> str:
        """Get recommendation based on STR analysis"""
        if risk_score >= 75:
            return "IMMEDIATE STR FILING REQUIRED - High risk indicators present"
        elif risk_score >= 50:
            return "FILE STR - Multiple risk factors identified"
        elif len(triggers) >= 2:
            return "CONSIDER STR FILING - Review with compliance officer"
        else:
            return "MONITOR - Continue enhanced monitoring"
