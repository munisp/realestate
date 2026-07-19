# Buyer Dashboard Documentation

## Overview

The Buyer Dashboard is a customizable command center for home buyers, featuring draggable and resizable widgets that display key information about saved searches, recently viewed properties, price alerts, upcoming tours, submitted offers, mortgage calculations, and market trends.

## Features

### ✅ Implemented Features

1. **Customizable Layout**
   - Drag-and-drop widget repositioning
   - Resize widgets by dragging corners
   - Save layout preferences to localStorage
   - Reset to default layout
   - Edit mode toggle

2. **Saved Searches Widget**
   - Display up to 3 recent saved searches
   - Show boundary type (polygon/circle/rectangle)
   - Quick link to view all searches
   - Badge showing total count

3. **Recently Viewed Widget**
   - Display last 3 viewed properties
   - Show property address, price, beds/baths
   - Click to view property details
   - Link to browse more properties

4. **Price Alerts Widget**
   - Show active price alerts
   - Display alert frequency and status
   - Badge showing total alert count
   - Link to manage alerts

5. **Tour Schedule Widget**
   - Display upcoming tours (pending/confirmed)
   - Show date, time, and tour type
   - Badge for in-person vs virtual
   - Link to view all tours

6. **Offers Tracker Widget**
   - Show submitted offers
   - Display offer amount and status
   - Color-coded status badges
   - Link to view all offers

7. **Mortgage Calculator Widget**
   - Interactive calculator
   - Inputs: home price, down payment %, interest rate, loan term
   - Real-time monthly payment calculation
   - Responsive to user input

8. **Market Trends Widget**
   - Average home price with trend indicator
   - Days on market statistics
   - Inventory levels
   - Link to full market report

## User Flow

### Accessing the Dashboard

1. **Navigate to Dashboard**
   - Go to `/buyer-dashboard-custom`
   - Dashboard loads with default layout

2. **View Widgets**
   - All widgets display relevant data
   - Scroll within widgets for more content
   - Click "View All" links for detailed pages

### Customizing Layout

1. **Enter Edit Mode**
   - Click "Customize" button in header
   - Edit mode banner appears
   - Drag handles visible on widgets

2. **Rearrange Widgets**
   - Click and drag widgets to new positions
   - Grid automatically adjusts
   - Other widgets reflow around moved widget

3. **Resize Widgets**
   - Drag bottom-right corner to resize
   - Minimum and maximum sizes enforced
   - Content adapts to new size

4. **Save Layout**
   - Click "Done Editing" to save
   - Layout saved to localStorage
   - Persists across sessions

5. **Reset Layout**
   - Click "Reset Layout" in edit mode
   - Restores default widget positions
   - Confirmation toast appears

### Using Widgets

#### Saved Searches
- View recent saved searches
- Click search to view details
- See boundary type at a glance
- Navigate to full list

#### Recently Viewed
- See last 3 properties viewed
- Click property to view details
- Quick access to browsing history
- Link to property listings

#### Price Alerts
- Monitor active alerts
- See alert frequency
- Check active/inactive status
- Manage alert settings

#### Tour Schedule
- View upcoming tours
- See date and time
- Identify tour type
- Access full calendar

#### Offers Tracker
- Track submitted offers
- Monitor offer status
- See offer amounts
- View offer details

#### Mortgage Calculator
- Enter home price
- Set down payment percentage
- Adjust interest rate
- Select loan term
- See monthly payment instantly

#### Market Trends
- View average prices
- Monitor days on market
- Check inventory levels
- Access detailed reports

## Technical Implementation

### React Grid Layout

```typescript
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizable.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
```

**Configuration:**
```typescript
<ResponsiveGridLayout
  className="layout"
  layouts={layouts}
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
  rowHeight={150}
  isDraggable={isEditMode}
  isResizable={isEditMode}
  onLayoutChange={handleLayoutChange}
  draggableHandle=".drag-handle"
/>
```

### Layout State Management

```typescript
const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
  lg: [
    { i: 'saved-searches', x: 0, y: 0, w: 4, h: 2 },
    { i: 'recent-views', x: 4, y: 0, w: 4, h: 2 },
    { i: 'price-alerts', x: 8, y: 0, w: 4, h: 2 },
    { i: 'tour-schedule', x: 0, y: 2, w: 4, h: 2 },
    { i: 'offers-tracker', x: 4, y: 2, w: 4, h: 2 },
    { i: 'mortgage-calc', x: 8, y: 2, w: 4, h: 2 },
    { i: 'market-trends', x: 0, y: 4, w: 6, h: 2 },
  ],
});
```

### LocalStorage Persistence

```typescript
// Save layout
const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
  if (isEditMode) {
    setLayouts(layouts);
    localStorage.setItem('buyerDashboardLayout', JSON.stringify(layouts));
  }
};

// Load layout
useEffect(() => {
  const saved = localStorage.getItem('buyerDashboardLayout');
  if (saved) {
    try {
      setLayouts(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load saved layout:', e);
    }
  }
}, []);
```

### Widget Component Structure

```typescript
function WidgetName() {
  const { data, isLoading } = trpc.endpoint.useQuery();

  if (isLoading) {
    return <div className="animate-pulse h-full bg-muted rounded" />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Widget Title</h3>
        </div>
        <Badge variant="secondary">{data?.length || 0}</Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {/* Widget content */}
      </div>

      {/* Footer */}
      <Link href="/details">
        <Button variant="outline" size="sm" className="w-full mt-2">
          View All
        </Button>
      </Link>
    </div>
  );
}
```

### Drag Handle

```typescript
{isEditMode && (
  <div className="drag-handle absolute top-2 right-2 cursor-move">
    <GripVertical className="h-4 w-4 text-muted-foreground" />
  </div>
)}
```

