#!/usr/bin/env python3
"""
Comprehensive deployment verification script
"""
import requests
import sys
import time
from typing import List, Tuple

class DeploymentVerifier:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results: List[Tuple[str, bool, str]] = []

    def test_health_endpoints(self):
        """Test all service health endpoints"""
        services = [
            'property-service', 'user-service', 'transaction-service',
            'search-service', 'crm-service', 'developer-service',
            'analytics-service', 'notification-service'
        ]
        
        for service in services:
            try:
                response = requests.get(f"{self.base_url}/api/{service}/health", timeout=5)
                success = response.status_code == 200
                message = f"HTTP {response.status_code}"
                self.results.append((f"{service} health", success, message))
            except Exception as e:
                self.results.append((f"{service} health", False, str(e)))

    def test_api_functionality(self):
        """Test basic API functionality"""
        tests = [
            ("GET /api/properties", lambda: requests.get(f"{self.base_url}/api/properties")),
            ("POST /api/auth/login", lambda: requests.post(
                f"{self.base_url}/api/auth/login",
                json={"email": "test@example.com", "password": "test"}
            )),
            ("GET /api/search", lambda: requests.get(f"{self.base_url}/api/properties/search?q=test")),
        ]
        
        for name, test_func in tests:
            try:
                response = test_func()
                success = response.status_code in [200, 201, 401]  # 401 is OK for auth test
                message = f"HTTP {response.status_code}"
                self.results.append((name, success, message))
            except Exception as e:
                self.results.append((name, False, str(e)))

    def test_monitoring(self):
        """Test monitoring endpoints"""
        try:
            # Test Prometheus
            response = requests.get(f"{self.base_url}:9090/-/healthy", timeout=5)
            self.results.append(("Prometheus", response.status_code == 200, f"HTTP {response.status_code}"))
        except Exception as e:
            self.results.append(("Prometheus", False, str(e)))

        try:
            # Test Grafana
            response = requests.get(f"{self.base_url}:3000/api/health", timeout=5)
            self.results.append(("Grafana", response.status_code == 200, f"HTTP {response.status_code}"))
        except Exception as e:
            self.results.append(("Grafana", False, str(e)))

    def run_all_tests(self):
        """Run all verification tests"""
        print("🧪 Running Deployment Verification Tests")
        print("=" * 50)
        
        self.test_health_endpoints()
        self.test_api_functionality()
        self.test_monitoring()
        
        # Print results
        print("\nResults:")
        print("-" * 50)
        
        passed = 0
        failed = 0
        
        for name, success, message in self.results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} - {name}: {message}")
            if success:
                passed += 1
            else:
                failed += 1
        
        print("-" * 50)
        print(f"Total: {passed} passed, {failed} failed")
        
        return failed == 0

if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
    
    verifier = DeploymentVerifier(base_url)
    success = verifier.run_all_tests()
    
    sys.exit(0 if success else 1)
