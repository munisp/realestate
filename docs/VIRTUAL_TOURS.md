# Virtual Tour Integration Documentation

## Overview

The Virtual Tour Integration provides immersive 360° property tours using Pannellum library, allowing users to explore properties remotely with interactive hotspots, floor plan navigation, and seamless embedding in property listings.

## Features

### ✅ Implemented Features

1. **360° Panorama Viewer**
   - Pannellum library integration
   - Equirectangular panorama support
   - Mouse drag to look around
   - Scroll/pinch to zoom
   - Fullscreen mode
   - Touch-friendly controls

2. **Interactive Hotspots**
   - Scene navigation hotspots
   - Information hotspots
   - Custom text and descriptions
   - Click handlers
   - Visual indicators

3. **Multi-Scene Navigation**
   - Scene thumbnails
   - Click to switch rooms
   - Smooth transitions
   - Current scene indicator
   - Scene titles and metadata

4. **Floor Plan Integration**
   - Floor plan overlay view
   - Clickable room markers
   - Quick navigation to any room
   - Visual property layout
   - Toggle between 360° and floor plan

5. **Viewer Controls**
   - Zoom in/out buttons
   - Reset view button
   - Fullscreen toggle
   - Navigation instructions
   - Control overlay

6. **Tour Management**
   - Create new virtual tours
   - Upload 360° images
   - Add/remove scenes
   - Edit scene details
   - Property selection
   - Tour preview

7. **Embedded Tours**
   - Property detail page integration
   - Standalone tour pages
   - Shareable tour links
   - Responsive design
   - Mobile-optimized

## User Flow

### Viewing a Virtual Tour

1. **From Property Listing**
   - Browse properties at `/properties`
   - Click "Virtual Tour" button on property card
   - Navigate to `/property/:id/virtual-tour`
   - Tour loads automatically

2. **Direct Link**
   - Receive tour link from agent
   - Click link to open tour
   - Tour displays immediately
   - No login required for viewing

3. **Navigation**
   - Drag to look around 360°
   - Scroll or use buttons to zoom
   - Click hotspots to navigate or view info
   - Click scene thumbnails to switch rooms
   - Toggle floor plan for quick navigation
   - Use fullscreen for immersive experience

### Creating a Virtual Tour

1. **Access Management**
   - Navigate to `/virtual-tours/manage`
   - Log in as property owner or agent
   - View list of your properties
   - Click "Create Tour" button

2. **Property Selection**
   - Select property from dropdown
   - Enter tour title
   - Click "Add Scene" for each room

3. **Upload Images**
   - Upload 360° equirectangular images
   - Enter scene title (e.g., "Living Room")
   - Add multiple scenes
   - Preview thumbnails

4. **Configure Hotspots** (Future)
   - Click on panorama to add hotspot
   - Select hotspot type (scene/info)
   - Enter hotspot text
   - Link to target scene
   - Save hotspot configuration

5. **Publish Tour**
   - Review all scenes
   - Click "Create Tour"
   - Tour becomes live immediately
   - Share link with potential buyers

### Managing Tours

1. **View Tours**
   - See all properties with tours
   - Badge indicates tour status
   - Click "View Tour" to preview
   - Test navigation and hotspots

2. **Edit Tours**
   - Click "Edit" on property card
   - Modify scene titles
   - Replace images
   - Update hotspots
   - Save changes

3. **Delete Tours**
   - Click delete icon
   - Confirm deletion
   - Tour removed from property
   - Can recreate later

## Technical Implementation

### Backend API

#### Get Virtual Tour by Property

```typescript
trpc.virtualTours.getByProperty.useQuery({
  propertyId: 123,
});
```

