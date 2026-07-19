"""
Security Scanner Microservice
Performs security scanning, vulnerability detection, and compliance checks
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl
import aiohttp
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
scan_requests = Counter('security_scan_requests_total', 'Total security scan requests')
scan_duration = Histogram('security_scan_duration_seconds', 'Security scan duration')
vulnerabilities_found = Counter('vulnerabilities_found_total', 'Total vulnerabilities found', ['severity'])

# Models
class ScanRequest(BaseModel):
    target_url: HttpUrl
    scan_type: str = Field(..., description="Type of scan: web, api, network, code")
    depth: int = Field(default=2, ge=1, le=5)
    include_owasp: bool = True
    include_cve: bool = True
    
class Vulnerability(BaseModel):
    id: str
    severity: str  # critical, high, medium, low, info
    title: str
    description: str
    affected_component: str
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    remediation: str
    references: List[str] = []

class ScanResult(BaseModel):
    scan_id: str
    target: str
    status: str
    vulnerabilities: List[Vulnerability]
    summary: Dict[str, int]
    scan_duration: float
    timestamp: str

class ComplianceCheck(BaseModel):
    standard: str  # PCI-DSS, GDPR, HIPAA, SOC2
    passed: bool
    score: float
    findings: List[Dict]

# Security Scanner Service
class SecurityScanner:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info("Security Scanner initialized")
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
        logger.info("Security Scanner cleaned up")
    
    @scan_duration.time()
    async def scan_web_application(self, target: str, depth: int) -> List[Vulnerability]:
        """Scan web application for vulnerabilities"""
        vulnerabilities = []
        
        # SQL Injection Detection
        sql_vulns = await self._check_sql_injection(target)
        vulnerabilities.extend(sql_vulns)
        
        # XSS Detection
        xss_vulns = await self._check_xss(target)
        vulnerabilities.extend(xss_vulns)
        
        # CSRF Detection
        csrf_vulns = await self._check_csrf(target)
        vulnerabilities.extend(csrf_vulns)
        
        # Security Headers Check
        header_vulns = await self._check_security_headers(target)
        vulnerabilities.extend(header_vulns)
        
        # SSL/TLS Check
        ssl_vulns = await self._check_ssl_tls(target)
        vulnerabilities.extend(ssl_vulns)
        
        # Authentication/Authorization Checks
        auth_vulns = await self._check_authentication(target)
        vulnerabilities.extend(auth_vulns)
        
        return vulnerabilities
    
    async def _check_sql_injection(self, target: str) -> List[Vulnerability]:
        """Check for SQL injection vulnerabilities"""
        vulnerabilities = []
        payloads = ["' OR '1'='1", "1' UNION SELECT NULL--", "admin'--"]
        
        for payload in payloads:
            try:
                async with self.session.get(f"{target}?id={payload}", timeout=10) as response:
                    content = await response.text()
                    if any(error in content.lower() for error in ['sql', 'mysql', 'syntax error', 'postgresql']):
                        vulnerabilities.append(Vulnerability(
                            id=f"SQL-INJ-{len(vulnerabilities)+1}",
                            severity="critical",
                            title="SQL Injection Vulnerability",
                            description=f"SQL injection detected with payload: {payload}",
                            affected_component=target,
                            cve_id="CWE-89",
                            cvss_score=9.8,
                            remediation="Use parameterized queries and input validation",
                            references=[
                                "https://owasp.org/www-community/attacks/SQL_Injection",
                                "https://cwe.mitre.org/data/definitions/89.html"
                            ]
                        ))
                        vulnerabilities_found.labels(severity='critical').inc()
                        break
            except Exception as e:
                logger.error(f"Error checking SQL injection: {e}")
        
        return vulnerabilities
    
    async def _check_xss(self, target: str) -> List[Vulnerability]:
        """Check for XSS vulnerabilities"""
        vulnerabilities = []
        payloads = ["<script>alert('XSS')</script>", "<img src=x onerror=alert('XSS')>"]
        
        for payload in payloads:
            try:
                async with self.session.get(f"{target}?search={payload}", timeout=10) as response:
                    content = await response.text()
                    if payload in content:
                        vulnerabilities.append(Vulnerability(
                            id=f"XSS-{len(vulnerabilities)+1}",
                            severity="high",
                            title="Cross-Site Scripting (XSS) Vulnerability",
                            description=f"XSS vulnerability detected with payload: {payload}",
                            affected_component=target,
                            cve_id="CWE-79",
                            cvss_score=7.5,
                            remediation="Implement output encoding and Content Security Policy",
                            references=[
                                "https://owasp.org/www-community/attacks/xss/",
                                "https://cwe.mitre.org/data/definitions/79.html"
                            ]
                        ))
                        vulnerabilities_found.labels(severity='high').inc()
                        break
            except Exception as e:
                logger.error(f"Error checking XSS: {e}")
        
        return vulnerabilities
    
    async def _check_csrf(self, target: str) -> List[Vulnerability]:
        """Check for CSRF vulnerabilities"""
        vulnerabilities = []
        try:
            async with self.session.get(target, timeout=10) as response:
                content = await response.text()
                if 'csrf' not in content.lower() and 'token' not in content.lower():
                    vulnerabilities.append(Vulnerability(
                        id="CSRF-1",
                        severity="medium",
                        title="Missing CSRF Protection",
                        description="No CSRF tokens detected in forms",
                        affected_component=target,
                        cve_id="CWE-352",
                        cvss_score=6.5,
                        remediation="Implement CSRF tokens for all state-changing operations",
                        references=[
                            "https://owasp.org/www-community/attacks/csrf",
                            "https://cwe.mitre.org/data/definitions/352.html"
                        ]
                    ))
                    vulnerabilities_found.labels(severity='medium').inc()
        except Exception as e:
            logger.error(f"Error checking CSRF: {e}")
        
        return vulnerabilities
    
    async def _check_security_headers(self, target: str) -> List[Vulnerability]:
        """Check for missing security headers"""
        vulnerabilities = []
        required_headers = {
            'X-Frame-Options': 'medium',
            'X-Content-Type-Options': 'low',
            'X-XSS-Protection': 'low',
            'Strict-Transport-Security': 'high',
            'Content-Security-Policy': 'high',
        }
        
        try:
            async with self.session.get(target, timeout=10) as response:
                for header, severity in required_headers.items():
                    if header not in response.headers:
                        vulnerabilities.append(Vulnerability(
                            id=f"HEADER-{header}",
                            severity=severity,
                            title=f"Missing Security Header: {header}",
                            description=f"The {header} security header is not set",
                            affected_component=target,
                            cvss_score=5.0 if severity == 'medium' else 3.0,
                            remediation=f"Add {header} header to all responses",
                            references=["https://owasp.org/www-project-secure-headers/"]
                        ))
                        vulnerabilities_found.labels(severity=severity).inc()
        except Exception as e:
            logger.error(f"Error checking security headers: {e}")
        
        return vulnerabilities
    
    async def _check_ssl_tls(self, target: str) -> List[Vulnerability]:
        """Check SSL/TLS configuration"""
        vulnerabilities = []
        if not target.startswith('https://'):
            vulnerabilities.append(Vulnerability(
                id="SSL-1",
                severity="critical",
                title="No HTTPS/TLS Encryption",
                description="Application is not using HTTPS",
                affected_component=target,
                cve_id="CWE-319",
                cvss_score=9.1,
                remediation="Enable HTTPS with valid TLS certificate",
                references=["https://cwe.mitre.org/data/definitions/319.html"]
            ))
            vulnerabilities_found.labels(severity='critical').inc()
        
        return vulnerabilities
    
    async def _check_authentication(self, target: str) -> List[Vulnerability]:
        """Check authentication mechanisms"""
        vulnerabilities = []
        # Check for weak authentication
        # This is a simplified check
        try:
            async with self.session.get(f"{target}/admin", timeout=10) as response:
                if response.status == 200:
                    vulnerabilities.append(Vulnerability(
                        id="AUTH-1",
                        severity="critical",
                        title="Weak Authentication",
                        description="Admin endpoint accessible without authentication",
                        affected_component=f"{target}/admin",
                        cve_id="CWE-287",
                        cvss_score=9.8,
                        remediation="Implement strong authentication for admin endpoints",
                        references=["https://cwe.mitre.org/data/definitions/287.html"]
                    ))
                    vulnerabilities_found.labels(severity='critical').inc()
        except Exception as e:
            logger.error(f"Error checking authentication: {e}")
        
        return vulnerabilities
    
    async def check_compliance(self, target: str, standard: str) -> ComplianceCheck:
        """Check compliance with security standards"""
        # Simplified compliance check
        findings = []
        passed_checks = 0
        total_checks = 10
        
        # Perform standard-specific checks
        if standard == "PCI-DSS":
            # Check encryption, access controls, monitoring, etc.
            pass
        elif standard == "GDPR":
            # Check data protection, privacy, consent, etc.
            pass
        elif standard == "HIPAA":
            # Check PHI protection, access controls, audit logs, etc.
            pass
        
        score = (passed_checks / total_checks) * 100
        
        return ComplianceCheck(
            standard=standard,
            passed=score >= 80,
            score=score,
            findings=findings
        )

# Initialize scanner
scanner = SecurityScanner()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await scanner.initialize()
    yield
    # Shutdown
    await scanner.cleanup()

# FastAPI app
app = FastAPI(
    title="Security Scanner Service",
    description="Microservice for security scanning and vulnerability detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "security-scanner"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/api/v1/scan", response_model=ScanResult)
async def scan_target(request: ScanRequest, background_tasks: BackgroundTasks):
    """Initiate security scan"""
    scan_requests.inc()
    
    import time
    import uuid
    from datetime import datetime
    
    scan_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        # Perform scan based on type
        if request.scan_type == "web":
            vulnerabilities = await scanner.scan_web_application(str(request.target_url), request.depth)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported scan type: {request.scan_type}")
        
        duration = time.time() - start_time
        
        # Calculate summary
        summary = {
            "critical": sum(1 for v in vulnerabilities if v.severity == "critical"),
            "high": sum(1 for v in vulnerabilities if v.severity == "high"),
            "medium": sum(1 for v in vulnerabilities if v.severity == "medium"),
            "low": sum(1 for v in vulnerabilities if v.severity == "low"),
            "info": sum(1 for v in vulnerabilities if v.severity == "info"),
        }
        
        result = ScanResult(
            scan_id=scan_id,
            target=str(request.target_url),
            status="completed",
            vulnerabilities=vulnerabilities,
            summary=summary,
            scan_duration=duration,
            timestamp=datetime.utcnow().isoformat()
        )
        
        logger.info(f"Scan completed: {scan_id}, found {len(vulnerabilities)} vulnerabilities")
        return result
        
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/compliance", response_model=ComplianceCheck)
async def check_compliance(target: HttpUrl, standard: str):
    """Check compliance with security standards"""
    try:
        result = await scanner.check_compliance(str(target), standard)
        return result
    except Exception as e:
        logger.error(f"Compliance check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
