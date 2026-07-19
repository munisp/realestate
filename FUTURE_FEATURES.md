# Future Features Implementation Guide

This document outlines the implementation approach for advanced features that require external data sources or additional infrastructure.

## Property History Tracking

### Overview
Track and visualize property price changes, market trends, and viewing statistics over time.

### Database Schema
```sql
CREATE TABLE propertyPriceHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  priceChange DECIMAL(12,2),
  changePercentage DECIMAL(5,2),
  recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50), -- 'listing', 'sale', 'appraisal'
  FOREIGN KEY (propertyId) REFERENCES properties(id)
);
```

### Implementation Steps

1. **Price History Tracking**
   - Create a background job that runs daily to snapshot current property prices
   - Store price changes in `propertyPriceHistory` table
   - Calculate price change percentage and trends

2. **Chart Component**
   ```tsx
   import { Line } from 'react-chartjs-2';
   
   export function PriceHistoryChart({ propertyId }: { propertyId: number }) {
     const { data } = trpc.properties.priceHistory.useQuery({ propertyId });
     
     const chartData = {
       labels: data?.map(d => new Date(d.recordedAt).toLocaleDateString()),
       datasets: [{
         label: 'Price',
         data: data?.map(d => d.price),
         borderColor: 'rgb(75, 192, 192)',
         tension: 0.1
       }]
     };
     
     return <Line data={chartData} />;
   }
   ```

3. **Market Insights**
   - Days on market: Track `createdAt` to current date
   - View count trends: Use existing `propertyViews` table
   - Price predictions: Integrate ML model for trend forecasting

### API Endpoints
```typescript
properties: router({
  priceHistory: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPropertyPriceHistory(input.propertyId);
    }),
    
  marketInsights: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const property = await db.getPropertyById(input.propertyId);
      const daysOnMarket = Math.floor(
        (Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const viewTrend = await db.getPropertyViewTrend(input.propertyId);
      
      return {
        daysOnMarket,
        viewTrend,
        priceChange: await db.getLatestPriceChange(input.propertyId),
      };
    }),
})
```

---

## Neighborhood Insights

### Overview
Provide comprehensive neighborhood data including schools, crime statistics, amenities, and demographics.

### External APIs Required

1. **School Ratings**: GreatSchools API
   - Endpoint: `https://api.greatschools.org/schools/nearby`
   - Data: School names, ratings (1-10), distance, type (elementary/middle/high)

2. **Crime Statistics**: CrimeReports API or local police data
   - Endpoint: `https://api.crimereports.com/api/v1/incidents`
   - Data: Crime types, frequency, trends

3. **Walk Score**: Walk Score API
   - Endpoint: `https://api.walkscore.com/score`
   - Data: Walkability score (0-100), transit score, bike score

4. **Places API**: Google Places API (already integrated)
   - Nearby amenities: hospitals, shopping, restaurants, transit
   - Distance calculations

### Implementation Steps

1. **Create Neighborhood Insights Component**
   ```tsx
   export function NeighborhoodInsights({ 
     latitude, 
     longitude, 
     city 
   }: { 
     latitude: string; 
     longitude: string; 
     city: string;
   }) {
     const { data: schools } = trpc.neighborhood.schools.useQuery({ 
       lat: parseFloat(latitude), 
       lng: parseFloat(longitude) 
     });
     
     const { data: walkScore } = trpc.neighborhood.walkScore.useQuery({ 
       lat: parseFloat(latitude), 
       lng: parseFloat(longitude) 
     });
     
     const { data: crime } = trpc.neighborhood.crime.useQuery({ city });
     
     return (
       <Card>
         <CardHeader>
           <CardTitle>Neighborhood Insights</CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Walk Score */}
           <div>
             <h3 className="font-semibold mb-2">Walkability</h3>
             <div className="flex items-center gap-4">
               <div className="text-3xl font-bold">{walkScore?.score}</div>
               <Progress value={walkScore?.score} className="flex-1" />
               <span className="text-sm text-muted-foreground">
                 {walkScore?.description}
               </span>
             </div>
           </div>
           
           {/* Schools */}
           <div>
             <h3 className="font-semibold mb-2">Nearby Schools</h3>
             <div className="space-y-2">
               {schools?.map(school => (
                 <div key={school.id} className="flex justify-between items-center">
                   <div>
                     <div className="font-medium">{school.name}</div>
                     <div className="text-sm text-muted-foreground">
                       {school.type} • {school.distance} mi
                     </div>
                   </div>
                   <Badge variant={school.rating >= 8 ? "default" : "secondary"}>
                     {school.rating}/10
                   </Badge>
                 </div>
               ))}
             </div>
           </div>
           
           {/* Crime Statistics */}
           <div>
             <h3 className="font-semibold mb-2">Safety</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <div className="text-2xl font-bold">{crime?.safetyScore}</div>
                 <div className="text-sm text-muted-foreground">Safety Score</div>
               </div>
               <div>
                 <div className="text-sm text-muted-foreground">
                   {crime?.trend === 'decreasing' ? '↓' : '↑'} 
                   {crime?.changePercent}% vs last year
                 </div>
               </div>
             </div>
           </div>
         </CardContent>
       </Card>
     );
   }
   ```