**Response:**
```typescript
{
  id: number,
  propertyId: number,
  title: string,
  scenes: Array<{
    id: string,
    title: string,
    imageUrl: string,
    hotSpots?: Array<{
      id: string,
      pitch: number,
      yaw: number,
      type: 'scene' | 'info',
      text: string,
      sceneId?: string,
      description?: string
    }>
  }>,
  floorPlan?: {
    imageUrl: string,
    hotSpots: Array<{
      sceneId: string,
      x: number,
      y: number
    }>
  }
}
```

#### Create Virtual Tour

```typescript
trpc.virtualTours.create.useMutation({
  propertyId: 123,
  title: "Complete Property Tour",
  scenes: [
    {
      id: "living-room",
      title: "Living Room",
      imageUrl: "/tours/living-room-360.jpg",
      hotSpots: [
        {
          id: "hs1",
          pitch: -10,
          yaw: 45,
          type: "scene",
          text: "Go to Kitchen",
          sceneId: "kitchen"
        }
      ]
    }
  ]
});
```

#### Upload 360° Image

```typescript
trpc.virtualTours.uploadImage.useMutation({
  propertyId: 123,
  sceneId: "living-room",
  imageData: base64EncodedImage
});
```

**Response:**
```typescript
{
  success: true,
  imageUrl: "/tour-images/123/living-room.jpg"
}
```

### Frontend Components

#### VirtualTourViewer Component

Existing component that displays virtual tours with navigation.

**Props:**
```typescript
{
  tours: Array<{
    id: string,
    title: string,
    type: '360' | 'video',
    url: string,
    thumbnail?: string,
    hotspots?: Array<HotSpot>
  }>,
  propertyTitle?: string
}
```

**Features:**
- 360° panorama display
- Scene navigation
- Hotspot interaction
- Fullscreen mode
- Share functionality
- Info overlay

#### VirtualTourPage Component

Standalone page for viewing tours.

**Route:** `/property/:id/virtual-tour`

**Features:**
- Loads tour data from API
- Displays VirtualTourViewer
- Back to property link
- Loading states
- Error handling

#### VirtualTourManagement Component

Management interface for creating/editing tours.

**Route:** `/virtual-tours/manage`

**Features:**
- Property list with tour status
- Create tour dialog
- Scene management
- Image upload
- Tour preview
- Edit/delete actions

### Pannellum Integration

#### Library Loading

```typescript
useEffect(() => {
  // Load Pannellum CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
  document.head.appendChild(link);

  // Load Pannellum JS
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
  script.async = true;
  script.onload = () => setPannellumLoaded(true);
  document.head.appendChild(script);
}, []);
```

#### Viewer Initialization

```typescript
const viewer = window.pannellum.viewer(viewerRef.current, {
  default: {
    firstScene: 'living-room',
    sceneFadeDuration: 1000,
    autoLoad: true,
  },
  scenes: {
    'living-room': {
      type: 'equirectangular',
      panorama: '/tours/living-room-360.jpg',
      title: 'Living Room',
      hotSpots: [
        {
          pitch: -10,
          yaw: 45,
          type: 'scene',
          text: 'Go to Kitchen',
          sceneId: 'kitchen'
        }
      ]
    }
  }
});
```

#### Scene Navigation

```typescript
const loadScene = (sceneId: string) => {
  if (viewer) {
    viewer.loadScene(sceneId);
    setCurrentScene(sceneId);
  }
};
```

#### Zoom Controls

```typescript
const zoomIn = () => {
  const currentHfov = viewer.getHfov();
  viewer.setHfov(Math.max(currentHfov - 10, 50));
};

const zoomOut = () => {
  const currentHfov = viewer.getHfov();
  viewer.setHfov(Math.min(currentHfov + 10, 120));
};
```

### 360° Image Requirements

#### Equirectangular Format

- Aspect ratio: 2:1 (width:height)
- Common resolutions:
  * 4096 × 2048 (4K)
  * 8192 × 4096 (8K)
  * 2048 × 1024 (2K, minimum)
- File format: JPEG, PNG
- File size: < 10MB recommended

