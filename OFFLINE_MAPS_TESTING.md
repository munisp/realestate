# Offline Maps Testing Infrastructure

Complete guide for testing offline maps functionality in the React Native mobile app.

---

## Overview

The OfflineMap component (`realestate-mobile/src/components/OfflineMap.tsx`) provides full offline mapping capabilities with tile caching, batch downloads, and persistent storage.

---

## Prerequisites

### Required Packages

All dependencies are already included in the OfflineMap component:

```bash
# React Native Maps
npm install react-native-maps

# File system access
npm install react-native-fs

# Async storage for metadata
npm install @react-native-async-storage/async-storage

# Network info for connectivity detection
npm install @react-native-community/netinfo
```

### Platform Setup

**iOS (react-native-maps)**:
```bash
cd ios && pod install && cd ..
```

**Android (react-native-maps)**:
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
</application>
```

---

## Testing Regions

### Pre-configured Test Cities

The OfflineMap component includes 4 major cities for testing:

1. **Lagos, Nigeria**
   - Center: 6.5244°N, 3.3792°E
   - Zoom levels: 12-15
   - Estimated tiles: ~1,200
   - Storage: ~50MB

2. **Abuja, Nigeria**
   - Center: 9.0765°N, 7.3986°E
   - Zoom levels: 12-15
   - Estimated tiles: ~1,000
   - Storage: ~40MB

3. **New York City, USA**
   - Center: 40.7128°N, -74.0060°W
   - Zoom levels: 12-15
   - Estimated tiles: ~1,500
   - Storage: ~60MB

4. **Los Angeles, USA**
   - Center: 34.0522°N, -118.2437°W
   - Zoom levels: 12-15
   - Estimated tiles: ~1,400
   - Storage: ~55MB

---

## Testing Workflow

### 1. Initial Setup

```typescript
import OfflineMap from '../components/OfflineMap';

