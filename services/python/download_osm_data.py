"""
OpenStreetMap Data Download Script
===================================
Downloads street network and POI data for Nigerian cities.
"""

import osmnx as ox
import os
import json
from datetime import datetime

# Configure OSMnx
ox.settings.use_cache = True
ox.settings.log_console = True

# Nigerian cities to download
CITIES = {
    'lagos': {
        'name': 'Lagos, Nigeria',
        'bbox': (6.3936, 3.1792, 6.7028, 3.5792),  # (south, west, north, east)
        'center': (6.5244, 3.3792)
    },
    'abuja': {
        'name': 'Abuja, Nigeria',
        'bbox': (8.9139, 7.3478, 9.1828, 7.5928),
        'center': (9.0765, 7.3986)
    },
    'port_harcourt': {
        'name': 'Port Harcourt, Nigeria',
        'bbox': (4.7469, 6.9269, 4.8769, 7.0869),
        'center': (4.8156, 7.0498)
    }
}

# POI categories to download
POI_TAGS = {
    'amenity': ['school', 'hospital', 'bank', 'restaurant', 'cafe', 'pharmacy', 'police', 'fire_station'],
    'shop': ['supermarket', 'mall', 'convenience'],
    'leisure': ['park', 'playground', 'sports_centre'],
    'public_transport': ['station', 'stop_position'],
    'highway': ['bus_stop']
}


def download_street_network(city_key, city_info):
    """Download street network for a city"""
    print(f"\n📍 Downloading street network for {city_info['name']}...")
    
    try:
        # Download street network
        G = ox.graph_from_bbox(
            bbox=city_info['bbox'],
            network_type='drive',
            simplify=True
        )
        
        print(f"   ✅ Downloaded {len(G.nodes)} nodes and {len(G.edges)} edges")
        
        # Save as GraphML
        output_dir = f'/home/ubuntu/realestate-platform/services/python/osm_data/{city_key}'
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = f'{output_dir}/street_network.graphml'
        ox.save_graphml(G, filepath)
        print(f"   💾 Saved to {filepath}")
        
        # Calculate network statistics
        stats = {
            'num_nodes': len(G.nodes),
            'num_edges': len(G.edges),
            'avg_degree': sum(dict(G.degree()).values()) / len(G.nodes),
            'network_type': 'drive',
            'bbox': city_info['bbox'],
            'center': city_info['center']
        }
        
        return stats
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None


def download_pois(city_key, city_info):
    """Download Points of Interest for a city"""
    print(f"\n🏢 Downloading POIs for {city_info['name']}...")
    
    all_pois = []
    
    try:
        # Download POIs by category
        for category, values in POI_TAGS.items():
            for value in values:
                try:
                    pois = ox.features_from_bbox(
                        bbox=city_info['bbox'],
                        tags={category: value}
                    )
                    
                    if not pois.empty:
                        # Extract relevant info
                        for idx, poi in pois.iterrows():
                            poi_data = {
                                'category': category,
                                'type': value,
                                'name': poi.get('name', 'Unknown'),
                                'lat': poi.geometry.centroid.y if hasattr(poi.geometry, 'centroid') else None,
                                'lon': poi.geometry.centroid.x if hasattr(poi.geometry, 'centroid') else None
                            }
                            all_pois.append(poi_data)
                        
                        print(f"   ✅ {category}:{value} - {len(pois)} found")
                
                except Exception as e:
                    print(f"   ⚠️  {category}:{value} - {e}")
                    continue
        
        # Save POIs
        output_dir = f'/home/ubuntu/realestate-platform/services/python/osm_data/{city_key}'
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = f'{output_dir}/pois.json'
        with open(filepath, 'w') as f:
            json.dump(all_pois, f, indent=2)
        
        print(f"   💾 Saved {len(all_pois)} POIs to {filepath}")
        
        return {'num_pois': len(all_pois)}
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None


def download_transit_data(city_key, city_info):
    """Download public transit data"""
    print(f"\n🚌 Downloading transit data for {city_info['name']}...")
    
    try:
        # Download bus stops and stations
        transit = ox.features_from_bbox(
            bbox=city_info['bbox'],
            tags={'public_transport': True}
        )
        
        transit_data = []
        for idx, stop in transit.iterrows():
            stop_data = {
                'name': stop.get('name', 'Unknown'),
                'type': stop.get('public_transport', 'unknown'),
                'lat': stop.geometry.centroid.y if hasattr(stop.geometry, 'centroid') else None,
                'lon': stop.geometry.centroid.x if hasattr(stop.geometry, 'centroid') else None
            }
            transit_data.append(stop_data)
        
        # Save transit data
        output_dir = f'/home/ubuntu/realestate-platform/services/python/osm_data/{city_key}'
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = f'{output_dir}/transit.json'
        with open(filepath, 'w') as f:
            json.dump(transit_data, f, indent=2)
        
        print(f"   💾 Saved {len(transit_data)} transit stops to {filepath}")
        
        return {'num_stops': len(transit_data)}
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return None


def main():
    """Main download function"""
    print("=" * 70)
    print("OpenStreetMap Data Download for Nigerian Cities")
    print("=" * 70)
    
    results = {}
    
    for city_key, city_info in CITIES.items():
        print(f"\n{'=' * 70}")
        print(f"Processing: {city_info['name']}")
        print(f"{'=' * 70}")
        
        city_results = {}
        
        # Download street network
        network_stats = download_street_network(city_key, city_info)
        if network_stats:
            city_results['network'] = network_stats
        
        # Download POIs
        poi_stats = download_pois(city_key, city_info)
        if poi_stats:
            city_results['pois'] = poi_stats
        
        # Download transit
        transit_stats = download_transit_data(city_key, city_info)
        if transit_stats:
            city_results['transit'] = transit_stats
        
        results[city_key] = city_results
    
    # Save summary
    summary_path = '/home/ubuntu/realestate-platform/services/python/osm_data/download_summary.json'
    summary = {
        'download_date': datetime.now().isoformat(),
        'cities': results
    }
    
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\n{'=' * 70}")
    print("✅ Download complete!")
    print(f"💾 Summary saved to {summary_path}")
    print(f"{'=' * 70}\n")
    
    # Print summary
    for city_key, city_data in results.items():
        print(f"\n{CITIES[city_key]['name']}:")
        if 'network' in city_data:
            print(f"  - Street network: {city_data['network']['num_nodes']} nodes, {city_data['network']['num_edges']} edges")
        if 'pois' in city_data:
            print(f"  - POIs: {city_data['pois']['num_pois']} locations")
        if 'transit' in city_data:
            print(f"  - Transit stops: {city_data['transit']['num_stops']} stops")


if __name__ == '__main__':
    main()