2. **API Integration**
   ```typescript
   // server/integrations/neighborhood.ts
   export async function getSchoolRatings(lat: number, lng: number) {
     const response = await fetch(
       `https://api.greatschools.org/schools/nearby?lat=${lat}&lon=${lng}&radius=5&limit=10`,
       {
         headers: {
           'X-API-Key': process.env.GREATSCHOOLS_API_KEY!
         }
       }
     );
     return await response.json();
   }
   
   export async function getWalkScore(lat: number, lng: number, address: string) {
     const response = await fetch(
       `https://api.walkscore.com/score?format=json&lat=${lat}&lon=${lng}&address=${encodeURIComponent(address)}&wsapikey=${process.env.WALKSCORE_API_KEY}`
     );
     return await response.json();
   }
   
   export async function getCrimeData(city: string) {
     // Integrate with local crime API or use FBI Crime Data API
     const response = await fetch(
       `https://api.usa.gov/crime/fbi/sapi/api/summarized/agencies/${city}/offenses/2020/2023?API_KEY=${process.env.FBI_API_KEY}`
     );
     return await response.json();
   }
   ```

3. **Router Endpoints**
   ```typescript
   neighborhood: router({
     schools: publicProcedure
       .input(z.object({ lat: z.number(), lng: z.number() }))
       .query(async ({ input }) => {
         return await getSchoolRatings(input.lat, input.lng);
       }),
       
     walkScore: publicProcedure
       .input(z.object({ 
         lat: z.number(), 
         lng: z.number(), 
         address: z.string() 
       }))
       .query(async ({ input }) => {
         return await getWalkScore(input.lat, input.lng, input.address);
       }),
       
     crime: publicProcedure
       .input(z.object({ city: z.string() }))
       .query(async ({ input }) => {
         return await getCrimeData(input.city);
       }),
       
     amenities: publicProcedure
       .input(z.object({ lat: z.number(), lng: z.number() }))
       .query(async ({ input }) => {
         // Use Google Places API (already integrated)
         const { searchNearby } = await import("./_core/map");
         const hospitals = await searchNearby(input.lat, input.lng, 'hospital');
         const shopping = await searchNearby(input.lat, input.lng, 'shopping_mall');
         const transit = await searchNearby(input.lat, input.lng, 'transit_station');
         
         return { hospitals, shopping, transit };
       }),
   })
   ```

### Environment Variables Required
```env
# Add to .env
GREATSCHOOLS_API_KEY=your_greatschools_api_key
WALKSCORE_API_KEY=your_walkscore_api_key
FBI_API_KEY=your_fbi_crime_data_api_key
```

### Integration on Property Detail Page
```tsx
// In PropertyDetail.tsx, add a new tab
<TabsTrigger value="neighborhood">Neighborhood</TabsTrigger>

<TabsContent value="neighborhood">
  <NeighborhoodInsights 
    latitude={property.latitude}
    longitude={property.longitude}
    city={property.city}
  />
</TabsContent>
```

---

## Additional Recommendations

### 1. Property Comparison Enhancement
- Add print/export to PDF functionality
- Save comparison sessions for later review
- Share comparison links with others

### 2. Advanced Search
- Natural language search: "3 bedroom house under $500k near good schools"
- Voice search integration
- Search history and suggestions

### 3. Notification System
- Real-time WebSocket notifications for new messages
- Push notifications for mobile app
- Email digest of saved search matches

### 4. Analytics Dashboard
- Property owner analytics (views, favorites, inquiries)
- Market trend analysis
- Competitive pricing insights

---

## Development Priority

**High Priority** (Implement First):
1. Property History Tracking - Uses existing data, no external APIs
2. Basic Neighborhood Insights - Use Google Places API (already integrated)

**Medium Priority**:
3. Walk Score Integration - Simple API, high value
4. School Ratings - Important for family buyers

**Low Priority** (Nice to Have):
5. Crime Statistics - Requires careful handling, may need local data sources
6. Advanced demographic data - Complex data sources

---

## Testing Checklist

- [ ] Price history chart renders correctly with sample data
- [ ] Market insights calculations are accurate
- [ ] School ratings display with correct distance calculations
- [ ] Walk score API integration works
- [ ] Crime data displays safely and accurately
- [ ] Amenities map markers render correctly
- [ ] All API keys are properly secured
- [ ] Error handling for failed API calls
- [ ] Loading states for async data
- [ ] Mobile responsiveness of all components

---

## Notes

- Always cache external API responses to reduce costs and improve performance
- Implement rate limiting for API calls
- Consider using a background job system (e.g., Bull, Agenda) for periodic data updates
- Store frequently accessed data (schools, walk scores) in the database after first fetch
- Provide fallback UI when external APIs are unavailable
