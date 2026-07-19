#!/usr/bin/env python3
"""
Automated Test Data Collection Workflow
Organizes and validates document samples for OCR testing
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class DocumentSample:
    id: str
    document_type: str  # passport, nin, international_id
    country: str
    file_path: str
    ground_truth_path: str
    face_image_path: str
    collected_at: str
    metadata: Dict

class TestDataCollector:
    def __init__(self, base_dir: str = "./test-data"):
        self.base_dir = Path(base_dir)
        self.samples_dir = self.base_dir / "samples"
        self.ground_truth_dir = self.base_dir / "ground-truth"
        self.faces_dir = self.base_dir / "faces"
        self.index_file = self.base_dir / "index.json"
        
        # Create directories
        for dir_path in [self.samples_dir, self.ground_truth_dir, self.faces_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def add_sample(
        self,
        document_path: str,
        ground_truth: Dict,
        face_path: str,
        document_type: str,
        country: str = "NG",
        metadata: Dict = None
    ) -> str:
        """Add a new document sample to the test dataset"""
        
        # Generate unique ID
        doc_hash = hashlib.md5(Path(document_path).read_bytes()).hexdigest()[:8]
        sample_id = f"{document_type}_{country}_{doc_hash}"
        
        # Copy files to organized structure
        doc_ext = Path(document_path).suffix
        new_doc_path = self.samples_dir / f"{sample_id}{doc_ext}"
        new_face_path = self.faces_dir / f"{sample_id}_face.jpg"
        gt_path = self.ground_truth_dir / f"{sample_id}.json"
        
        # Copy document
        import shutil
        shutil.copy(document_path, new_doc_path)
        shutil.copy(face_path, new_face_path)
        
        # Save ground truth
        with open(gt_path, 'w') as f:
            json.dump(ground_truth, f, indent=2)
        
        # Create sample record
        sample = DocumentSample(
            id=sample_id,
            document_type=document_type,
            country=country,
            file_path=str(new_doc_path.relative_to(self.base_dir)),
            ground_truth_path=str(gt_path.relative_to(self.base_dir)),
            face_image_path=str(new_face_path.relative_to(self.base_dir)),
            collected_at=datetime.utcnow().isoformat(),
            metadata=metadata or {}
        )
        
        # Update index
        self._update_index(sample)
        
        print(f"✅ Added sample: {sample_id}")
        return sample_id
    
    def _update_index(self, sample: DocumentSample):
        """Update the master index file"""
        
        # Load existing index
        if self.index_file.exists():
            with open(self.index_file) as f:
                index = json.load(f)
        else:
            index = {"samples": [], "stats": {}}
        
        # Add or update sample
        existing = [s for s in index["samples"] if s["id"] == sample.id]
        if existing:
            index["samples"] = [s for s in index["samples"] if s["id"] != sample.id]
        
        index["samples"].append(asdict(sample))
        
        # Update stats
        stats = {}
        for s in index["samples"]:
            doc_type = s["document_type"]
            country = s["country"]
            key = f"{doc_type}_{country}"
            stats[key] = stats.get(key, 0) + 1
        
        index["stats"] = stats
        index["total_samples"] = len(index["samples"])
        index["last_updated"] = datetime.utcnow().isoformat()
        
        # Save index
        with open(self.index_file, 'w') as f:
            json.dump(index, f, indent=2)
    
    def get_samples(
        self,
        document_type: str = None,
        country: str = None
    ) -> List[DocumentSample]:
        """Get samples matching criteria"""
        
        if not self.index_file.exists():
            return []
        
        with open(self.index_file) as f:
            index = json.load(f)
        
        samples = index["samples"]
        
        if document_type:
            samples = [s for s in samples if s["document_type"] == document_type]
        
        if country:
            samples = [s for s in samples if s["country"] == country]
        
        return [DocumentSample(**s) for s in samples]
    
    def print_stats(self):
        """Print collection statistics"""
        
        if not self.index_file.exists():
            print("No samples collected yet")
            return
        
        with open(self.index_file) as f:
            index = json.load(f)
        
        print("\n" + "="*50)
        print("Test Data Collection Statistics")
        print("="*50)
        print(f"Total Samples: {index['total_samples']}")
        print(f"Last Updated: {index['last_updated']}")
        print("\nBreakdown by Type:")
        
        for key, count in sorted(index["stats"].items()):
            print(f"  {key}: {count}")
        
        print("="*50 + "\n")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Data Collection Tool")
    parser.add_argument("--add", action="store_true", help="Add a new sample")
    parser.add_argument("--document", help="Path to document image")
    parser.add_argument("--face", help="Path to face image")
    parser.add_argument("--type", choices=["passport", "nin", "international_id"], help="Document type")
    parser.add_argument("--country", default="NG", help="Country code")
    parser.add_argument("--ground-truth", help="Path to ground truth JSON file")
    parser.add_argument("--stats", action="store_true", help="Show statistics")
    parser.add_argument("--list", action="store_true", help="List all samples")
    
    args = parser.parse_args()
    
    collector = TestDataCollector()
    
    if args.add:
        if not all([args.document, args.face, args.type, args.ground_truth]):
            print("Error: --add requires --document, --face, --type, and --ground-truth")
            return
        
        with open(args.ground_truth) as f:
            ground_truth = json.load(f)
        
        collector.add_sample(
            document_path=args.document,
            ground_truth=ground_truth,
            face_path=args.face,
            document_type=args.type,
            country=args.country
        )
    
    if args.stats or args.list:
        collector.print_stats()
    
    if args.list:
        samples = collector.get_samples()
        print("Samples:")
        for sample in samples:
            print(f"  {sample.id} ({sample.document_type}, {sample.country})")

if __name__ == "__main__":
    main()
