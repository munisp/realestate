# Property Comparison Matrix Documentation

## Overview

The Property Comparison Matrix is a comprehensive tool that allows users to compare 2-4 properties side-by-side with detailed feature breakdowns, visual indicators for best values, neighborhood statistics, cost analysis calculators, PDF export, and shareable comparison links.

## Features

### ✅ Implemented Features

1. **Side-by-Side Comparison**
   - Compare 2-4 properties simultaneously
   - Visual property cards with images
   - Remove properties from comparison
   - Add more properties dynamically

2. **Feature Comparison Table**
   - Price comparison with lowest/highest indicators
   - Bedrooms and bathrooms
   - Square footage with largest indicator
   - Price per square foot with best value indicator
   - Year built
   - Lot size
   - Property type
   - Parking spaces

3. **Visual Indicators**
   - Green checkmarks for best values
   - "Lowest Price" badge
   - "Highest Price" badge
   - "Best Value" badge for price/sq ft
   - Largest square footage indicator

4. **Cost Analysis Calculator**
   - Adjustable down payment percentage
   - Adjustable interest rate
   - Loan amount calculation
   - Monthly mortgage payment
   - Monthly property tax estimate
   - Monthly insurance estimate
   - Total monthly cost breakdown
   - Side-by-side cost comparison

5. **Neighborhood Comparison**
   - Average neighborhood price
   - Property count in area
   - Walk score
   - Side-by-side neighborhood stats

6. **Share Functionality**
   - Generate shareable comparison links
   - Copy link to clipboard
   - Load shared comparisons via URL

7. **PDF Export**
   - Print-friendly layout
   - Export comparison to PDF
   - Browser print dialog integration

## User Flow

### Starting a Comparison

1. **From Property Listings**
   - Browse properties at `/properties` or `/search`
   - Click "Compare" button on property cards
   - Select 2-4 properties to compare
   - Navigate to comparison page

2. **From URL Parameters**
   - Direct link: `/compare?ids=1,2,3,4`
   - Properties load automatically
   - Comparison displays immediately

3. **From Shared Link**
   - Receive shared comparison link
   - Click link to load comparison
   - View same properties as original user

### Using the Comparison Tool

1. **View Property Cards**
   - See property images
   - View addresses and locations
   - Check prices and basic info
   - Remove unwanted properties

2. **Compare Features**
   - Scroll through comparison table
   - Identify best values (green checkmarks)
   - Compare specific attributes
   - View property types

3. **Analyze Costs**
   - Adjust down payment percentage
   - Modify interest rate
   - View monthly payment breakdown
   - Compare total monthly costs
   - Evaluate affordability

4. **Compare Neighborhoods**
   - View average prices by area
   - Check property density
   - Review walk scores
   - Assess location quality

5. **Share Comparison**
   - Click "Share" button
   - Link copied to clipboard automatically
   - Send link to others
   - Recipients see same comparison

6. **Export to PDF**
   - Click "Export PDF" button
   - Browser print dialog opens
   - Save as PDF or print
   - Share printed comparison

### Managing Comparisons

1. **Add Properties**
   - Click "Add More Properties"
   - Return to search results
   - Select additional properties
   - Maximum 4 properties total

2. **Remove Properties**
   - Click X button on property card
   - Property removed from comparison
   - Minimum 2 properties required
   - Comparison updates automatically

3. **View Full Details**
   - Click "View Full Details" on any property
   - Navigate to property detail page
   - Return to comparison
   - Comparison state preserved

## Technical Implementation

### Backend API

#### Get Properties for Comparison

```typescript
trpc.comparison.getPropertiesForComparison.useQuery({
  propertyIds: [1, 2, 3, 4],
});
```

**Response:**
```typescript
{
  properties: Property[]
}
```

#### Save Comparison

```typescript
trpc.comparison.saveComparison.useMutation({
  propertyIds: [1, 2, 3, 4],
  name: "My Comparison" // optional
});
```

**Response:**
```typescript
{
  success: true,
  shareCode: "abc123-encoded",
  shareUrl: "/compare?share=abc123-encoded"
}
```

#### Load Shared Comparison

