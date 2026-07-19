#!/usr/bin/env python3
"""
Continuous OCR Accuracy Monitoring System
Runs periodic tests and tracks accuracy trends over time
"""

import json
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List
import time

class ContinuousMonitor:
    def __init__(self, ocr_service_url: str, test_data_dir: str = "./test-data"):
        self.ocr_url = ocr_service_url
        self.test_data_dir = Path(test_data_dir)
        self.results_dir = Path("./monitoring-results")
        self.results_dir.mkdir(exist_ok=True)
        
    def run_test_batch(self) -> Dict:
        """Run a complete test batch and return results"""
        
        # Load test index
        index_file = self.test_data_dir / "index.json"
        if not index_file.exists():
            print("No test data found")
            return {}
        
        with open(index_file) as f:
            index = json.load(f)
        
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_samples": len(index["samples"]),
            "results_by_type": {},
            "overall_accuracy": 0.0
        }
        
        total_correct = 0
        total_fields = 0
        
        for sample in index["samples"]:
            doc_type = sample["document_type"]
            
            # Run OCR
            doc_path = self.test_data_dir / sample["file_path"]
            ocr_result = self._call_ocr_service(doc_path)
            
            # Load ground truth
            gt_path = self.test_data_dir / sample["ground_truth_path"]
            with open(gt_path) as f:
                ground_truth = json.load(f)
            
            # Calculate accuracy
            accuracy = self._calculate_accuracy(ocr_result, ground_truth)
            
            # Aggregate by type
            if doc_type not in results["results_by_type"]:
                results["results_by_type"][doc_type] = {
                    "samples": 0,
                    "total_accuracy": 0.0,
                    "field_accuracies": {}
                }
            
            results["results_by_type"][doc_type]["samples"] += 1
            results["results_by_type"][doc_type]["total_accuracy"] += accuracy["overall"]
            
            # Track field-level accuracy
            for field, acc in accuracy["fields"].items():
                if field not in results["results_by_type"][doc_type]["field_accuracies"]:
                    results["results_by_type"][doc_type]["field_accuracies"][field] = []
                results["results_by_type"][doc_type]["field_accuracies"][field].append(acc)
            
            total_correct += accuracy["correct_fields"]
            total_fields += accuracy["total_fields"]
        
        # Calculate averages
        for doc_type, data in results["results_by_type"].items():
            data["average_accuracy"] = data["total_accuracy"] / data["samples"]
            
            # Average field accuracies
            for field, accs in data["field_accuracies"].items():
                data["field_accuracies"][field] = sum(accs) / len(accs)
        
        results["overall_accuracy"] = total_correct / total_fields if total_fields > 0 else 0.0
        
        return results
    
    def _call_ocr_service(self, image_path: Path) -> Dict:
        """Call OCR service and return extracted data"""
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(
                    f"{self.ocr_url}/extract",
                    files=files,
                    timeout=30
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            print(f"OCR service error: {e}")
            return {}
    
    def _calculate_accuracy(self, ocr_result: Dict, ground_truth: Dict) -> Dict:
        """Calculate accuracy metrics"""
        
        fields = ground_truth.get("fields", {})
        ocr_fields = ocr_result.get("fields", {})
        
        correct = 0
        total = len(fields)
        field_accuracies = {}
        
        for field, expected in fields.items():
            actual = ocr_fields.get(field, "")
            
            # Normalize for comparison
            expected_norm = str(expected).lower().strip()
            actual_norm = str(actual).lower().strip()
            
            is_correct = expected_norm == actual_norm
            if is_correct:
                correct += 1
            
            field_accuracies[field] = 1.0 if is_correct else 0.0
        
        return {
            "overall": correct / total if total > 0 else 0.0,
            "correct_fields": correct,
            "total_fields": total,
            "fields": field_accuracies
        }
    
    def save_results(self, results: Dict):
        """Save test results to file"""
        
        timestamp = results["timestamp"].replace(":", "-")
        results_file = self.results_dir / f"results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Results saved to {results_file}")
    
    def generate_report(self, results: Dict):
        """Generate human-readable report"""
        
        print("\n" + "="*60)
        print("OCR Accuracy Monitoring Report")
        print("="*60)
        print(f"Timestamp: {results['timestamp']}")
        print(f"Total Samples: {results['total_samples']}")
        print(f"Overall Accuracy: {results['overall_accuracy']:.2%}")
        print("\nAccuracy by Document Type:")
        
        for doc_type, data in results["results_by_type"].items():
            print(f"\n  {doc_type.upper()}:")
            print(f"    Samples: {data['samples']}")
            print(f"    Average Accuracy: {data['average_accuracy']:.2%}")
            print(f"    Field Accuracies:")
            
            for field, acc in sorted(data["field_accuracies"].items()):
                print(f"      {field}: {acc:.2%}")
        
        print("="*60 + "\n")
    
    def check_thresholds(self, results: Dict, min_accuracy: float = 0.85):
        """Check if accuracy meets minimum thresholds"""
        
        alerts = []
        
        if results["overall_accuracy"] < min_accuracy:
            alerts.append(f"Overall accuracy ({results['overall_accuracy']:.2%}) below threshold ({min_accuracy:.2%})")
        
        for doc_type, data in results["results_by_type"].items():
            if data["average_accuracy"] < min_accuracy:
                alerts.append(f"{doc_type} accuracy ({data['average_accuracy']:.2%}) below threshold")
        
        if alerts:
            print("\n⚠️  ACCURACY ALERTS:")
            for alert in alerts:
                print(f"  - {alert}")
            print()
        else:
            print("\n✅ All accuracy thresholds met\n")
        
        return alerts
    
    def run_continuous(self, interval_minutes: int = 60):
        """Run monitoring continuously"""
        
        print(f"Starting continuous monitoring (interval: {interval_minutes} minutes)")
        
        while True:
            try:
                print(f"\n[{datetime.now()}] Running test batch...")
                
                results = self.run_test_batch()
                self.save_results(results)
                self.generate_report(results)
                self.check_thresholds(results)
                
                print(f"Next run in {interval_minutes} minutes...")
                time.sleep(interval_minutes * 60)
                
            except KeyboardInterrupt:
                print("\nMonitoring stopped by user")
                break
            except Exception as e:
                print(f"Error during monitoring: {e}")
                time.sleep(60)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Continuous OCR Accuracy Monitoring")
    parser.add_argument("--url", required=True, help="OCR service URL")
    parser.add_argument("--test-data", default="./test-data", help="Test data directory")
    parser.add_argument("--continuous", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=60, help="Interval in minutes (for continuous mode)")
    parser.add_argument("--threshold", type=float, default=0.85, help="Minimum accuracy threshold")
    
    args = parser.parse_args()
    
    monitor = ContinuousMonitor(args.url, args.test_data)
    
    if args.continuous:
        monitor.run_continuous(args.interval)
    else:
        results = monitor.run_test_batch()
        monitor.save_results(results)
        monitor.generate_report(results)
        monitor.check_thresholds(results, args.threshold)

if __name__ == "__main__":
    main()
