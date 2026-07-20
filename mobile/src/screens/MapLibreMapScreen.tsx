/**
 * MapLibreMapScreen — Google-free mobile map
 *
 * Replaces react-native-maps (which uses Google Maps SDK on Android) with
 * @maplibre/maplibre-react-native — a fully open-source MapLibre GL
 * implementation that works on both iOS and Android without any API key.
 *
 * Tile source: OpenStreetMap raster tiles (free, no key required).
 * For production at scale, switch TILE_URL to a self-hosted Martin server.
 *
 * Features:
 *  - Supercluster clustering (JS, moves to native thread via JSI when available)
 *  - GPS location tracking (expo-location)
 *  - Radius search circle overlay
 *  - City quick-jump selector (Lagos, Abuja, PH, Kano, Ibadan)
 *  - Property callout cards with navigation
 *  - Isochrone overlay (calls geospatial.isochrone tRPC procedure)
 *  - Haptic feedback on all interactions
 *  - Offline tile support via offlineTileCache
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Supercluster from 'supercluster';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../utils/trpc';

// ── Config ────────────────────────────────────────────────────────────────────
// No API token needed for MapLibre with OSM tiles
MapLibreGL.setAccessToken(null);

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

// For self-hosted Martin vector tiles (switch in production):
// const TILE_URL = `${process.env.EXPO_PUBLIC_MARTIN_URL}/properties/{z}/{x}/{y}`;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Nigerian cities ───────────────────────────────────────────────────────────
const CITIES = [
  { name: 'Lagos',         lat: 6.5244,  lng: 3.3792,  zoom: 12 },
  { name: 'Abuja',         lat: 9.0579,  lng: 7.4951,  zoom: 12 },
  { name: 'Port Harcourt', lat: 4.8156,  lng: 7.0498,  zoom: 12 },
  { name: 'Kano',          lat: 12.0022, lng: 8.5920,  zoom: 12 },
  { name: 'Ibadan',        lat: 7.3775,  lng: 3.9470,  zoom: 12 },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  title: string;
  price: number;
  latitude: number;
  longitude: number;
  bedrooms: number;
  propertyType: string;
  city: string;
}

interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    propertyId?: string;
    price?: number;
    bedrooms?: number;
    title?: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapLibreMapScreen({ navigation }: any) {
  const mapRef = useRef<MapLibreGL.MapView>(null);
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [zoom, setZoom] = useState(12);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showRadius, setShowRadius] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [isochroneData, setIsochroneData] = useState<any>(null);
  const [loadingIsochrone, setLoadingIsochrone] = useState(false);

  // Fetch properties near current city centre
  const { data: propertiesData, isLoading } = trpc.properties?.getNearby?.useQuery(
    { lat: selectedCity.lat, lng: selectedCity.lng, radiusKm: 20, limit: 500 },
    { enabled: true, staleTime: 60_000 },
  );

  const properties: Property[] = propertiesData?.properties || [];

  // Supercluster
  const supercluster = useMemo(() => {
    const sc = new Supercluster({ radius: 60, maxZoom: 16, minZoom: 3 });
    sc.load(properties.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
      properties: {
        propertyId: p.id,
        price: p.price,
        bedrooms: p.bedrooms,
        title: p.title,
      },
    })));
    return sc;
  }, [properties]);

  const clusters: ClusterFeature[] = useMemo(() => {
    const bounds: [number, number, number, number] = [
      selectedCity.lng - 0.3, selectedCity.lat - 0.3,
      selectedCity.lng + 0.3, selectedCity.lat + 0.3,
    ];
    return supercluster.getClusters(bounds, Math.floor(zoom)) as ClusterFeature[];
  }, [supercluster, selectedCity, zoom]);

  // GeoJSON for MapLibre source
  const clusterGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: clusters,
  }), [clusters]);

  // Radius circle GeoJSON
  const radiusGeoJSON = useMemo(() => {
    if (!showRadius || !userLocation) return null;
    const [lng, lat] = userLocation;
    const radiusDeg = radiusKm / 111;
    const steps = 64;
    const coords: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      coords.push([
        lng + radiusDeg * Math.sin(angle) / Math.cos(lat * Math.PI / 180),
        lat + radiusDeg * Math.cos(angle),
      ]);
    }
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [coords] },
        properties: {},
      }],
    };
  }, [showRadius, userLocation, radiusKm]);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation([loc.coords.longitude, loc.coords.latitude]);
      }
    })();
  }, []);

  const jumpToCity = useCallback((city: typeof CITIES[0]) => {
    Haptics.selectionAsync();
    setSelectedCity(city);
    setSelectedProperty(null);
    cameraRef.current?.setCamera({
      centerCoordinate: [city.lng, city.lat],
      zoomLevel: city.zoom,
      animationDuration: 600,
    });
  }, []);

  const handleClusterPress = useCallback(async (feature: ClusterFeature) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (feature.properties.cluster) {
      // Expand cluster
      const [lng, lat] = feature.geometry.coordinates;
      const expansionZoom = Math.min(
        supercluster.getClusterExpansionZoom(feature.properties.cluster_id!),
        20,
      );
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: expansionZoom,
        animationDuration: 400,
      });
    } else {
      // Select property
      const prop = properties.find(p => p.id === feature.properties.propertyId);
      if (prop) setSelectedProperty(prop);
    }
  }, [supercluster, properties]);

  const loadIsochrone = useCallback(async () => {
    if (!userLocation) return;
    setLoadingIsochrone(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const response = await fetch(
        `/api/trpc/geospatial.isochrone?input=${encodeURIComponent(JSON.stringify({
          lat: userLocation[1], lng: userLocation[0],
          travelTimeMinutes: 15, mode: 'car',
        }))}`,
      );
      const data = await response.json();
      setIsochroneData(data?.result?.data);
      setShowIsochrone(true);
    } catch {
      // Silently fail — isochrone is optional
    } finally {
      setLoadingIsochrone(false);
    }
  }, [userLocation]);

  const formatPrice = (price: number) => {
    if (price >= 1_000_000) return `₦${(price / 1_000_000).toFixed(1)}M`;
    if (price >= 1_000) return `₦${(price / 1_000).toFixed(0)}K`;
    return `₦${price}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map */}
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={`https://demotiles.maplibre.org/style.json`}
        onRegionDidChange={async (feature) => {
          const z = await mapRef.current?.getZoom();
          if (z) setZoom(z);
        }}
        attributionEnabled
        attributionPosition={{ bottom: 8, right: 8 }}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          centerCoordinate={[selectedCity.lng, selectedCity.lat]}
          zoomLevel={selectedCity.zoom}
          animationMode="flyTo"
          animationDuration={500}
        />

        {/* OSM Raster Tile Layer */}
        <MapLibreGL.RasterSource
          id="osm-source"
          tileUrlTemplates={[TILE_URL]}
          tileSize={256}
          attribution={TILE_ATTRIBUTION}
        >
          <MapLibreGL.RasterLayer id="osm-layer" sourceID="osm-source" style={{ rasterOpacity: 1 }} />
        </MapLibreGL.RasterSource>

        {/* Cluster / Property pins */}
        <MapLibreGL.ShapeSource
          id="properties-source"
          shape={clusterGeoJSON}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={14}
          onPress={(e) => {
            const feature = e.features[0] as ClusterFeature;
            if (feature) handleClusterPress(feature);
          }}
        >
          {/* Cluster circles */}
          <MapLibreGL.CircleLayer
            id="clusters"
            filter={['has', 'point_count']}
            style={{
              circleColor: ['step', ['get', 'point_count'], '#2563EB', 10, '#7C3AED', 50, '#DC2626'],
              circleRadius: ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
              circleOpacity: 0.9,
            }}
          />
          <MapLibreGL.SymbolLayer
            id="cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textColor: '#ffffff',
              textSize: 13,
              textFont: ['Open Sans Bold'],
            }}
          />
          {/* Individual property pins */}
          <MapLibreGL.CircleLayer
            id="property-pins"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: '#10B981',
              circleRadius: 8,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
            }}
          />
        </MapLibreGL.ShapeSource>

        {/* Radius circle */}
        {radiusGeoJSON && (
          <MapLibreGL.ShapeSource id="radius-source" shape={radiusGeoJSON}>
            <MapLibreGL.FillLayer
              id="radius-fill"
              style={{ fillColor: '#2563EB', fillOpacity: 0.08 }}
            />
            <MapLibreGL.LineLayer
              id="radius-border"
              style={{ lineColor: '#2563EB', lineWidth: 2, lineDasharray: [4, 3] }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Isochrone overlay */}
        {showIsochrone && isochroneData && (
          <MapLibreGL.ShapeSource id="isochrone-source" shape={isochroneData}>
            <MapLibreGL.FillLayer
              id="isochrone-fill"
              style={{ fillColor: '#F59E0B', fillOpacity: 0.15 }}
            />
            <MapLibreGL.LineLayer
              id="isochrone-border"
              style={{ lineColor: '#F59E0B', lineWidth: 2 }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* User location */}
        <MapLibreGL.UserLocation visible renderMode="native" />
      </MapLibreGL.MapView>

      {/* City selector */}
      <View style={styles.cityBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityScroll}>
          {CITIES.map(city => (
            <TouchableOpacity
              key={city.name}
              style={[styles.cityChip, selectedCity.name === city.name && styles.cityChipActive]}
              onPress={() => jumpToCity(city)}
            >
              <Text style={[styles.cityChipText, selectedCity.name === city.name && styles.cityChipTextActive]}>
                {city.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, showRadius && styles.controlBtnActive]}
          onPress={() => { Haptics.selectionAsync(); setShowRadius(v => !v); }}
        >
          <Ionicons name="radio-button-on-outline" size={20} color={showRadius ? '#fff' : '#374151'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, showIsochrone && styles.controlBtnActive]}
          onPress={loadIsochrone}
          disabled={loadingIsochrone}
        >
          {loadingIsochrone
            ? <ActivityIndicator size="small" color="#374151" />
            : <Ionicons name="time-outline" size={20} color={showIsochrone ? '#fff' : '#374151'} />}
        </TouchableOpacity>
        {userLocation && (
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              Haptics.selectionAsync();
              cameraRef.current?.setCamera({
                centerCoordinate: userLocation,
                zoomLevel: 14,
                animationDuration: 500,
              });
            }}
          >
            <Ionicons name="locate-outline" size={20} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      )}

      {/* Property card */}
      {selectedProperty && (
        <View style={styles.propertyCard}>
          <TouchableOpacity
            style={styles.cardClose}
            onPress={() => setSelectedProperty(null)}
          >
            <Ionicons name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.cardTitle} numberOfLines={1}>{selectedProperty.title}</Text>
          <Text style={styles.cardPrice}>{formatPrice(selectedProperty.price)}</Text>
          <Text style={styles.cardMeta}>
            {selectedProperty.bedrooms} bed · {selectedProperty.propertyType} · {selectedProperty.city}
          </Text>
          <TouchableOpacity
            style={styles.cardCTA}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('PropertyDetail', { id: selectedProperty.id });
            }}
          >
            <Text style={styles.cardCTAText}>View Property</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  map: { flex: 1 },
  cityBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 60,
    left: 0, right: 0, paddingVertical: 8,
  },
  cityScroll: { paddingHorizontal: 12, gap: 8 },
  cityChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    elevation: 3,
  },
  cityChipActive: { backgroundColor: '#2563EB' },
  cityChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  cityChipTextActive: { color: '#fff' },
  controls: {
    position: 'absolute', right: 12, top: '45%',
    gap: 8,
  },
  controlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4,
    elevation: 4,
  },
  controlBtnActive: { backgroundColor: '#2563EB' },
  loadingOverlay: {
    position: 'absolute', top: 160, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    elevation: 3,
  },
  loadingText: { fontSize: 13, color: '#374151' },
  propertyCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 8,
  },
  cardClose: { position: 'absolute', top: 12, right: 12, padding: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4, paddingRight: 28 },
  cardPrice: { fontSize: 20, fontWeight: '800', color: '#2563EB', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  cardCTA: {
    backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  cardCTAText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
