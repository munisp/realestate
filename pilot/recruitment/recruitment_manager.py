#!/usr/bin/env python3
"""
Pilot Recruitment Campaign Automation
Manages host recruitment, application tracking, and scoring
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from dataclasses import dataclass, asdict

@dataclass
class HostApplication:
    id: str
    name: str
    email: str
    phone: str
    property_count: int
    property_locations: List[str]
    property_types: List[str]
    tech_proficiency: int  # 1-5 scale
    response_time: str
    social_media_following: int
    referral_source: str
    submitted_at: str
    status: str  # pending, shortlisted, accepted, rejected
    score: float
    notes: str

class RecruitmentManager:
    def __init__(self, base_dir: str = "./recruitment-data"):
        self.base_dir = Path(base_dir)
        self.applications_dir = self.base_dir / "applications"
        self.index_file = self.base_dir / "applications-index.json"
        
        self.applications_dir.mkdir(parents=True, exist_ok=True)
    
    def submit_application(self, application_data: Dict) -> str:
        """Submit a new host application"""
        
        # Generate application ID
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        app_id = f"APP-{timestamp}"
        
        # Calculate score
        score = self._calculate_score(application_data)
        
        # Create application
        application = HostApplication(
            id=app_id,
            name=application_data["name"],
            email=application_data["email"],
            phone=application_data["phone"],
            property_count=application_data["property_count"],
            property_locations=application_data["property_locations"],
            property_types=application_data["property_types"],
            tech_proficiency=application_data["tech_proficiency"],
            response_time=application_data.get("response_time", "unknown"),
            social_media_following=application_data.get("social_media_following", 0),
            referral_source=application_data.get("referral_source", "direct"),
            submitted_at=datetime.utcnow().isoformat(),
            status="pending",
            score=score,
            notes=""
        )
        
        # Save application
        app_file = self.applications_dir / f"{app_id}.json"
        with open(app_file, 'w') as f:
            json.dump(asdict(application), f, indent=2)
        
        # Update index
        self._update_index(application)
        
        print(f"✅ Application submitted: {app_id} (Score: {score:.1f}/100)")
        return app_id
    
    def _calculate_score(self, data: Dict) -> float:
        """Calculate application score (0-100)"""
        
        score = 0.0
        
        # Property Quality (30 points)
        # Premium locations: Lekki, Victoria Island, Ikoyi
        premium_locations = ["lekki", "victoria island", "ikoyi"]
        location_score = sum(
            10 for loc in data["property_locations"]
            if any(premium in loc.lower() for premium in premium_locations)
        )
        score += min(location_score, 30)
        
        # Host Responsiveness (25 points)
        response_map = {
            "< 1 hour": 25,
            "1-2 hours": 20,
            "2-4 hours": 15,
            "4-8 hours": 10,
            "> 8 hours": 5,
            "unknown": 0
        }
        score += response_map.get(data.get("response_time", "unknown"), 0)
        
        # Tech Proficiency (20 points)
        score += data.get("tech_proficiency", 1) * 4
        
        # Commitment Level (15 points)
        # Based on property count and types
        if data["property_count"] >= 3:
            score += 15
        elif data["property_count"] == 2:
            score += 10
        else:
            score += 5
        
        # Network Effect (10 points)
        # Social media following
        following = data.get("social_media_following", 0)
        if following >= 5000:
            score += 10
        elif following >= 1000:
            score += 7
        elif following >= 500:
            score += 4
        
        return min(score, 100.0)
    
    def _update_index(self, application: HostApplication):
        """Update applications index"""
        
        if self.index_file.exists():
            with open(self.index_file) as f:
                index = json.load(f)
        else:
            index = {"applications": [], "stats": {}}
        
        # Add or update application
        existing = [a for a in index["applications"] if a["id"] == application.id]
        if existing:
            index["applications"] = [a for a in index["applications"] if a["id"] != application.id]
        
        index["applications"].append(asdict(application))
        
        # Update stats
        stats = {
            "total": len(index["applications"]),
            "pending": len([a for a in index["applications"] if a["status"] == "pending"]),
            "shortlisted": len([a for a in index["applications"] if a["status"] == "shortlisted"]),
            "accepted": len([a for a in index["applications"] if a["status"] == "accepted"]),
            "rejected": len([a for a in index["applications"] if a["status"] == "rejected"]),
            "average_score": sum(a["score"] for a in index["applications"]) / len(index["applications"])
        }
        
        index["stats"] = stats
        index["last_updated"] = datetime.utcnow().isoformat()
        
        with open(self.index_file, 'w') as f:
            json.dump(index, f, indent=2)
    
    def get_shortlist(self, min_score: float = 70.0, limit: int = 15) -> List[HostApplication]:
        """Get shortlisted applications"""
        
        if not self.index_file.exists():
            return []
        
        with open(self.index_file) as f:
            index = json.load(f)
        
        # Filter by score and sort
        qualified = [
            HostApplication(**a)
            for a in index["applications"]
            if a["score"] >= min_score
        ]
        
        qualified.sort(key=lambda x: x.score, reverse=True)
        
        return qualified[:limit]
    
    def update_status(self, app_id: str, status: str, notes: str = ""):
        """Update application status"""
        
        app_file = self.applications_dir / f"{app_id}.json"
        
        if not app_file.exists():
            print(f"Application {app_id} not found")
            return
        
        with open(app_file) as f:
            app_data = json.load(f)
        
        app_data["status"] = status
        if notes:
            app_data["notes"] = notes
        
        with open(app_file, 'w') as f:
            json.dump(app_data, f, indent=2)
        
        # Update index
        application = HostApplication(**app_data)
        self._update_index(application)
        
        print(f"✅ Updated {app_id} status to: {status}")
    
    def generate_report(self):
        """Generate recruitment report"""
        
        if not self.index_file.exists():
            print("No applications yet")
            return
        
        with open(self.index_file) as f:
            index = json.load(f)
        
        stats = index["stats"]
        
        print("\n" + "="*60)
        print("Recruitment Campaign Report")
        print("="*60)
        print(f"Total Applications: {stats['total']}")
        print(f"Average Score: {stats['average_score']:.1f}/100")
        print(f"\nStatus Breakdown:")
        print(f"  Pending: {stats['pending']}")
        print(f"  Shortlisted: {stats['shortlisted']}")
        print(f"  Accepted: {stats['accepted']}")
        print(f"  Rejected: {stats['rejected']}")
        
        # Top applicants
        shortlist = self.get_shortlist(limit=10)
        
        print(f"\nTop 10 Applicants:")
        for i, app in enumerate(shortlist, 1):
            print(f"  {i}. {app.name} ({app.email})")
            print(f"     Score: {app.score:.1f}/100")
            print(f"     Properties: {app.property_count} in {', '.join(app.property_locations)}")
            print(f"     Status: {app.status}")
            print()
        
        print("="*60 + "\n")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Recruitment Management Tool")
    parser.add_argument("--submit", action="store_true", help="Submit new application")
    parser.add_argument("--data", help="Application data JSON file")
    parser.add_argument("--shortlist", action="store_true", help="Show shortlist")
    parser.add_argument("--update-status", help="Application ID to update")
    parser.add_argument("--status", help="New status")
    parser.add_argument("--report", action="store_true", help="Generate report")
    
    args = parser.parse_args()
    
    manager = RecruitmentManager()
    
    if args.submit and args.data:
        with open(args.data) as f:
            data = json.load(f)
        manager.submit_application(data)
    
    if args.shortlist:
        shortlist = manager.get_shortlist()
        print(f"\nShortlisted Applicants ({len(shortlist)}):")
        for app in shortlist:
            print(f"  {app.id}: {app.name} (Score: {app.score:.1f}/100)")
    
    if args.update_status and args.status:
        manager.update_status(args.update_status, args.status)
    
    if args.report:
        manager.generate_report()

if __name__ == "__main__":
    main()
