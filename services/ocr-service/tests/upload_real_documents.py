#!/usr/bin/env python3
"""
Real Document Upload and Validation Script

This script uploads real documents to the OCR service and validates the extraction results.
Supports batch processing and generates detailed accuracy reports.
"""

import asyncio
import aiohttp
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import csv

class DocumentUploader:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[Dict[str, Any]] = []
        
    async def upload_document(
        self,
        session: aiohttp.ClientSession,
        file_path: Path,
        document_type: str,
        expected_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Upload a single document and validate extraction"""
        
        try:
            # Upload document
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=file_path.name)
                data.add_field('document_type', document_type)
                
                async with session.post(
                    f"{self.base_url}/api/v1/extract",
                    data=data
                ) as resp:
                    if resp.status != 200:
                        return {
                            'file': file_path.name,
                            'status': 'error',
                            'error': await resp.text()
                        }
                    
                    result = await resp.json()
            
            # Validate extraction
            validation = self._validate_extraction(result, expected_data)
            
            return {
                'file': file_path.name,
                'document_type': document_type,
                'status': 'success',
                'extraction': result,
                'validation': validation,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'file': file_path.name,
                'status': 'error',
                'error': str(e)
            }
    
    def _validate_extraction(
        self,
        result: Dict[str, Any],
        expected: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate extraction results against expected data"""
        
        validation = {
            'fields_matched': 0,
            'fields_total': len(expected),
            'accuracy': 0.0,
            'errors': []
        }
        
        extracted = result.get('data', {})
        
        for field, expected_value in expected.items():
            extracted_value = extracted.get(field)
            
            if extracted_value is None:
                validation['errors'].append({
                    'field': field,
                    'error': 'Field not extracted',
                    'expected': expected_value
                })
                continue
            
            # Normalize values for comparison
            extracted_norm = str(extracted_value).strip().lower()
            expected_norm = str(expected_value).strip().lower()
            
            # Calculate similarity
            similarity = self._calculate_similarity(extracted_norm, expected_norm)
            
            if similarity >= 0.85:  # 85% threshold
                validation['fields_matched'] += 1
            else:
                validation['errors'].append({
                    'field': field,
                    'error': 'Value mismatch',
                    'expected': expected_value,
                    'extracted': extracted_value,
                    'similarity': similarity
                })
        
        validation['accuracy'] = (
            validation['fields_matched'] / validation['fields_total']
            if validation['fields_total'] > 0 else 0.0
        )
        
        return validation
    
    @staticmethod
    def _calculate_similarity(s1: str, s2: str) -> float:
        """Calculate Levenshtein similarity between two strings"""
        if s1 == s2:
            return 1.0
        
        len1, len2 = len(s1), len(s2)
        if len1 == 0 or len2 == 0:
            return 0.0
        
        # Levenshtein distance
        dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        
        for i in range(len1 + 1):
            dp[i][0] = i
        for j in range(len2 + 1):
            dp[0][j] = j
        
        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i-1] == s2[j-1] else 1
                dp[i][j] = min(
                    dp[i-1][j] + 1,      # deletion
                    dp[i][j-1] + 1,      # insertion
                    dp[i-1][j-1] + cost  # substitution
                )
        
        distance = dp[len1][len2]
        max_len = max(len1, len2)
        
        return 1.0 - (distance / max_len)
    
    async def batch_upload(
        self,
        documents: List[Dict[str, Any]],
        max_concurrent: int = 5
    ):
        """Upload multiple documents concurrently"""
        
        async with aiohttp.ClientSession() as session:
            semaphore = asyncio.Semaphore(max_concurrent)
            
            async def upload_with_semaphore(doc):
                async with semaphore:
                    return await self.upload_document(
                        session,
                        Path(doc['file_path']),
                        doc['document_type'],
                        doc['expected_data']
                    )
            
            tasks = [upload_with_semaphore(doc) for doc in documents]
            self.results = await asyncio.gather(*tasks)
    
    def generate_report(self, output_path: Path):
        """Generate detailed accuracy report"""
        
        # Calculate overall statistics
        total = len(self.results)
        successful = sum(1 for r in self.results if r['status'] == 'success')
        failed = total - successful
        
        accuracies = [
            r['validation']['accuracy']
            for r in self.results
            if r['status'] == 'success'
        ]
        
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0.0
        
        # Generate report
        report = {
            'summary': {
                'total_documents': total,
                'successful': successful,
                'failed': failed,
                'average_accuracy': avg_accuracy,
                'timestamp': datetime.now().isoformat()
            },
            'results': self.results
        }
        
        # Save JSON report
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Save CSV summary
        csv_path = output_path.with_suffix('.csv')
        with open(csv_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'File', 'Document Type', 'Status', 'Accuracy',
                'Fields Matched', 'Fields Total', 'Errors'
            ])
            
            for result in self.results:
                if result['status'] == 'success':
                    val = result['validation']
                    writer.writerow([
                        result['file'],
                        result['document_type'],
                        result['status'],
                        f"{val['accuracy']:.2%}",
                        val['fields_matched'],
                        val['fields_total'],
                        len(val['errors'])
                    ])
                else:
                    writer.writerow([
                        result['file'],
                        result.get('document_type', 'unknown'),
                        result['status'],
                        'N/A',
                        'N/A',
                        'N/A',
                        result.get('error', 'Unknown error')
                    ])
        
        print(f"\n✅ Report generated:")
        print(f"  JSON: {output_path}")
        print(f"  CSV:  {csv_path}")
        print(f"\n📊 Summary:")
        print(f"  Total documents: {total}")
        print(f"  Successful: {successful}")
        print(f"  Failed: {failed}")
        print(f"  Average accuracy: {avg_accuracy:.2%}")


async def main():
    """Main execution function"""
    
    # Load test documents configuration
    config_path = Path(__file__).parent / 'real_documents_config.json'
    
    if not config_path.exists():
        print(f"❌ Configuration file not found: {config_path}")
        print("\nCreate a configuration file with the following format:")
        print('''
{
  "documents": [
    {
      "file_path": "/path/to/nigerian_passport_001.jpg",
      "document_type": "nigerian_passport",
      "expected_data": {
        "passport_number": "A12345678",
        "surname": "OKONKWO",
        "given_names": "CHINUA ACHEBE",
        "date_of_birth": "1990-05-15",
        "nationality": "NIGERIAN"
      }
    }
  ]
}
        ''')
        return
    
    with open(config_path) as f:
        config = json.load(f)
    
    # Create uploader
    uploader = DocumentUploader(base_url="http://localhost:8000")
    
    print(f"📤 Uploading {len(config['documents'])} documents...")
    
    # Upload documents
    await uploader.batch_upload(config['documents'], max_concurrent=5)
    
    # Generate report
    report_path = Path(__file__).parent / 'reports' / f"accuracy_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path.parent.mkdir(exist_ok=True)
    
    uploader.generate_report(report_path)


if __name__ == '__main__':
    asyncio.run(main())