#### Capture Methods

1. **360° Camera**
   - Ricoh Theta
   - Insta360
   - GoPro MAX
   - Samsung Gear 360

2. **Smartphone Panorama**
   - Google Street View app
   - Cardboard Camera
   - 360 Panorama app
   - Native camera panorama mode

3. **DSLR Stitching**
   - Multiple overlapping photos
   - PTGui or Hugin software
   - Manual stitching
   - Higher quality output

### Hotspot Configuration

#### Scene Hotspot

Links to another scene in the tour.

```typescript
{
  id: "hs1",
  pitch: -10,        // Vertical angle (-90 to 90)
  yaw: 45,           // Horizontal angle (0 to 360)
  type: "scene",
  text: "Go to Kitchen",
  sceneId: "kitchen" // Target scene ID
}
```

#### Info Hotspot

Displays information about a feature.

```typescript
{
  id: "hs2",
  pitch: 0,
  yaw: 90,
  type: "info",
  text: "Hardwood Floors",
  description: "Beautiful oak hardwood flooring throughout"
}
```

### Floor Plan Integration

#### Floor Plan Image

- PNG or JPEG format
- Transparent background (PNG)
- Clear room labels
- Accurate proportions
- High resolution

#### Hotspot Positioning

```typescript
{
  imageUrl: "/floor-plans/main-floor.png",
  hotSpots: [
    {
      sceneId: "living-room",
      x: 30,  // Percentage from left (0-100)
      y: 40   // Percentage from top (0-100)
    }
  ]
}
```

## Styling

### Viewer Container

```css
.virtual-tour-viewer {
  width: 100%;
  height: 600px;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #000;
}
```

### Controls Overlay

```css
.tour-controls {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}
```

### Scene Thumbnails

```css
.scene-thumbnail {
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.scene-thumbnail.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}
```

### Floor Plan Markers

```css
.floor-plan-marker {
  position: absolute;
  width: 2rem;
  height: 2rem;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: transform 0.2s;
}

.floor-plan-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
}
```

## Performance Optimization

### Image Optimization

```typescript
// Lazy load images
const [imageLoaded, setImageLoaded] = useState(false);

<img
  src={scene.imageUrl}
  onLoad={() => setImageLoaded(true)}
  loading="lazy"
/>
```

### Progressive Loading

```typescript
// Load low-res preview first
const previewUrl = scene.imageUrl.replace('.jpg', '-preview.jpg');

panorama: imageLoaded ? scene.imageUrl : previewUrl
```

### Caching

```typescript
// Cache loaded scenes
const sceneCache = new Map();

const loadScene = (sceneId: string) => {
  if (sceneCache.has(sceneId)) {
    viewer.loadScene(sceneCache.get(sceneId));
  } else {
    // Load and cache
  }
};
```

## Accessibility

### Keyboard Navigation

- Tab: Focus next hotspot
- Enter: Activate hotspot
- Arrow keys: Pan view
- +/-: Zoom in/out
- Esc: Exit fullscreen

### Screen Reader Support

```typescript
<div
  role="application"
  aria-label="360° Virtual Property Tour"
  aria-describedby="tour-instructions"
>
  <div id="tour-instructions" className="sr-only">
    Use arrow keys to look around, Enter to activate hotspots,
    and Tab to navigate between rooms.
  </div>
</div>
```

### Alternative Text

```typescript
<img
  src={scene.imageUrl}
  alt={`360° view of ${scene.title}`}
/>
```

## Mobile Optimization

### Touch Gestures

- Swipe: Pan view
- Pinch: Zoom in/out
- Tap: Activate hotspot
- Double-tap: Reset view

### Responsive Layout

```typescript
const isMobile = window.innerWidth < 768;

const viewerHeight = isMobile ? '400px' : '600px';
const thumbnailCols = isMobile ? 2 : 6;
```

### Performance

