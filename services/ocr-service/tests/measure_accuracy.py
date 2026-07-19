#!/usr/bin/env python3
"""
OCR Accuracy Measurement Tool

Measures OCR accuracy using various metrics:
- Character Error Rate (CER)
- Word Error Rate (WER)
- Field-level accuracy
- Confidence score calibration
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import numpy as np
from collections import defaultdict

class AccuracyAnalyzer:
    def __init__(self, report_path: Path):
        with open(report_path) as f:
            self.report = json.load(f)
        
        self.results = self.report['results']
    
    def calculate_cer(self, reference: str, hypothesis: str) -> float:
        """Calculate Character Error Rate"""
        if not reference:
            return 1.0 if hypothesis else 0.0
        
        # Levenshtein distance at character level
        len_ref = len(reference)
        len_hyp = len(hypothesis)
        
        dp = [[0] * (len_hyp + 1) for _ in range(len_ref + 1)]
        
        for i in range(len_ref + 1):
            dp[i][0] = i
        for j in range(len_hyp + 1):
            dp[0][j] = j
        
        for i in range(1, len_ref + 1):
            for j in range(1, len_hyp + 1):
                cost = 0 if reference[i-1] == hypothesis[j-1] else 1
                dp[i][j] = min(
                    dp[i-1][j] + 1,
                    dp[i][j-1] + 1,
                    dp[i-1][j-1] + cost
                )
        
        return dp[len_ref][len_hyp] / len_ref
    
    def calculate_wer(self, reference: str, hypothesis: str) -> float:
        """Calculate Word Error Rate"""
        ref_words = reference.split()
        hyp_words = hypothesis.split()
        
        if not ref_words:
            return 1.0 if hyp_words else 0.0
        
        # Levenshtein distance at word level
        len_ref = len(ref_words)
        len_hyp = len(hyp_words)
        
        dp = [[0] * (len_hyp + 1) for _ in range(len_ref + 1)]
        
        for i in range(len_ref + 1):
            dp[i][0] = i
        for j in range(len_hyp + 1):
            dp[0][j] = j
        
        for i in range(1, len_ref + 1):
            for j in range(1, len_hyp + 1):
                cost = 0 if ref_words[i-1] == hyp_words[j-1] else 1
                dp[i][j] = min(
                    dp[i-1][j] + 1,
                    dp[i][j-1] + 1,
                    dp[i-1][j-1] + cost
                )
        
        return dp[len_ref][len_hyp] / len_ref
    
    def analyze_by_document_type(self) -> Dict[str, Any]:
        """Analyze accuracy by document type"""
        
        by_type = defaultdict(list)
        
        for result in self.results:
            if result['status'] == 'success':
                doc_type = result['document_type']
                accuracy = result['validation']['accuracy']
                by_type[doc_type].append(accuracy)
        
        analysis = {}
        for doc_type, accuracies in by_type.items():
            analysis[doc_type] = {
                'count': len(accuracies),
                'mean': np.mean(accuracies),
                'std': np.std(accuracies),
                'min': np.min(accuracies),
                'max': np.max(accuracies),
                'median': np.median(accuracies)
            }
        
        return analysis
    
    def analyze_by_field(self) -> Dict[str, Any]:
        """Analyze accuracy by field"""
        
        field_stats = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for result in self.results:
            if result['status'] == 'success':
                validation = result['validation']
                
                # Count correct fields
                correct_fields = set()
                for error in validation['errors']:
                    field = error['field']
                    field_stats[field]['total'] += 1
                
                # All fields in expected data
                expected = result.get('expected_data', {})
                for field in expected.keys():
                    field_stats[field]['total'] += 1
                    
                    # Check if field had error
                    has_error = any(e['field'] == field for e in validation['errors'])
                    if not has_error:
                        field_stats[field]['correct'] += 1
        
        analysis = {}
        for field, stats in field_stats.items():
            accuracy = stats['correct'] / stats['total'] if stats['total'] > 0 else 0.0
            analysis[field] = {
                'accuracy': accuracy,
                'correct': stats['correct'],
                'total': stats['total']
            }
        
        return analysis
    
    def analyze_confidence_calibration(self) -> Dict[str, Any]:
        """Analyze confidence score calibration"""
        
        confidence_bins = defaultdict(list)
        
        for result in self.results:
            if result['status'] == 'success':
                extraction = result['extraction']
                validation = result['validation']
                
                confidence = extraction.get('confidence', 0.0)
                accuracy = validation['accuracy']
                
                # Bin confidence scores
                bin_idx = int(confidence * 10) / 10  # 0.0, 0.1, 0.2, ..., 1.0
                confidence_bins[bin_idx].append(accuracy)
        
        calibration = {}
        for conf_bin, accuracies in sorted(confidence_bins.items()):
            calibration[f"{conf_bin:.1f}"] = {
                'count': len(accuracies),
                'mean_accuracy': np.mean(accuracies),
                'expected_accuracy': conf_bin
            }
        
        return calibration
    
    def generate_analysis_report(self, output_path: Path):
        """Generate comprehensive analysis report"""
        
        analysis = {
            'by_document_type': self.analyze_by_document_type(),
            'by_field': self.analyze_by_field(),
            'confidence_calibration': self.analyze_confidence_calibration(),
            'overall_summary': self.report['summary']
        }
        
        with open(output_path, 'w') as f:
            json.dump(analysis, f, indent=2)
        
        # Print summary
        print("\n📊 Accuracy Analysis Report\n")
        
        print("By Document Type:")
        for doc_type, stats in analysis['by_document_type'].items():
            print(f"  {doc_type}:")
            print(f"    Count: {stats['count']}")
            print(f"    Mean: {stats['mean']:.2%}")
            print(f"    Std: {stats['std']:.2%}")
            print(f"    Range: {stats['min']:.2%} - {stats['max']:.2%}")
        
        print("\nBy Field:")
        sorted_fields = sorted(
            analysis['by_field'].items(),
            key=lambda x: x[1]['accuracy'],
            reverse=True
        )
        for field, stats in sorted_fields[:10]:  # Top 10
            print(f"  {field}: {stats['accuracy']:.2%} ({stats['correct']}/{stats['total']})")
        
        print(f"\n✅ Analysis report saved to: {output_path}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: ./measure_accuracy.py <report_path>")
        sys.exit(1)
    
    report_path = Path(sys.argv[1])
    
    if not report_path.exists():
        print(f"❌ Report not found: {report_path}")
        sys.exit(1)
    
    analyzer = AccuracyAnalyzer(report_path)
    
    output_path = report_path.parent / f"analysis_{report_path.stem}.json"
    analyzer.generate_analysis_report(output_path)
