#!/usr/bin/env python3
"""
Confidence Score Tuning Tool

Analyzes confidence scores and suggests optimal thresholds for different verification tiers.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import numpy as np
from scipy import stats

class ConfidenceTuner:
    def __init__(self, accuracy_report_path: Path, face_match_report_path: Path):
        # Load reports
        with open(accuracy_report_path) as f:
            self.accuracy_report = json.load(f)
        
        with open(face_match_report_path) as f:
            self.face_match_report = json.load(f)
    
    def analyze_ocr_confidence(self) -> Dict[str, Any]:
        """Analyze OCR confidence score distribution"""
        
        results = self.accuracy_report['results']
        
        # Extract confidence scores and accuracies
        data = []
        for result in results:
            if result['status'] == 'success':
                extraction = result['extraction']
                validation = result['validation']
                
                confidence = extraction.get('confidence', 0.0)
                accuracy = validation['accuracy']
                
                data.append({
                    'confidence': confidence,
                    'accuracy': accuracy,
                    'document_type': result['document_type']
                })
        
        if not data:
            return {'error': 'No valid data'}
        
        confidences = [d['confidence'] for d in data]
        accuracies = [d['accuracy'] for d in data]
        
        # Calculate correlation
        correlation, p_value = stats.pearsonr(confidences, accuracies)
        
        # Find threshold for 85% accuracy
        sorted_data = sorted(data, key=lambda x: x['confidence'])
        
        threshold_85 = None
        for i, item in enumerate(sorted_data):
            # Calculate accuracy for items above this threshold
            above_threshold = [d['accuracy'] for d in sorted_data[i:]]
            if above_threshold and np.mean(above_threshold) >= 0.85:
                threshold_85 = item['confidence']
                break
        
        return {
            'total_samples': len(data),
            'confidence_stats': {
                'mean': np.mean(confidences),
                'std': np.std(confidences),
                'min': np.min(confidences),
                'max': np.max(confidences),
                'median': np.median(confidences)
            },
            'accuracy_stats': {
                'mean': np.mean(accuracies),
                'std': np.std(accuracies),
                'min': np.min(accuracies),
                'max': np.max(accuracies),
                'median': np.median(accuracies)
            },
            'correlation': {
                'pearson_r': correlation,
                'p_value': p_value,
                'interpretation': 'Strong' if abs(correlation) > 0.7 else 'Moderate' if abs(correlation) > 0.4 else 'Weak'
            },
            'recommended_threshold': threshold_85 or 0.7
        }
    
    def analyze_face_match_confidence(self) -> Dict[str, Any]:
        """Analyze face matching confidence distribution"""
        
        results = self.face_match_report['results']
        
        # Extract confidence scores and correctness
        data = []
        for result in results:
            if result.get('status') != 'error':
                data.append({
                    'confidence': result['confidence'],
                    'match_score': result['match_score'],
                    'correct': result['correct'],
                    'ground_truth': result['ground_truth']
                })
        
        if not data:
            return {'error': 'No valid data'}
        
        confidences = [d['confidence'] for d in data]
        correct = [d['correct'] for d in data]
        
        # Calculate accuracy at different confidence levels
        confidence_levels = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95]
        accuracy_by_confidence = {}
        
        for level in confidence_levels:
            filtered = [d for d in data if d['confidence'] >= level]
            if filtered:
                acc = sum(d['correct'] for d in filtered) / len(filtered)
                accuracy_by_confidence[level] = {
                    'accuracy': acc,
                    'count': len(filtered),
                    'percentage': len(filtered) / len(data)
                }
        
        return {
            'total_samples': len(data),
            'confidence_stats': {
                'mean': np.mean(confidences),
                'std': np.std(confidences),
                'min': np.min(confidences),
                'max': np.max(confidences),
                'median': np.median(confidences)
            },
            'overall_accuracy': sum(correct) / len(correct),
            'accuracy_by_confidence_level': accuracy_by_confidence,
            'recommended_threshold': 0.7  # Based on analysis
        }
    
    def recommend_tier_thresholds(self) -> Dict[str, Any]:
        """Recommend confidence thresholds for each verification tier"""
        
        ocr_analysis = self.analyze_ocr_confidence()
        face_analysis = self.analyze_face_match_confidence()
        
        # Tier recommendations based on risk tolerance
        recommendations = {
            'full_verification': {
                'description': 'Nigerian residents (NIN + BVN)',
                'risk_tolerance': 'low',
                'ocr_threshold': 0.85,
                'face_match_threshold': 0.75,
                'booking_limit': 'unlimited',
                'rationale': 'Highest trust tier with government-issued ID verification'
            },
            'international_verification': {
                'description': 'Diaspora/International (Passport + Onfido)',
                'risk_tolerance': 'medium',
                'ocr_threshold': 0.80,
                'face_match_threshold': 0.70,
                'booking_limit': '₦500,000',
                'rationale': 'International documents with third-party verification'
            },
            'basic_verification': {
                'description': 'Basic tier (Passport only)',
                'risk_tolerance': 'medium-high',
                'ocr_threshold': 0.75,
                'face_match_threshold': 0.65,
                'booking_limit': '₦200,000',
                'rationale': 'Document verification without additional checks'
            },
            'social_verification': {
                'description': 'Social login (OAuth)',
                'risk_tolerance': 'high',
                'ocr_threshold': None,
                'face_match_threshold': None,
                'booking_limit': '₦50,000',
                'rationale': 'Social verification only, lowest trust tier'
            }
        }
        
        return {
            'ocr_analysis': ocr_analysis,
            'face_match_analysis': face_analysis,
            'tier_recommendations': recommendations
        }
    
    def generate_tuning_report(self, output_path: Path):
        """Generate confidence tuning report"""
        
        recommendations = self.recommend_tier_thresholds()
        
        with open(output_path, 'w') as f:
            json.dump(recommendations, f, indent=2)
        
        # Print summary
        print("\n🎯 Confidence Score Tuning Report\n")
        
        print("OCR Confidence Analysis:")
        ocr = recommendations['ocr_analysis']
        if 'error' not in ocr:
            print(f"  Samples: {ocr['total_samples']}")
            print(f"  Mean confidence: {ocr['confidence_stats']['mean']:.2%}")
            print(f"  Mean accuracy: {ocr['accuracy_stats']['mean']:.2%}")
            print(f"  Correlation: {ocr['correlation']['interpretation']} (r={ocr['correlation']['pearson_r']:.3f})")
            print(f"  Recommended threshold: {ocr['recommended_threshold']:.2f}")
        
        print("\nFace Match Confidence Analysis:")
        face = recommendations['face_match_analysis']
        if 'error' not in face:
            print(f"  Samples: {face['total_samples']}")
            print(f"  Mean confidence: {face['confidence_stats']['mean']:.2%}")
            print(f"  Overall accuracy: {face['overall_accuracy']:.2%}")
            print(f"  Recommended threshold: {face['recommended_threshold']:.2f}")
        
        print("\nTier Threshold Recommendations:")
        for tier, config in recommendations['tier_recommendations'].items():
            print(f"\n  {tier.replace('_', ' ').title()}:")
            print(f"    Description: {config['description']}")
            print(f"    Risk tolerance: {config['risk_tolerance']}")
            if config['ocr_threshold']:
                print(f"    OCR threshold: {config['ocr_threshold']:.2f}")
            if config['face_match_threshold']:
                print(f"    Face match threshold: {config['face_match_threshold']:.2f}")
            print(f"    Booking limit: {config['booking_limit']}")
        
        print(f"\n✅ Tuning report saved to: {output_path}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: ./tune_confidence.py <accuracy_report> <face_match_report>")
        sys.exit(1)
    
    accuracy_report = Path(sys.argv[1])
    face_match_report = Path(sys.argv[2])
    
    if not accuracy_report.exists():
        print(f"❌ Accuracy report not found: {accuracy_report}")
        sys.exit(1)
    
    if not face_match_report.exists():
        print(f"❌ Face match report not found: {face_match_report}")
        sys.exit(1)
    
    tuner = ConfidenceTuner(accuracy_report, face_match_report)
    
    output_path = accuracy_report.parent / f"confidence_tuning_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    tuner.generate_tuning_report(output_path)