## API Integration

### Saved Searches
```typescript
trpc.mapSearch.getSavedSearches.useQuery()
```

### Recently Viewed
```typescript
trpc.properties.getRecentlyViewed.useQuery({ limit: 3 })
```

### Price Alerts
```typescript
trpc.alerts.getMyAlerts.useQuery()
```

### Tour Schedule
```typescript
trpc.tours.getMyTours.useQuery()
```

### Offers Tracker
```typescript
trpc.offers.getMyOffers.useQuery()
```

## Responsive Design

### Breakpoints

- **lg**: 1200px+ (12 columns)
- **md**: 996px-1199px (10 columns)
- **sm**: 768px-995px (6 columns)
- **xs**: 480px-767px (4 columns)
- **xxs**: 0-479px (2 columns)

### Widget Sizing

- **Width**: 1-12 columns (lg)
- **Height**: Multiple of rowHeight (150px)
- **Minimum**: 2 columns × 1 row
- **Maximum**: 12 columns × 4 rows

### Mobile Optimization

On small screens:
- Widgets stack vertically
- Full-width layout
- Scrollable content
- Touch-friendly drag handles

## Styling

### Card Styling

```typescript
<Card className="h-full">
  <CardContent className="p-4 h-full relative">
    {/* Widget content */}
  </CardContent>
</Card>
```

### Widget Content

```css
.h-full - Full height container
.flex-col - Vertical flex layout
.overflow-y-auto - Scrollable content
.space-y-2 - Vertical spacing between items
```

### Edit Mode Banner

```typescript
<div className="mb-4 p-4 bg-primary/10 border border-primary rounded-lg">
  <p className="text-sm">
    <strong>Edit Mode:</strong> Instructions...
  </p>
</div>
```

## Performance Optimization

### Lazy Loading

```typescript
const { data, isLoading } = trpc.endpoint.useQuery({
  enabled: true, // Only fetch when needed
});
```

### Memoization

```typescript
const monthlyPayment = useMemo(() => {
  return calculateMonthlyPayment();
}, [price, downPayment, interestRate, loanTerm]);
```

### Debounced Layout Save

```typescript
const debouncedSave = useMemo(
  () =>
    debounce((layouts: { [key: string]: Layout[] }) => {
      localStorage.setItem('buyerDashboardLayout', JSON.stringify(layouts));
    }, 500),
  []
);
```

## Accessibility

### Keyboard Navigation

- Tab through widgets
- Enter to activate drag
- Arrow keys to move
- Escape to cancel

### Screen Readers

```typescript
<div role="region" aria-label="Buyer Dashboard">
  <div role="grid" aria-label="Customizable widget layout">
    {/* Widgets */}
  </div>
</div>
```

### Focus Management

```typescript
<Button
  aria-label="Customize dashboard layout"
  onClick={() => setIsEditMode(!isEditMode)}
>
  <Settings className="h-4 w-4 mr-2" />
  {isEditMode ? 'Done Editing' : 'Customize'}
</Button>
```

## Testing

### Manual Testing

1. **Layout Customization**
   - Enter edit mode
   - Drag widgets to new positions
   - Resize widgets
   - Exit edit mode
   - Verify layout persists on reload

2. **Widget Functionality**
   - Click "View All" links
   - Verify navigation to detail pages
   - Check data updates
   - Test empty states

3. **Responsive Behavior**
   - Resize browser window
   - Check widget reflow
   - Verify mobile layout
   - Test touch interactions

4. **Calculator**
   - Enter different values
   - Verify calculations
   - Check edge cases (zero, negative)
   - Test decimal inputs

### Automated Testing

```typescript
// Test layout save
test('saves layout to localStorage', () => {
  const { result } = renderHook(() => useDashboardLayout());
  
  act(() => {
    result.current.updateLayout(newLayout);
  });
  
  const saved = localStorage.getItem('buyerDashboardLayout');
  expect(saved).toBeTruthy();
  expect(JSON.parse(saved!)).toEqual(newLayout);
});

// Test mortgage calculation
test('calculates monthly payment correctly', () => {
  const payment = calculateMonthlyPayment({
    price: 500000,
    downPayment: 20,
    interestRate: 6.5,
    loanTerm: 30,
  });
  
  expect(payment).toBeCloseTo(2528, 0);
});
```

## Future Enhancements

- [ ] Add more widget types (weather, news, calendar)
- [ ] Widget visibility toggles (show/hide)
- [ ] Multiple dashboard templates
- [ ] Share dashboard layouts
- [ ] Export dashboard as PDF
- [ ] Widget refresh intervals
- [ ] Real-time data updates via WebSocket
- [ ] Widget-specific settings
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Undo/redo layout changes
- [ ] Widget search/filter
- [ ] Custom widget creation
- [ ] Dashboard analytics
- [ ] Mobile app version

## Troubleshooting

### Layout Not Saving

**Cause:** LocalStorage disabled or full.

**Solution:**
1. Check browser settings
2. Clear localStorage
3. Enable cookies/storage
4. Check storage quota

### Widgets Not Loading

**Cause:** API errors or network issues.

**Solution:**
1. Check browser console
2. Verify API endpoints
3. Check authentication
4. Retry data fetch

### Drag Not Working

**Cause:** Edit mode not enabled or touch issues.

**Solution:**
1. Click "Customize" button
2. Check drag handle visibility
3. Use mouse instead of touch
4. Refresh page

### Calculator Wrong Results

**Cause:** Invalid inputs or formula error.

**Solution:**
1. Check input values
2. Verify formula
3. Test with known values
4. Check for NaN/Infinity

## Resources

- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
- [Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Mortgage Calculator Formula](https://www.investopedia.com/mortgage-calculator-5084794)
