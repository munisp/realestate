// @ts-nocheck
/**
 * Marker Clustering for MapLibre GL JS
 * Implements supercluster-based clustering for property markers
 */

import Supercluster from 'supercluster';
import { Map } from 'maplibre-gl';
import { createPropertyMarker, createClusterMarker } from './propertyMarkers';

export interface PropertyMarkerData {
  id: string | number;
  lng: number;
  lat: number;
  title?: string;
  price?: number;
  propertyType?: 'residential' | 'commercial' | 'land' | 'industrial';
  onClick?: () => void;
}

export interface ClusteringOptions {
  radius?: number; // Cluster radius in pixels (default: 60)
  maxZoom?: number; // Max zoom to cluster points on (default: 16)
  minZoom?: number; // Min zoom to cluster points on (default: 0)
  minPoints?: number; // Minimum points to form a cluster (default: 2)
}

/**
 * Marker Clustering Manager
 * Handles clustering logic and marker rendering
 */
export class MarkerClusteringManager {
  private map: Map;
  private supercluster: Supercluster;
  private markers: Map<string, maplibregl.Marker> = new Map();
  private properties: PropertyMarkerData[] = [];
  private options: Required<ClusteringOptions>;

  constructor(map: Map, options: ClusteringOptions = {}) {
    this.map = map;
    this.options = {
      radius: options.radius ?? 60,
      maxZoom: options.maxZoom ?? 16,
      minZoom: options.minZoom ?? 0,
      minPoints: options.minPoints ?? 2,
    };

    // Initialize supercluster
    this.supercluster = new Supercluster({
      radius: this.options.radius,
      maxZoom: this.options.maxZoom,
      minZoom: this.options.minZoom,
      minPoints: this.options.minPoints,
    });

    // Update markers on map move
    this.map.on('moveend', () => this.updateMarkers());
    this.map.on('zoomend', () => this.updateMarkers());
  }

  /**
   * Set properties to cluster
   */
  setProperties(properties: PropertyMarkerData[]) {
    this.properties = properties;

    // Convert to GeoJSON features
    const features = properties.map((prop) => ({
      type: 'Feature' as const,
      properties: prop,
      geometry: {
        type: 'Point' as const,
        coordinates: [prop.lng, prop.lat],
      },
    }));

    // Load into supercluster
    this.supercluster.load(features);

    // Update markers
    this.updateMarkers();
  }

  /**
   * Update visible markers based on current map bounds and zoom
   */
  private updateMarkers() {
    const bounds = this.map.getBounds();
    const zoom = Math.floor(this.map.getZoom());

    // Get clusters and points in current viewport
    const clusters = this.supercluster.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    );

    // Track which markers should be visible
    const visibleMarkerIds = new Set<string>();

    // Process each cluster/point
    clusters.forEach((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const properties = cluster.properties as any;

      if (cluster.properties.cluster) {
        // This is a cluster
        const clusterId = `cluster-${cluster.id}`;
        visibleMarkerIds.add(clusterId);

        // Get or create cluster marker
        let marker = this.markers.get(clusterId);
        if (!marker) {
          const clusterSize = properties.point_count;
          const clusterProperties = this.supercluster.getLeaves(cluster.id as number, Infinity);
          
          // Calculate average price
          const prices = clusterProperties
            .map((p: any) => p.properties.price)
            .filter((p: number) => p > 0);
          const avgPrice = prices.length > 0
            ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
            : undefined;

          const el = createClusterMarker(clusterSize, avgPrice);

          // Click to zoom into cluster
          el.addEventListener('click', () => {
            const expansionZoom = this.supercluster.getClusterExpansionZoom(cluster.id as number);
            this.map.easeTo({
              center: [lng, lat],
              zoom: Math.min(expansionZoom, this.options.maxZoom + 1),
            });
          });

          marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(this.map);

          this.markers.set(clusterId, marker);
        }
      } else {
        // This is an individual point
        const pointId = `point-${properties.id}`;
        visibleMarkerIds.add(pointId);

        // Get or create point marker
        let marker = this.markers.get(pointId);
        if (!marker) {
          const el = createPropertyMarker(
            properties.propertyType || 'residential',
            properties.price
          );

          // Add popup
          if (properties.title || properties.price) {
            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
              <div style="padding: 8px;">
                ${properties.title ? `<h3 style="margin: 0 0 4px 0; font-weight: 600;">${properties.title}</h3>` : ''}
                ${properties.price ? `<p style="margin: 0; color: #3b82f6; font-weight: 600;">₦${properties.price.toLocaleString()}</p>` : ''}
              </div>
            `);

            marker = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .setPopup(popup)
              .addTo(this.map);
          } else {
            marker = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .addTo(this.map);
          }

          // Add click handler
          if (properties.onClick) {
            el.addEventListener('click', properties.onClick);
          }

          this.markers.set(pointId, marker);
        }
      }
    });

    // Remove markers that are no longer visible
    this.markers.forEach((marker, id) => {
      if (!visibleMarkerIds.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    });
  }

  /**
   * Clear all markers
   */
  clear() {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.properties = [];
    this.supercluster.load([]);
  }

  /**
   * Destroy the clustering manager
   */
  destroy() {
    this.clear();
    this.map.off('moveend', () => this.updateMarkers());
    this.map.off('zoomend', () => this.updateMarkers());
  }
}

// Import maplibregl for type definitions
import maplibregl from 'maplibre-gl';
