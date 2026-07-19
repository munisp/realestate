# Advanced Map Search Documentation

## Overview

The Advanced Map Search feature allows users to draw custom search boundaries on an interactive map using polygons, circles, or rectangles. Properties within the drawn area are filtered in real-time, and users can save their searches for future use with automatic notifications.

## Features

### ✅ Implemented Features

1. **Drawing Tools**
   - Polygon drawing for irregular search areas
   - Circle drawing with adjustable radius
   - Rectangle drawing for simple bounding boxes
   - Editable shapes after drawing
   - Clear boundary function

2. **Property Filtering**
   - Real-time filtering within drawn boundaries
   - Additional filters: price range, bedrooms, property type
   - Point-in-polygon algorithm for accurate polygon filtering
   - Haversine formula for circle radius calculations
   - Bounding box filtering for rectangles

3. **Search Management**
   - Save searches with custom names
   - Enable/disable notifications for saved searches
   - View all saved searches
   - Delete saved searches
   - Automatic notifications for new listings

4. **Heatmap Visualization**
   - Property density heatmap
   - Price level heatmap
   - Toggle heatmap on/off
   - Switch between metrics
   - Real-time data based on map viewport

5. **Interactive Map**
   - Property markers with info windows
   - Click markers to view property details
   - Zoom and pan controls
   - Full Google Maps integration
   - Drawing Manager integration

## User Flow

### Drawing a Search Area

1. **Navigate to Advanced Search**
   - Go to `/map/advanced`
   - Map loads with default center

2. **Select Drawing Tool**
   - Click "Draw Polygon" for custom shapes
   - Click "Draw Circle" for radius-based search
   - Click "Draw Rectangle" for simple boxes

3. **Draw on Map**
   - **Polygon**: Click to add points, double-click to complete
   - **Circle**: Click center, drag to set radius
   - **Rectangle**: Click corner, drag to opposite corner

4. **Automatic Search**
   - Properties within boundary are automatically searched
   - Results appear in sidebar
   - Markers placed on map

5. **Refine Search**
   - Adjust filters (price, bedrooms, type)
   - Click "Search" to re-run with new filters
   - Edit shape by dragging vertices

### Saving a Search

1. **Draw Search Area**
   - Complete drawing as described above

2. **Click "Save Search"**
   - Dialog opens

3. **Enter Search Name**
   - Provide descriptive name (e.g., "Downtown Lagos Apartments")

4. **Confirm Save**
   - Search saved to database
   - Notifications enabled by default

5. **Manage Saved Searches**
   - View at `/saved-searches`
   - Enable/disable notifications
   - Delete unwanted searches

### Using Heatmap

1. **Toggle Heatmap**
   - Click "Show Heatmap" switch in sidebar

2. **Select Metric**
   - Choose "Property Density" or "Price Levels"
   - Heatmap updates automatically

3. **Interpret Heatmap**
   - **Red areas**: High density/prices
   - **Yellow areas**: Medium density/prices
   - **Green areas**: Low density/prices

4. **Zoom and Pan**
   - Heatmap updates based on visible area
   - More detailed at higher zoom levels

## API Endpoints

### `mapSearch.searchWithinBoundary`

Search for properties within a drawn boundary.

**Input:**
```typescript
{
  boundaryType: 'polygon' | 'circle' | 'rectangle';
  boundaryData: {
    // For polygon
    coordinates?: Array<{ lat: number; lng: number }>;
    // For circle
    center?: { lat: number; lng: number };
    radius?: number; // meters
    // For rectangle
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    minBathrooms?: number;
    propertyType?: string;
    status?: string;
  };
}
```

**Output:**
```typescript
{
  properties: Array<Property>;
  count: number;
}
```

### `mapSearch.saveBoundarySearch`

Save a search with boundary for future use.

**Input:**
```typescript
{
  name: string;
  boundaryType: 'none' | 'polygon' | 'circle' | 'rectangle';
  boundaryData?: any;
  searchCriteria: any;
  notificationsEnabled?: boolean;
}
```

**Output:**
```typescript
{
  success: boolean;
  searchId: number;
}
```

### `mapSearch.getSavedSearches`

Get user's saved searches with boundaries.

**Output:**
```typescript
Array<{
  id: number;
  name: string;
  boundaryType: string;
  boundaryData: any;
  searchCriteria: any;
  notificationsEnabled: boolean;
  createdAt: Date;
}>
```

### `mapSearch.deleteSavedSearch`

Delete a saved search.

**Input:**
```typescript
{
  searchId: number;
}
```

**Output:**
```typescript
{
  success: boolean;
}
```

### `mapSearch.getHeatmapData`

Get heatmap data for property density or prices.

**Input:**
```typescript
{
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  metric: 'density' | 'price';
}
```

**Output:**
```typescript
{
  points: Array<{
    lat: number;
    lng: number;
    weight: number;
  }>;
}
```

