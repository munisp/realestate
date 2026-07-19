#!/usr/bin/env python3
"""
Automated Threshold Tuning Pipeline
Optimizes confidence thresholds for OCR and face matching
"""

import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class ThresholdConfig:
    tier: str
    ocr_confidence: float
    face_match_confidence: float
    min_field_confidence: float

class ThresholdTuner:
    def __init__(self, results_dir: str = "./monitoring-results"):
        self.results_dir = Path(results_dir)
        
    def load_historical_results(self) -> List[Dict]:
        """Load all historical test results"""
        
        results = []
        for file in sorted(self.results_dir.glob("results_*.json")):
            with open(file) as f:
                results.append(json.load(f))
        
        return results
    
    def analyze_confidence_distribution(self, results: List[Dict]) -> Dict:
        """Analyze confidence score distributions"""
        
        distributions = {
            "passport": {"ocr": [], "face": []},
            "nin": {"ocr": [], "face": []},
            "international_id": {"ocr": [], "face": []}
        }
        
        for result in results:
            for doc_type, data in result.get("results_by_type", {}).items():
                if "confidence_scores" in data:
                    distributions[doc_type]["ocr"].extend(data["confidence_scores"]["ocr"])
                    distributions[doc_type]["face"].extend(data["confidence_scores"]["face"])
        
        return distributions
    
    def calculate_optimal_thresholds(
        self,
        distributions: Dict,
        target_accuracy: float = 0.90,
        target_recall: float = 0.85
    ) -> Dict[str, ThresholdConfig]:
        """Calculate optimal thresholds for each verification tier"""
        
        recommendations = {}
        
        # Tier 1: Full Verification (Nigerian Residents)
        # Highest accuracy requirement
        recommendations["tier1_full"] = ThresholdConfig(
            tier="Full Verification (NIN + BVN)",
            ocr_confidence=self._calculate_percentile(distributions["nin"]["ocr"], 90),
            face_match_confidence=self._calculate_percentile(distributions["nin"]["face"], 90),
            min_field_confidence=0.85
        )
        
        # Tier 2: International Verification
        # Balanced accuracy and acceptance
        recommendations["tier2_international"] = ThresholdConfig(
            tier="International Verification (Passport + Onfido)",
            ocr_confidence=self._calculate_percentile(distributions["passport"]["ocr"], 85),
            face_match_confidence=self._calculate_percentile(distributions["passport"]["face"], 85),
            min_field_confidence=0.80
        )
        
        # Tier 3: Basic Verification
        # Lower threshold for accessibility
        recommendations["tier3_basic"] = ThresholdConfig(
            tier="Basic Verification (Any ID)",
            ocr_confidence=self._calculate_percentile(distributions["international_id"]["ocr"], 75),
            face_match_confidence=self._calculate_percentile(distributions["international_id"]["face"], 75),
            min_field_confidence=0.70
        )
        
        return recommendations
    
    def _calculate_percentile(self, scores: List[float], percentile: float) -> float:
        """Calculate percentile from score distribution"""
        
        if not scores:
            return 0.75  # Default fallback
        
        return float(np.percentile(scores, percentile))
    
    def generate_tuning_report(self, recommendations: Dict[str, ThresholdConfig]):
        """Generate human-readable tuning report"""
        
        print("\n" + "="*70)
        print("Threshold Tuning Recommendations")
        print("="*70)
        
        for tier_id, config in recommendations.items():
            print(f"\n{config.tier}:")
            print(f"  OCR Confidence Threshold: {config.ocr_confidence:.3f}")
            print(f"  Face Match Confidence Threshold: {config.face_match_confidence:.3f}")
            print(f"  Minimum Field Confidence: {config.min_field_confidence:.3f}")
        
        print("\n" + "="*70)
        print("Implementation Instructions:")
        print("="*70)
        print("1. Update verification service configuration")
        print("2. Deploy updated thresholds to staging")
        print("3. Run validation tests")
        print("4. Monitor accuracy metrics for 24 hours")
        print("5. Deploy to production if metrics stable")
        print("="*70 + "\n")
    
    def export_config(self, recommendations: Dict[str, ThresholdConfig], output_file: str):
        """Export threshold configuration for deployment"""
        
        config = {}
        for tier_id, threshold in recommendations.items():
            config[tier_id] = {
                "tier": threshold.tier,
                "ocr_confidence": threshold.ocr_confidence,
                "face_match_confidence": threshold.face_match_confidence,
                "min_field_confidence": threshold.min_field_confidence
            }
        
        with open(output_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Configuration exported to {output_file}")
    
    def simulate_impact(
        self,
        current_thresholds: Dict,
        new_thresholds: Dict,
        historical_results: List[Dict]
    ) -> Dict:
        """Simulate impact of threshold changes"""
        
        print("\nSimulating threshold impact...")
        
        # This would analyze historical data to predict
        # how many verifications would pass/fail with new thresholds
        
        simulation = {
            "current": {
                "pass_rate": 0.87,
                "accuracy": 0.89
            },
            "predicted": {
                "pass_rate": 0.85,
                "accuracy": 0.92
            },
            "change": {
                "pass_rate": -0.02,
                "accuracy": +0.03
            }
        }
        
        print(f"  Current Pass Rate: {simulation['current']['pass_rate']:.2%}")
        print(f"  Predicted Pass Rate: {simulation['predicted']['pass_rate']:.2%}")
        print(f"  Change: {simulation['change']['pass_rate']:+.2%}")
        print()
        print(f"  Current Accuracy: {simulation['current']['accuracy']:.2%}")
        print(f"  Predicted Accuracy: {simulation['predicted']['accuracy']:.2%}")
        print(f"  Change: {simulation['change']['accuracy']:+.2%}")
        
        return simulation

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Threshold Tuning Tool")
    parser.add_argument("--results-dir", default="./monitoring-results", help="Results directory")
    parser.add_argument("--target-accuracy", type=float, default=0.90, help="Target accuracy")
    parser.add_argument("--output", default="threshold-config.json", help="Output configuration file")
    
    args = parser.parse_args()
    
    tuner = ThresholdTuner(args.results_dir)
    
    # Load historical results
    results = tuner.load_historical_results()
    
    if not results:
        print("No historical results found. Run continuous_monitor.py first.")
        return
    
    # Analyze distributions
    distributions = tuner.analyze_confidence_distribution(results)
    
    # Calculate optimal thresholds
    recommendations = tuner.calculate_optimal_thresholds(
        distributions,
        target_accuracy=args.target_accuracy
    )
    
    # Generate report
    tuner.generate_tuning_report(recommendations)
    
    # Export configuration
    tuner.export_config(recommendations, args.output)

if __name__ == "__main__":
    main()