```typescript
trpc.comparison.loadSharedComparison.useQuery({
  shareCode: "abc123-encoded"
});
```

**Response:**
```typescript
{
  properties: Property[],
  propertyIds: number[]
}
```

#### Calculate Cost Analysis

```typescript
trpc.comparison.calculateCostAnalysis.useQuery({
  propertyId: 1,
  downPaymentPercent: 20,
  interestRate: 6.5,
  loanTermYears: 30,
  propertyTaxRate: 1.2,
  hoaFees: 0,
  insurance: 1200,
  utilities: 200
});
```

**Response:**
```typescript
{
  price: number,
  downPayment: number,
  loanAmount: number,
  monthlyMortgage: number,
  monthlyPropertyTax: number,
  monthlyInsurance: number,
  monthlyHOA: number,
  monthlyUtilities: number,
  totalMonthly: number,
  totalAnnual: number
}
```

### Frontend Components

#### PropertyComparison Component

Main comparison page component.

**Props:** None (uses URL parameters)

**State:**
```typescript
const [selectedIds, setSelectedIds] = useState<number[]>([]);
```

**Key Functions:**
- `handleRemoveProperty(id)` - Remove property from comparison
- `handleAddProperty()` - Navigate to search to add more
- `handleShare()` - Generate and copy share link
- `handleExportPDF()` - Trigger browser print dialog

#### CostAnalysisWidget Component

Interactive cost calculator for individual properties.

**Props:**
```typescript
{
  propertyId: number
}
```

**State:**
```typescript
const [downPayment, setDownPayment] = useState(20);
const [interestRate, setInterestRate] = useState(6.5);
```

**Features:**
- Adjustable down payment slider
- Adjustable interest rate input
- Real-time calculation updates
- Detailed cost breakdown

### URL Parameters

#### Comparison by IDs

```
/compare?ids=1,2,3,4
```

Loads properties with IDs 1, 2, 3, and 4 for comparison.

#### Shared Comparison

```
/compare?share=abc123-encoded
```

Loads comparison from share code.

### Share Code Format

Share codes are generated as:
```
{randomCode}-{base64EncodedPropertyIds}
```

Example:
```
a1b2c3d4-WzEsMiwzLDRd
```

Where `WzEsMiwzLDRd` is base64 encoding of `[1,2,3,4]`.

### Cost Calculation Formula

#### Monthly Mortgage Payment

```typescript
const monthlyRate = annualRate / 100 / 12;
const numberOfPayments = loanTermYears * 12;

const monthlyPayment = 
  (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
  (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
```

#### Property Tax

```typescript
const monthlyPropertyTax = (price * (taxRate / 100)) / 12;
```

#### Total Monthly Cost

```typescript
const totalMonthly = 
  monthlyMortgage +
  monthlyPropertyTax +
  monthlyInsurance +
  monthlyHOA +
  monthlyUtilities;
```

## Styling

### Comparison Grid

```css
display: grid;
grid-template-columns: repeat(${propertyCount}, minmax(0, 1fr));
gap: 1rem;
```

### Visual Indicators

```typescript
{/* Best Value Badge */}
{value === bestValue && (
  <Badge variant="default">
    <Check className="h-3 w-3 mr-1" />
    Best Value
  </Badge>
)}

{/* Lowest Price Badge */}
{price === minPrice && (
  <Badge variant="default">
    <TrendingDown className="h-3 w-3 mr-1" />
    Lowest
  </Badge>
)}
```

### Print Styles

```css
@media print {
  .no-print {
    display: none;
  }
  
  .page-break {
    page-break-after: always;
  }
}
```

## Performance Optimization

### Data Fetching

```typescript
const { data, isLoading } = trpc.comparison.getPropertiesForComparison.useQuery(
  { propertyIds },
  { 
    enabled: propertyIds.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }
);
```

### Memoization

```typescript
const prices = useMemo(
  () => properties.map((p) => p.price || 0),
  [properties]
);

const minPrice = useMemo(
  () => Math.min(...prices),
  [prices]
);
```

### Debounced Inputs

```typescript
const debouncedDownPayment = useDebounce(downPayment, 500);

const { data } = trpc.comparison.calculateCostAnalysis.useQuery({
  propertyId,
  downPaymentPercent: debouncedDownPayment,
  interestRate,
});
```