## Database Schema

### Enhanced savedSearches Table

```sql
ALTER TABLE savedSearches ADD COLUMN boundaryType ENUM('none', 'polygon', 'circle', 'rectangle') DEFAULT 'none';
ALTER TABLE savedSearches ADD COLUMN boundaryData TEXT; -- JSON
```

**Fields:**
- `boundaryType`: Type of boundary drawn
- `boundaryData`: JSON containing boundary coordinates/parameters

**Polygon Data:**
```json
{
  "coordinates": [
    { "lat": 6.5244, "lng": 3.3792 },
    { "lat": 6.5300, "lng": 3.3850 },
    { "lat": 6.5280, "lng": 3.3900 }
  ]
}
```

**Circle Data:**
```json
{
  "center": { "lat": 6.5244, "lng": 3.3792 },
  "radius": 5000
}
```

**Rectangle Data:**
```json
{
  "bounds": {
    "north": 6.5300,
    "south": 6.5200,
    "east": 3.3900,
    "west": 3.3700
  }
}
```

## Algorithms

### Point-in-Polygon (Ray Casting)

Used to determine if a property is inside a drawn polygon.

```typescript
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
```

### Haversine Distance

Used to calculate distance from circle center to property.

```sql
SELECT *
FROM properties
WHERE (
  6371 * acos(
    cos(radians(centerLat)) * 
    cos(radians(latitude)) * 
    cos(radians(longitude) - radians(centerLng)) + 
    sin(radians(centerLat)) * 
    sin(radians(latitude))
  )
) <= radiusInKm
```

### Bounding Box

Simple latitude/longitude range check for rectangles.

```sql
SELECT *
FROM properties
WHERE latitude >= south
  AND latitude <= north
  AND longitude >= west
  AND longitude <= east
```

## Google Maps Integration

### Drawing Manager Setup

```typescript
const drawingManager = new google.maps.drawing.DrawingManager({
  drawingMode: null,
  drawingControl: false,
  polygonOptions: {
    fillColor: '#2563eb',
    fillOpacity: 0.2,
    strokeWeight: 2,
    strokeColor: '#2563eb',
    editable: true,
  },
  circleOptions: {
    fillColor: '#2563eb',
    fillOpacity: 0.2,
    strokeWeight: 2,
    strokeColor: '#2563eb',
    editable: true,
  },
  rectangleOptions: {
    fillColor: '#2563eb',
    fillOpacity: 0.2,
    strokeWeight: 2,
    strokeColor: '#2563eb',
    editable: true,
  },
});

drawingManager.setMap(map);
```

### Shape Completion Listener

```typescript
google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
  // Remove previous shape
  if (currentShape) {
    currentShape.setMap(null);
  }

  currentShape = event.overlay;

  // Extract boundary data
  if (event.type === 'polygon') {
    const path = event.overlay.getPath();
    const coordinates = path.getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));
    // Use coordinates for search
  }
});
```

### Heatmap Layer

```typescript
const heatmapData = points.map(
  (point) =>
    ({
      location: new google.maps.LatLng(point.lat, point.lng),
      weight: point.weight,
    } as google.maps.visualization.WeightedLocation)
);

const heatmap = new google.maps.visualization.HeatmapLayer({
  data: heatmapData,
  map: map,
  radius: 20,
  opacity: 0.6,
});
```

## UI Components

### AdvancedMapSearch Component

Located at: `client/src/pages/AdvancedMapSearch.tsx`

**Features:**
- Full-screen map interface
- Sidebar with tools and filters
- Drawing tool buttons
- Filter inputs
- Heatmap controls
- Results list
- Save search dialog

**State Management:**
- `activeTool`: Currently selected drawing tool
- `boundaryType`: Type of drawn boundary
- `boundaryData`: Coordinates/parameters of boundary
- `searchResults`: Properties found within boundary
- `showHeatmap`: Heatmap visibility toggle

### SavedSearches Component

Located at: `client/src/pages/SavedSearches.tsx`

**Features:**
- List of saved searches
- Boundary type badges
- Filter summaries
- Notification toggles
- Delete functionality
- Link to advanced search

## Performance Optimization

### Database Indexing

```sql
-- Index on latitude and longitude for spatial queries
CREATE INDEX idx_properties_location ON properties(latitude, longitude);

-- Index on status for filtering
CREATE INDEX idx_properties_status ON properties(status);

-- Index on price for range queries
CREATE INDEX idx_properties_price ON properties(price);
```

### Query Optimization

1. **Bounding Box Pre-filter**
   - Always apply bounding box first
   - Reduces dataset before expensive calculations
   - Works for all boundary types

2. **Limit Results**
   - Cap results at reasonable number (e.g., 1000)
   - Paginate if needed
   - Prevents memory issues

