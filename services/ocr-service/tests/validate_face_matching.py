#!/usr/bin/env python3
"""
Face Matching Validation Framework

Validates face matching accuracy using real selfie-document pairs.
Measures false positive/negative rates and optimal threshold tuning.
"""

import asyncio
import aiohttp
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from datetime import datetime
import numpy as np
from sklearn.metrics import roc_curve, auc, confusion_matrix

class FaceMatchingValidator:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[Dict[str, Any]] = []
    
    async def validate_face_match(
        self,
        session: aiohttp.ClientSession,
        document_path: Path,
        selfie_path: Path,
        is_match: bool,
        person_id: str
    ) -> Dict[str, Any]:
        """Validate a single face match pair"""
        
        try:
            # Upload document and selfie
            with open(document_path, 'rb') as doc_file, \
                 open(selfie_path, 'rb') as selfie_file:
                
                data = aiohttp.FormData()
                data.add_field('document', doc_file, filename=document_path.name)
                data.add_field('selfie', selfie_file, filename=selfie_path.name)
                
                async with session.post(
                    f"{self.base_url}/api/v1/verify/face-match",
                    data=data
                ) as resp:
                    if resp.status != 200:
                        return {
                            'person_id': person_id,
                            'status': 'error',
                            'error': await resp.text()
                        }
                    
                    result = await resp.json()
            
            # Extract results
            match_score = result.get('similarity', 0.0)
            is_match_predicted = result.get('is_match', False)
            confidence = result.get('confidence', 0.0)
            
            return {
                'person_id': person_id,
                'document': document_path.name,
                'selfie': selfie_path.name,
                'ground_truth': is_match,
                'predicted': is_match_predicted,
                'match_score': match_score,
                'confidence': confidence,
                'correct': is_match == is_match_predicted,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'person_id': person_id,
                'status': 'error',
                'error': str(e)
            }
    
    async def batch_validate(
        self,
        pairs: List[Dict[str, Any]],
        max_concurrent: int = 5
    ):
        """Validate multiple face match pairs"""
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def validate_with_semaphore(pair):
                async with semaphore:
                    return await self.validate_face_match(
                        session,
                        Path(pair['document_path']),
                        Path(pair['selfie_path']),
                        pair['is_match'],
                        pair['person_id']
                    )
            
            tasks = [validate_with_semaphore(pair) for pair in pairs]
            self.results = await asyncio.gather(*tasks)
    
    def calculate_metrics(self) -> Dict[str, Any]:
        """Calculate comprehensive metrics"""
        
        # Filter successful results
        valid_results = [r for r in self.results if r.get('status') != 'error']
        
        if not valid_results:
            return {'error': 'No valid results'}
        
        # Extract ground truth and predictions
        y_true = [r['ground_truth'] for r in valid_results]
        y_pred = [r['predicted'] for r in valid_results]
        scores = [r['match_score'] for r in valid_results]
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        # Calculate metrics
        accuracy = (tp + tn) / (tp + tn + fp + fn)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        
        # ROC curve
        fpr_curve, tpr_curve, thresholds = roc_curve(y_true, scores)
        roc_auc = auc(fpr_curve, tpr_curve)
        
        # Find optimal threshold (Youden's index)
        youden_index = tpr_curve - fpr_curve
        optimal_idx = np.argmax(youden_index)
        optimal_threshold = thresholds[optimal_idx]
        
        return {
            'total_pairs': len(valid_results),
            'true_matches': sum(y_true),
            'true_non_matches': len(y_true) - sum(y_true),
            'confusion_matrix': {
                'true_positive': int(tp),
                'true_negative': int(tn),
                'false_positive': int(fp),
                'false_negative': int(fn)
            },
            'metrics': {
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'false_positive_rate': fpr,
                'false_negative_rate': fnr,
                'roc_auc': roc_auc
            },
            'threshold_analysis': {
                'current_threshold': 0.6,  # Default threshold
                'optimal_threshold': float(optimal_threshold),
                'optimal_tpr': float(tpr_curve[optimal_idx]),
                'optimal_fpr': float(fpr_curve[optimal_idx])
            },
            'roc_curve': {
                'fpr': fpr_curve.tolist(),
                'tpr': tpr_curve.tolist(),
                'thresholds': thresholds.tolist()
            }
        }
    
    def generate_report(self, output_path: Path):
        """Generate face matching validation report"""
        
        metrics = self.calculate_metrics()
        
        report = {
            'summary': metrics,
            'results': self.results,
            'timestamp': datetime.now().isoformat()
        }
        
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n👤 Face Matching Validation Report\n")
        
        if 'error' in metrics:
            print(f"❌ {metrics['error']}")
            return
        
        print(f"Total pairs tested: {metrics['total_pairs']}")
        print(f"  True matches: {metrics['true_matches']}")
        print(f"  True non-matches: {metrics['true_non_matches']}")
        
        print("\nConfusion Matrix:")
        cm = metrics['confusion_matrix']
        print(f"  True Positive:  {cm['true_positive']}")
        print(f"  True Negative:  {cm['true_negative']}")
        print(f"  False Positive: {cm['false_positive']}")
        print(f"  False Negative: {cm['false_negative']}")
        
        print("\nMetrics:")
        m = metrics['metrics']
        print(f"  Accuracy:  {m['accuracy']:.2%}")
        print(f"  Precision: {m['precision']:.2%}")
        print(f"  Recall:    {m['recall']:.2%}")
        print(f"  F1 Score:  {m['f1_score']:.2%}")
        print(f"  FPR:       {m['false_positive_rate']:.2%}")
        print(f"  FNR:       {m['false_negative_rate']:.2%}")
        print(f"  ROC AUC:   {m['roc_auc']:.4f}")
        
        print("\nThreshold Analysis:")
        t = metrics['threshold_analysis']
        print(f"  Current threshold: {t['current_threshold']}")
        print(f"  Optimal threshold: {t['optimal_threshold']:.4f}")
        print(f"  At optimal: TPR={t['optimal_tpr']:.2%}, FPR={t['optimal_fpr']:.2%}")
        
        print(f"\n✅ Report saved to: {output_path}")


async def main():
    """Main execution function"""
    
    # Load test pairs configuration
    config_path = Path(__file__).parent / 'face_match_config.json'
    
    if not config_path.exists():
        print(f"❌ Configuration file not found: {config_path}")
        print("\nCreate a configuration file with the following format:")
        print('''
{
  "pairs": [
    {
      "person_id": "person_001",
      "document_path": "/path/to/passport_001.jpg",
      "selfie_path": "/path/to/selfie_001.jpg",
      "is_match": true
    },
    {
      "person_id": "person_001",
      "document_path": "/path/to/passport_001.jpg",
      "selfie_path": "/path/to/selfie_002.jpg",
      "is_match": false
    }
  ]
}
        ''')
        return
    
    with open(config_path) as f:
        config = json.load(f)
    
    # Create validator
    validator = FaceMatchingValidator(base_url="http://localhost:8000")
    
    print(f"👤 Validating {len(config['pairs'])} face match pairs...")
    
    # Validate pairs
    await validator.batch_validate(config['pairs'], max_concurrent=5)
    
    # Generate report
    report_path = Path(__file__).parent / 'reports' / f"face_match_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path.parent.mkdir(exist_ok=True)
    
    validator.generate_report(report_path)


if __name__ == '__main__':
    asyncio.run(main())