- Reduce image resolution on mobile
- Limit concurrent scene loading
- Optimize hotspot rendering
- Use hardware acceleration

## Testing

### Manual Testing

1. **Basic Viewing**
   - Load tour page
   - Verify 360° panorama displays
   - Test mouse drag navigation
   - Test zoom controls
   - Check fullscreen mode

2. **Scene Navigation**
   - Click scene thumbnails
   - Verify smooth transitions
   - Test hotspot navigation
   - Check current scene indicator

3. **Floor Plan**
   - Toggle floor plan view
   - Click room markers
   - Verify navigation to scenes
   - Check marker positioning

4. **Mobile Experience**
   - Test touch gestures
   - Verify responsive layout
   - Check performance
   - Test orientation changes

5. **Tour Management**
   - Create new tour
   - Upload images
   - Add/remove scenes
   - Edit scene details
   - Publish tour

### Automated Testing

```typescript
// Test tour loading
test('loads virtual tour data', async () => {
  const { result } = renderHook(() =>
    trpc.virtualTours.getByProperty.useQuery({ propertyId: 1 })
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data.scenes).toHaveLength(3);
});

// Test scene navigation
test('navigates between scenes', () => {
  const { getByText } = render(<VirtualTourViewer tours={mockTours} />);
  
  fireEvent.click(getByText('Kitchen'));
  expect(getCurrentScene()).toBe('kitchen');
});

// Test image upload
test('uploads 360° image', async () => {
  const file = new File(['image'], 'living-room.jpg', { type: 'image/jpeg' });
  
  const { result } = renderHook(() =>
    trpc.virtualTours.uploadImage.useMutation()
  );

  await act(async () => {
    await result.current.mutateAsync({
      propertyId: 1,
      sceneId: 'living-room',
      imageData: await fileToBase64(file)
    });
  });

  expect(result.current.data.success).toBe(true);
});
```

## Future Enhancements

- [ ] Video tour support (walkthrough videos)
- [ ] VR headset compatibility (WebVR/WebXR)
- [ ] Dollhouse 3D model view
- [ ] Measurement tools (distance, area)
- [ ] Virtual staging (add furniture)
- [ ] Audio narration
- [ ] Live guided tours with video chat
- [ ] Tour analytics (views, time spent)
- [ ] Social sharing with preview cards
- [ ] Embed code for external websites
- [ ] Multi-language support
- [ ] Accessibility improvements (audio descriptions)
- [ ] Advanced hotspot types (video, 3D objects)
- [ ] Tour recording/playback
- [ ] Comparison view (side-by-side properties)

## Troubleshooting

### Tour Not Loading

**Cause:** Invalid image URL or network error.

**Solution:**
1. Check image URL is accessible
2. Verify CORS headers
3. Check network tab for errors
4. Try different browser

### Panorama Distorted

**Cause:** Incorrect image format or aspect ratio.

**Solution:**
1. Verify 2:1 aspect ratio
2. Check equirectangular format
3. Re-export from 360° camera
4. Use proper stitching software

### Hotspots Not Clickable

**Cause:** Z-index or positioning issue.

**Solution:**
1. Check CSS z-index values
2. Verify hotspot coordinates
3. Test with browser dev tools
4. Update Pannellum library

### Poor Performance

**Cause:** Large image files or too many scenes.

**Solution:**
1. Compress images (< 5MB each)
2. Reduce image resolution
3. Limit concurrent scene loading
4. Enable progressive loading
5. Use CDN for image hosting

## Resources

- [Pannellum Documentation](https://pannellum.org/documentation/overview/)
- [360° Photography Guide](https://www.360cities.net/tutorials)
- [Equirectangular Projection](https://en.wikipedia.org/wiki/Equirectangular_projection)
- [WebVR/WebXR Standards](https://immersiveweb.dev/)
- [Virtual Tour Best Practices](https://www.matterport.com/resources/virtual-tour-best-practices)