3. **Client-side Polygon Check**
   - Database returns bounding box results
   - Point-in-polygon check done in Node.js
   - Avoids complex spatial SQL

### Frontend Optimization

1. **Debounced Search**
   - Wait for user to finish drawing
   - Don't search on every vertex change
   - Reduce API calls

2. **Marker Clustering**
   - Group nearby markers at low zoom
   - Improves performance with many properties
   - Better visual clarity

3. **Lazy Load Heatmap**
   - Only load when toggled on
   - Fetch data for current viewport
   - Update on map move (debounced)

## Notifications System

### New Listing Alerts

When a new property is added that matches a saved search:

1. **Check Saved Searches**
   - Query all active saved searches
   - Check if property falls within boundaries

2. **Send Notifications**
   - Email notification to user
   - Push notification if enabled
   - Include property details and link

3. **Track Notifications**
   - Update `lastNotified` timestamp
   - Prevent duplicate notifications
   - Respect frequency preferences

### Implementation

```typescript
// When new property is added
async function notifyMatchingSavedSearches(property: Property) {
  const searches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.notificationsEnabled, 1));

  for (const search of searches) {
    if (propertyMatchesSearch(property, search)) {
      await sendNotification(search.userId, {
        title: 'New Property Match',
        body: `${property.addressLine1} matches your saved search "${search.name}"`,
        link: `/property/${property.id}`,
      });
    }
  }
}
```

## Testing

### Manual Testing

1. **Draw Polygon**
   - Click polygon tool
   - Draw shape on map
   - Verify properties inside are found
   - Check properties outside are excluded

2. **Draw Circle**
   - Click circle tool
   - Set center and radius
   - Verify distance calculations
   - Test edge cases (properties on boundary)

3. **Draw Rectangle**
   - Click rectangle tool
   - Draw bounding box
   - Verify simple lat/lng filtering

4. **Apply Filters**
   - Set price range
   - Set bedroom minimum
   - Select property type
   - Verify combined filtering

5. **Save Search**
   - Draw boundary
   - Click save
   - Enter name
   - Verify saved in database
   - Check appears in saved searches list

6. **Heatmap**
   - Toggle heatmap on
   - Switch between metrics
   - Zoom in/out
   - Verify data updates

### Automated Testing

```typescript
// Test point-in-polygon
test('point inside polygon', () => {
  const polygon = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ];
  const point = { lat: 5, lng: 5 };
  expect(isPointInPolygon(point, polygon)).toBe(true);
});

// Test circle distance
test('point inside circle', async () => {
  const result = await trpc.mapSearch.searchWithinBoundary.query({
    boundaryType: 'circle',
    boundaryData: {
      center: { lat: 6.5244, lng: 3.3792 },
      radius: 5000,
    },
  });
  
  result.properties.forEach((prop) => {
    const distance = calculateDistance(
      { lat: 6.5244, lng: 3.3792 },
      { lat: prop.latitude, lng: prop.longitude }
    );
    expect(distance).toBeLessThanOrEqual(5000);
  });
});
```

## Future Enhancements

- [ ] Multi-polygon support (draw multiple areas)
- [ ] Exclude areas (negative polygons)
- [ ] Commute time isochrones
- [ ] School district boundaries
- [ ] Neighborhood boundaries overlay
- [ ] Historical price trends in area
- [ ] Compare multiple saved searches
- [ ] Share saved searches with others
- [ ] Export search results to CSV/PDF
- [ ] Mobile app with drawing support
- [ ] Voice search integration
- [ ] AR property viewing in area
- [ ] 3D terrain visualization
- [ ] Street view integration

## Troubleshooting

### No Properties Found

**Cause:** Boundary too small or no properties in area.

**Solution:**
1. Zoom out to see larger area
2. Expand boundary
3. Remove restrictive filters
4. Check if properties have lat/lng data

### Heatmap Not Loading

**Cause:** No data in viewport or API error.

**Solution:**
1. Zoom to area with properties
2. Check browser console for errors
3. Verify heatmap API is enabled
4. Check data permissions

### Polygon Not Completing

**Cause:** Not double-clicking to finish.

**Solution:**
1. Double-click last point to complete
2. Or click first point again
3. Ensure at least 3 points

### Search Too Slow

**Cause:** Too many properties or complex polygon.

**Solution:**
1. Add database indexes
2. Limit result count
3. Use bounding box pre-filter
4. Simplify polygon (fewer vertices)

## Resources

- [Google Maps Drawing Manager](https://developers.google.com/maps/documentation/javascript/drawinglayer)
- [Google Maps Heatmap Layer](https://developers.google.com/maps/documentation/javascript/heatmaplayer)
- [Point-in-Polygon Algorithm](https://en.wikipedia.org/wiki/Point_in_polygon)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Spatial Indexing](https://en.wikipedia.org/wiki/Spatial_database)