function PropertyMapScreen() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  return (
    <OfflineMap
      initialRegion={{
        latitude: 6.5244,
        longitude: 3.3792,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
      markers={[
        {
          id: '1',
          coordinate: { latitude: 6.5244, longitude: 3.3792 },
          title: 'Test Property',
          description: 'Lagos, Nigeria',
        },
      ]}
      onMarkerPress={(marker) => console.log('Marker pressed:', marker)}
    />
  );
}
```

### 2. Download Test Region

**Test Scenario**: Download Lagos offline tiles

1. Open the app with internet connection
2. Tap "Download Offline Maps" button
3. Select "Lagos, Nigeria" from the list
4. Observe download progress (0-100%)
5. Wait for completion (~2-3 minutes on WiFi)
6. Verify success message

**Expected Behavior**:
- Progress bar updates smoothly
- Download completes without errors
- Success toast notification appears
- Region marked as "Downloaded" in list

### 3. Test Offline Functionality

**Test Scenario**: Use map without internet

1. Download a region (e.g., Lagos)
2. Enable Airplane Mode on device
3. Navigate to map screen
4. Pan and zoom within downloaded region
5. Verify tiles load from cache

**Expected Behavior**:
- Map tiles load instantly from cache
- No network errors or blank tiles
- Smooth panning and zooming
- "Offline Mode" indicator shows in UI

### 4. Test Cache Management

**Test Scenario**: Verify cache limits

1. Download multiple regions (Lagos + Abuja + NYC)
2. Check total cache size
3. Verify 500MB limit is enforced
4. Oldest tiles should be evicted when limit reached

**Expected Behavior**:
- Cache size displayed accurately
- Warning when approaching 500MB limit
- Automatic eviction of old tiles
- No app crashes or performance issues

### 5. Test Reconnection

**Test Scenario**: Switch between online/offline

1. Start with offline mode (Airplane Mode on)
2. View cached region
3. Disable Airplane Mode
4. Pan to non-cached area
5. Verify tiles download automatically

**Expected Behavior**:
- Seamless transition from cached to live tiles
- No visual glitches or delays
- Network indicator updates correctly

---

## Test Cases

### Functional Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| FT-01 | Download single region | Select Lagos → Download | 100% success, ~50MB cached |
| FT-02 | Download multiple regions | Download Lagos + Abuja | Both regions cached, ~90MB total |
| FT-03 | Offline map viewing | Airplane Mode → View Lagos | Tiles load from cache |
| FT-04 | Cache limit enforcement | Download 10+ regions | Oldest evicted at 500MB |
| FT-05 | Delete cached region | Select Lagos → Delete | Cache cleared, storage freed |
| FT-06 | Resume interrupted download | Download → Kill app → Restart | Download resumes from last tile |
| FT-07 | Zoom level caching | Download zoom 12-15 | All zoom levels cached |
| FT-08 | Marker display offline | Add markers → Offline mode | Markers visible on cached tiles |

### Performance Tests

| Test ID | Description | Metric | Target |
|---------|-------------|--------|--------|
| PT-01 | Tile load time (cached) | Time to display tile | <50ms |
| PT-02 | Tile load time (network) | Time to download tile | <500ms |
| PT-03 | Download speed | Tiles per second | >10 tiles/sec |
| PT-04 | Memory usage | RAM during download | <200MB |
| PT-05 | Storage efficiency | Bytes per tile | ~40KB |
| PT-06 | Cache lookup time | Time to find cached tile | <10ms |

### Edge Cases

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| EC-01 | No internet on first launch | Launch app offline | Show error, prompt to connect |
| EC-02 | Storage full | Download with <100MB free | Show error, prevent download |
| EC-03 | Corrupted cache | Manually corrupt cache file | Detect corruption, re-download |
| EC-04 | GPS disabled | Use map without location | Map works, no location marker |
| EC-05 | Low battery | Download on <20% battery | Show warning, allow continue |
| EC-06 | Background download | Download → Minimize app | Download continues in background |

---

## Debugging

### Enable Debug Logging

Add to OfflineMap component:

```typescript
const DEBUG = true;

if (DEBUG) {
  console.log('[OfflineMap] Downloading tile:', tileUrl);
  console.log('[OfflineMap] Cache size:', cacheSize);
  console.log('[OfflineMap] Network status:', isConnected);
}
```

### Inspect Cache

**iOS**:
```bash
# View cache directory
xcrun simctl get_app_container booted com.yourapp data

# Check cache size
du -sh ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/Caches/MapTiles
```

**Android**:
```bash
# View cache directory
adb shell run-as com.yourapp ls /data/data/com.yourapp/cache/MapTiles

# Check cache size
adb shell run-as com.yourapp du -sh /data/data/com.yourapp/cache/MapTiles
```

### Common Issues

**Issue**: Tiles not loading offline
- **Cause**: Cache not populated
- **Solution**: Verify download completed, check cache directory exists

**Issue**: Download fails at 50%
- **Cause**: Network interruption
- **Solution**: Implement retry logic, resume from last tile

**Issue**: App crashes during download
- **Cause**: Memory pressure
- **Solution**: Reduce batch size from 10 to 5 tiles

**Issue**: Tiles blurry offline
- **Cause**: Wrong zoom level cached
- **Solution**: Verify zoom levels 12-15 are downloaded

---

## Performance Optimization

### Recommended Settings

```typescript
const OPTIMAL_CONFIG = {
  batchSize: 10, // Tiles to download concurrently
  maxCacheSize: 500 * 1024 * 1024, // 500MB
  minZoom: 12, // City-level detail
  maxZoom: 15, // Street-level detail
  tileSize: 256, // Standard tile size
  retryAttempts: 3, // Retry failed downloads
  timeout: 10000, // 10 second timeout per tile
};
```

### Cache Eviction Strategy

**LRU (Least Recently Used)**:
- Track last access time for each tile
- Evict oldest tiles when cache full
- Preserve frequently accessed tiles

**Implementation**:
```typescript
const evictOldTiles = async (requiredSpace: number) => {
  const tiles = await AsyncStorage.getAllKeys();
  const tilesWithTimestamp = await Promise.all(
    tiles.map(async (key) => ({
      key,
      timestamp: JSON.parse(await AsyncStorage.getItem(key) || '{}').lastAccess,
    }))
  );
  
  // Sort by timestamp (oldest first)
  tilesWithTimestamp.sort((a, b) => a.timestamp - b.timestamp);
  
  // Evict until we have enough space
  let freedSpace = 0;
  for (const tile of tilesWithTimestamp) {
    if (freedSpace >= requiredSpace) break;
    await RNFS.unlink(tile.key);
    freedSpace += TILE_SIZE;
  }
};
```

---

## Production Checklist

Before deploying offline maps to production:

- [ ] Test all 4 pre-configured cities
- [ ] Verify cache limits work correctly
- [ ] Test on low-end devices (2GB RAM)
- [ ] Test on slow networks (3G)
- [ ] Verify background downloads work
- [ ] Test cache persistence across app restarts
- [ ] Verify storage cleanup on app uninstall
- [ ] Test with 100+ markers on cached tiles
- [ ] Verify no memory leaks during long sessions
- [ ] Test graceful degradation when cache full
- [ ] Add analytics for download success/failure rates
- [ ] Implement crash reporting for tile download errors

---

## Monitoring

### Key Metrics to Track

1. **Download Success Rate**: % of successful tile downloads
2. **Cache Hit Rate**: % of tiles loaded from cache vs network
3. **Average Download Time**: Time to download full region
4. **Storage Usage**: Average cache size per user
5. **Eviction Rate**: How often tiles are evicted
6. **Crash Rate**: Crashes during download/offline usage

### Analytics Events

```typescript
// Track download start
analytics.logEvent('offline_map_download_start', {
  region: 'Lagos',
  estimatedTiles: 1200,
  estimatedSize: '50MB',
});

// Track download complete
analytics.logEvent('offline_map_download_complete', {
  region: 'Lagos',
  actualTiles: 1187,
  actualSize: '48.5MB',
  duration: 145, // seconds
});

// Track offline usage
analytics.logEvent('offline_map_viewed', {
  region: 'Lagos',
  cacheHitRate: 0.95,
  sessionDuration: 300, // seconds
});
```

---

## Next Steps

1. **Implement selective downloads**: Allow users to draw custom regions
2. **Add WiFi-only download option**: Prevent cellular data usage
3. **Implement differential updates**: Only download changed tiles
4. **Add expiration dates**: Auto-refresh tiles after 30 days
5. **Support offline search**: Cache property data for offline search
6. **Add offline routing**: Cache directions within downloaded regions

---

## Support

For issues or questions:
- Check debug logs in console
- Verify network connectivity
- Clear cache and re-download
- Report bugs with device model, OS version, and steps to reproduce