## Accessibility

### Keyboard Navigation

- Tab through property cards
- Enter to view details
- Delete to remove property
- Arrow keys to navigate table

### Screen Readers

```typescript
<div role="region" aria-label="Property Comparison">
  <table aria-label="Feature comparison table">
    <thead>
      <tr>
        <th scope="col">Feature</th>
        {properties.map((p) => (
          <th key={p.id} scope="col">Property {p.id}</th>
        ))}
      </tr>
    </thead>
  </table>
</div>
```

### Focus Management

```typescript
<Button
  aria-label={`Remove ${property.addressLine1} from comparison`}
  onClick={() => handleRemoveProperty(property.id)}
>
  <X className="h-4 w-4" />
</Button>
```

## Testing

### Manual Testing

1. **Basic Comparison**
   - Add 2 properties
   - Verify side-by-side display
   - Check feature table accuracy
   - Confirm visual indicators

2. **Cost Analysis**
   - Adjust down payment
   - Modify interest rate
   - Verify calculations
   - Compare across properties

3. **Share Functionality**
   - Generate share link
   - Copy to clipboard
   - Open in new tab/browser
   - Verify same comparison loads

4. **PDF Export**
   - Click export button
   - Check print preview
   - Verify layout
   - Save as PDF

5. **Edge Cases**
   - Try adding 5th property (should error)
   - Remove until 1 property (should error)
   - Invalid share code
   - Missing property data

### Automated Testing

```typescript
// Test comparison loading
test('loads properties for comparison', async () => {
  const { result } = renderHook(() =>
    trpc.comparison.getPropertiesForComparison.useQuery({
      propertyIds: [1, 2, 3],
    })
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data.properties).toHaveLength(3);
});

// Test cost calculation
test('calculates monthly payment correctly', () => {
  const payment = calculateMonthlyPayment({
    principal: 400000,
    interestRate: 6.5,
    loanTermYears: 30,
  });

  expect(payment).toBeCloseTo(2528, 0);
});

// Test share code generation
test('generates valid share code', () => {
  const shareCode = generateShareCode([1, 2, 3, 4]);
  const decoded = decodeShareCode(shareCode);

  expect(decoded).toEqual([1, 2, 3, 4]);
});
```

## Future Enhancements

- [ ] Save comparison history for logged-in users
- [ ] Email comparison to friends/family
- [ ] Add custom notes to each property in comparison
- [ ] Compare neighborhood crime statistics
- [ ] Compare school ratings and boundaries
- [ ] Add commute time comparison
- [ ] Compare HOA rules and restrictions
- [ ] Add property appreciation projections
- [ ] Compare utility costs by season
- [ ] Add renovation cost estimates
- [ ] Compare insurance quotes
- [ ] Add mortgage pre-approval integration
- [ ] Compare closing cost estimates
- [ ] Add property inspection checklist comparison
- [ ] Compare property tax history
- [ ] Add flood zone and natural disaster risk comparison

## Troubleshooting

### Comparison Not Loading

**Cause:** Invalid property IDs or network error.

**Solution:**
1. Check URL parameters
2. Verify property IDs exist
3. Check network tab for errors
4. Refresh page

### Share Link Not Working

**Cause:** Invalid share code or expired link.

**Solution:**
1. Regenerate share link
2. Check share code format
3. Verify base64 encoding
4. Try direct ID comparison

### Cost Analysis Incorrect

**Cause:** Invalid input values or calculation error.

**Solution:**
1. Check input values (positive numbers)
2. Verify interest rate format (6.5, not 0.065)
3. Check property price exists
4. Review calculation formula

### PDF Export Issues

**Cause:** Browser print settings or CSS conflicts.

**Solution:**
1. Check browser print preview
2. Adjust print settings
3. Try different browser
4. Use "Save as PDF" option

## Resources

- [Mortgage Calculator Formula](https://www.investopedia.com/mortgage-calculator-5084794)
- [Property Comparison Best Practices](https://www.realtor.com/advice/buy/how-to-compare-homes/)
- [Print CSS Guide](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)
- [Share Link Security](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
