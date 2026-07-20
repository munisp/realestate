/**
 * Offline Map Settings Screen
 *
 * Allows users to download map tiles for Nigerian cities for offline use.
 * Shows download progress, cache size, and allows clearing cached data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  tileCache,
  NIGERIAN_CITY_BOUNDS,
  type DownloadProgress,
} from '../utils/offlineTileCache';

type CityKey = keyof typeof NIGERIAN_CITY_BOUNDS;

interface CityStatus {
  key: CityKey;
  cached: boolean;
  percent: number;
  missingTiles: number;
  downloading: boolean;
  progress: DownloadProgress | null;
}

export default function OfflineMapSettingsScreen() {
  const [cacheStats, setCacheStats] = useState<{
    tileCount: number;
    totalSizeMB: number;
    oldestTileAge: string;
  } | null>(null);
  const [cityStatuses, setCityStatuses] = useState<Record<CityKey, CityStatus>>(
    () => Object.fromEntries(
      Object.keys(NIGERIAN_CITY_BOUNDS).map(key => [key, {
        key: key as CityKey,
        cached: false,
        percent: 0,
        missingTiles: 0,
        downloading: false,
        progress: null,
      }]),
    ) as Record<CityKey, CityStatus>,
  );
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const stats = await tileCache.getStats();
      setCacheStats(stats);

      // Check each city
      const updates: Partial<Record<CityKey, Partial<CityStatus>>> = {};
      await Promise.all(
        (Object.keys(NIGERIAN_CITY_BOUNDS) as CityKey[]).map(async (key) => {
          const status = await tileCache.isRegionCached(key);
          updates[key] = { ...status };
        }),
      );
      setCityStatuses(prev => {
        const next = { ...prev };
        for (const [key, update] of Object.entries(updates)) {
          next[key as CityKey] = { ...next[key as CityKey], ...update };
        }
        return next;
      });
    } catch (err) {
      console.warn('Failed to load cache stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const downloadCity = async (cityKey: CityKey) => {
    const bounds = NIGERIAN_CITY_BOUNDS[cityKey];

    Alert.alert(
      `Download ${bounds.name}`,
      `This will download ~${Math.round(bounds.estimatedTiles * 0.1)}MB of map tiles for offline use. Best done on Wi-Fi.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setCityStatuses(prev => ({
              ...prev,
              [cityKey]: { ...prev[cityKey], downloading: true, progress: null },
            }));

            try {
              await tileCache.downloadRegion(cityKey, (progress) => {
                setCityStatuses(prev => ({
                  ...prev,
                  [cityKey]: { ...prev[cityKey], progress },
                }));
              });

              await loadStats();
              Alert.alert('Download Complete', `${bounds.name} map tiles are now available offline.`);
            } catch (err: any) {
              Alert.alert('Download Failed', err.message || 'Please check your connection and try again.');
            } finally {
              setCityStatuses(prev => ({
                ...prev,
                [cityKey]: { ...prev[cityKey], downloading: false, progress: null },
              }));
            }
          },
        },
      ],
    );
  };

  const clearAllCache = () => {
    Alert.alert(
      'Clear Offline Maps',
      `This will delete all ${cacheStats?.totalSizeMB}MB of cached map tiles. You will need to re-download to use maps offline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await tileCache.clearAll();
            await loadStats();
            Alert.alert('Cleared', 'All offline map data has been removed.');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading cache info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="map-outline" size={28} color="#2563EB" />
          <Text style={styles.headerTitle}>Offline Maps</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Download map tiles to browse properties without internet access.
        </Text>

        {/* Cache stats */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Ionicons name="server-outline" size={18} color="#6B7280" />
            <Text style={styles.statLabel}>Cached tiles</Text>
            <Text style={styles.statValue}>{cacheStats?.tileCount.toLocaleString() ?? 0}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="folder-outline" size={18} color="#6B7280" />
            <Text style={styles.statLabel}>Storage used</Text>
            <Text style={styles.statValue}>{cacheStats?.totalSizeMB ?? 0} MB</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <Text style={styles.statLabel}>Oldest tile</Text>
            <Text style={styles.statValue}>{cacheStats?.oldestTileAge ?? 'N/A'}</Text>
          </View>
        </View>

        {/* City download list */}
        <Text style={styles.sectionTitle}>Available Regions</Text>
        {(Object.keys(NIGERIAN_CITY_BOUNDS) as CityKey[]).map((cityKey) => {
          const bounds = NIGERIAN_CITY_BOUNDS[cityKey];
          const status = cityStatuses[cityKey];
          return (
            <View key={cityKey} style={styles.cityCard}>
              <View style={styles.cityHeader}>
                <View style={styles.cityInfo}>
                  <Text style={styles.cityName}>{bounds.name}</Text>
                  <Text style={styles.cityMeta}>
                    Zoom {bounds.minZoom}–{bounds.maxZoom} · ~{Math.round(bounds.estimatedTiles * 0.1)}MB
                  </Text>
                </View>
                {status.cached ? (
                  <View style={styles.cachedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.cachedText}>Cached</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.downloadBtn, status.downloading && styles.downloadBtnDisabled]}
                    onPress={() => downloadCity(cityKey)}
                    disabled={status.downloading}
                  >
                    {status.downloading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={14} color="#fff" />
                        <Text style={styles.downloadBtnText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress bar */}
              {status.downloading && status.progress && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${status.progress.percent}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {status.progress.downloaded}/{status.progress.total} tiles
                    ({status.progress.percent}%)
                    {status.progress.failed > 0 && ` · ${status.progress.failed} failed`}
                  </Text>
                </View>
              )}

              {/* Partial cache indicator */}
              {!status.cached && !status.downloading && status.percent > 0 && (
                <View style={styles.partialContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, styles.partialFill, { width: `${status.percent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{status.percent}% cached · {status.missingTiles} tiles missing</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Clear cache */}
        {(cacheStats?.tileCount ?? 0) > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAllCache}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.clearBtnText}>Clear All Offline Data</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>
          Tile data © OpenStreetMap contributors. Tiles expire after 7 days and are
          automatically refreshed when online.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  statsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 24, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statLabel: { flex: 1, fontSize: 14, color: '#6B7280' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  cityCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  cityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityInfo: { flex: 1 },
  cityName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cityMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cachedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cachedText: { fontSize: 13, color: '#10B981', fontWeight: '500' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8,
  },
  downloadBtnDisabled: { backgroundColor: '#93C5FD' },
  downloadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  progressContainer: { marginTop: 10 },
  partialContainer: { marginTop: 8 },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  partialFill: { backgroundColor: '#F59E0B' },
  progressText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 8, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  clearBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
