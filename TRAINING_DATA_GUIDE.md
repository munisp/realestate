# Training Data Collection Guide

Complete guide for collecting and preparing training data for Zestimate ML models.

---

## Overview

The Zestimate ML system requires historical property sales data to train 5 machine learning models:

1. **Graph Neural Network (GNN)** - Neighborhood influence analysis
2. **Computer Vision** - Aerial and street view assessment
3. **Alternative Data** - POI, economic indicators, behavioral signals
4. **Ensemble Models** - XGBoost, LightGBM, CatBoost, Neural Network
5. **Bias Correction** - Fairness monitoring and bias mitigation

---

## Data Requirements

### Minimum Dataset Size

| Model | Minimum Properties | Recommended |
|-------|-------------------|-------------|
| GNN | 5,000 | 50,000+ |
| Computer Vision | 10,000 images | 100,000+ |
| Ensemble Models | 10,000 | 100,000+ |
| Bias Correction | Same as training set | Same |

**Recommendation:** Collect at least **2 years** of historical sales data

---

## Step 1: Run Data Collection Script

### 1.1 Prerequisites

Ensure you have:
- ✅ Database with sold properties
- ✅ At least 2 years of historical sales
- ✅ Properties with complete data (price, sqft, beds, baths, location)

### 1.2 Execute Script

```bash
cd /home/ubuntu/realestate-platform
node scripts/collect-training-data.mjs
```

### 1.3 Expected Output

The script will generate:

```
data/training/
├── historical_sales.csv          # All sold properties
├── neighborhood_graph.csv        # K-nearest neighbors graph
├── engineered_features.csv       # Derived features
├── train.csv                     # 80% training set
├── test.csv                      # 20% test set
└── summary_stats.json            # Dataset statistics
```

---

## Step 2: Validate Data Quality

### 2.1 Check Summary Statistics

```bash
cat data/training/summary_stats.json
```

Expected output:
```json
{
  "total_properties": 15234,
  "train_size": 12187,
  "test_size": 3047,
  "date_range": {
    "start": "2023-11-20T00:00:00.000Z",
    "end": "2025-11-20T00:00:00.000Z"
  },
  "price_stats": {
    "min": 50000000,
    "max": 500000000,
    "mean": 125000000
  },
  "neighborhood_graph": {
    "total_edges": 45678,
    "avg_neighbors_per_property": 3.0
  }
}
```

### 2.2 Data Quality Checks

Run these checks:

```bash
# Check for missing values
awk -F',' '{for(i=1;i<=NF;i++) if($i=="") print NR":"i}' data/training/train.csv | wc -l

# Check price distribution
awk -F',' 'NR>1 {print $2}' data/training/train.csv | sort -n | head -20

# Check for outliers (prices > 3 std dev)
awk -F',' 'NR>1 {sum+=$2; sumsq+=$2*$2; n++} END {
  mean=sum/n; 
  std=sqrt(sumsq/n - mean*mean); 
  print "Mean:", mean, "Std:", std, "3σ:", mean+3*std
}' data/training/train.csv
```

### 2.3 Data Cleaning

If you find issues:

**Missing Values:**
- Remove properties with missing critical fields (price, sqft)
- Impute missing non-critical fields (year_built, bathrooms)

**Outliers:**
- Remove properties with prices > 3 standard deviations
- Remove properties with unrealistic sqft (< 100 or > 50,000)

**Duplicates:**
```bash
# Find duplicates
awk -F',' 'NR>1 {print $1}' data/training/train.csv | sort | uniq -d
```

---

## Step 3: Prepare Data for Each Model

### 3.1 GNN Training Data

**Input:** `neighborhood_graph.csv`

**Format:**
```csv
property_id,neighbor_id,distance_miles,neighbor_price,neighbor_sqft,neighbor_beds,neighbor_baths
1,2,0.3,120000000,2500,3,2
1,5,0.5,115000000,2300,3,2
```

**Requirements:**
- Each property should have 5-10 neighbors
- Neighbors within 2 miles (3.2 km)
- Include neighbor features for edge embeddings

### 3.2 Computer Vision Training Data

**Input:** Property images (aerial + street view)

**Collection:**
```bash
# Use Google Maps API to fetch images
# See GOOGLE_MAPS_API_SETUP.md for details

# Example: Fetch aerial image
curl "https://maps.googleapis.com/maps/api/staticmap?center=6.5244,3.3792&zoom=18&size=400x400&maptype=satellite&key=YOUR_KEY" -o aerial_1.jpg

# Example: Fetch street view
curl "https://maps.googleapis.com/maps/api/streetview?size=400x400&location=6.5244,3.3792&key=YOUR_KEY" -o street_1.jpg
```

**Storage:**
```
data/training/images/
├── aerial/
│   ├── 1.jpg
│   ├── 2.jpg
│   └── ...
└── street/
    ├── 1.jpg
    ├── 2.jpg
    └── ...
```

**Labels:** Use `historical_sales.csv` for ground truth prices

### 3.3 Alternative Data

**Input:** POI data, economic indicators

**Collection:**
```bash
# Use Google Places API
# For each property, find nearby:
# - Schools (within 2 miles)
# - Restaurants (within 1 mile)
# - Shopping centers (within 2 miles)
# - Healthcare facilities (within 3 miles)

# Example: Find nearby schools
curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=6.5244,3.3792&radius=3200&type=school&key=YOUR_KEY"
```

**Format:**
```csv
property_id,schools_count,schools_avg_distance,restaurants_count,restaurants_avg_distance,shopping_count,shopping_avg_distance,healthcare_count,healthcare_avg_distance
1,5,0.8,12,0.5,8,1.2,3,2.1
```

### 3.4 Ensemble Models Training Data

**Input:** `train.csv` + `engineered_features.csv`

**Features:**
- Basic: price, sqft, beds, baths, year_built, lat, lng
- Engineered: age, price_per_sqft, bed_bath_ratio, log_price, log_sqft
- Neighborhood: avg_neighbor_price, price_percentile_in_neighborhood
- POI: schools_count, restaurants_count, etc.

**Target:** `actual_price`

---

## Step 4: Feature Engineering

### 4.1 Temporal Features

```python
# Add temporal features
df['year'] = pd.to_datetime(df['sold_date']).dt.year
df['month'] = pd.to_datetime(df['sold_date']).dt.month
df['quarter'] = pd.to_datetime(df['sold_date']).dt.quarter
df['days_since_2020'] = (pd.to_datetime(df['sold_date']) - pd.Timestamp('2020-01-01')).dt.days
```

### 4.2 Geospatial Features

```python
# Add geospatial features
from sklearn.cluster import KMeans

# Cluster properties into neighborhoods
kmeans = KMeans(n_clusters=50, random_state=42)
df['neighborhood_cluster'] = kmeans.fit_predict(df[['latitude', 'longitude']])

# Calculate distance to city center (Lagos)
lagos_center = (6.5244, 3.3792)
df['distance_to_center'] = df.apply(
    lambda row: haversine((row['latitude'], row['longitude']), lagos_center),
    axis=1
)
```

### 4.3 Interaction Features

```python
# Add interaction features
df['sqft_x_beds'] = df['square_feet'] * df['bedrooms']
df['sqft_x_baths'] = df['square_feet'] * df['bathrooms']
df['age_x_sqft'] = df['age'] * df['square_feet']
df['price_per_room'] = df['price'] / (df['bedrooms'] + df['bathrooms'])
```

---

## Step 5: Train/Test Split Strategy

### 5.1 Time-Based Split (Recommended)

```python
# Split by date to simulate real-world scenario
train = df[df['sold_date'] < '2025-01-01']
test = df[df['sold_date'] >= '2025-01-01']
```

**Advantages:**
- Realistic evaluation
- Prevents data leakage
- Tests model on future data

### 5.2 Random Split

```python
# 80/20 random split
from sklearn.model_selection import train_test_split
train, test = train_test_split(df, test_size=0.2, random_state=42)
```

**Advantages:**
- Balanced distribution
- Larger training set

### 5.3 Stratified Split

```python
# Stratify by price range
df['price_bin'] = pd.qcut(df['price'], q=5, labels=['very_low', 'low', 'medium', 'high', 'very_high'])
train, test = train_test_split(df, test_size=0.2, stratify=df['price_bin'], random_state=42)
```

**Advantages:**
- Balanced price distribution
- Better evaluation across price ranges

---

## Step 6: Data Augmentation

### 6.1 Image Augmentation (Computer Vision)

```python
from torchvision import transforms

augmentation = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.RandomResizedCrop(size=224, scale=(0.8, 1.0)),
])
```

### 6.2 Synthetic Minority Oversampling (SMOTE)

```python
from imblearn.over_sampling import SMOTE

# Balance price ranges
smote = SMOTE(random_state=42)
X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
```

---

## Step 7: Data Versioning

### 7.1 Track Dataset Versions

```bash
# Create version tag
echo "v1.0-$(date +%Y%m%d)" > data/training/VERSION

# Calculate dataset hash
find data/training -type f -name "*.csv" -exec md5sum {} \; | md5sum > data/training/CHECKSUM
```

### 7.2 Document Changes

Create `data/training/CHANGELOG.md`:

```markdown
# Training Data Changelog

## v1.0-20251120
- Initial dataset collection
- 15,234 sold properties from 2023-2025
- Train/test split: 80/20
- Neighborhood graph with avg 3.0 neighbors per property

## v1.1-20251201
- Added 5,000 new properties
- Improved data cleaning (removed outliers)
- Added engineered features
```

---

## Step 8: Continuous Data Collection

### 8.1 Automate Data Updates

Add to cron:

```bash
# Run daily at 2 AM
0 2 * * * cd /home/ubuntu/realestate-platform && node scripts/collect-training-data.mjs >> logs/data-collection.log 2>&1
```

### 8.2 Incremental Updates

```javascript
// Only collect new sold properties
const lastCollectionDate = await getLastCollectionDate();
const newSales = await db
  .select()
  .from(properties)
  .where(
    and(
      eq(properties.status, 'sold'),
      gte(properties.updatedAt, lastCollectionDate)
    )
  );
```

---

## Step 9: Model Training

### 9.1 GNN Training

```bash
cd ml-services/gnn-valuation-service
python train_gnn.py --data ../../data/training/neighborhood_graph.csv --epochs 100
```

### 9.2 Ensemble Training

```bash
cd ml-services/ensemble-service
python train_ensemble.py --data ../../data/training/train.csv --models xgboost,lightgbm,catboost
```

### 9.3 Computer Vision Training

```bash
cd ml-services/cv-service
python train_cv.py --aerial-images ../../data/training/images/aerial --street-images ../../data/training/images/street
```

---

## Troubleshooting

### Issue: Insufficient Data

**Solution:**
- Extend date range (3-5 years)
- Include pending/active listings (with estimated prices)
- Use synthetic data generation

### Issue: Imbalanced Price Distribution

**Solution:**
- Use stratified sampling
- Apply SMOTE for minority classes
- Use weighted loss functions

### Issue: Missing Geospatial Data

**Solution:**
- Use geocoding API to fill missing lat/lng
- Remove properties without location data
- Use city/zip code as fallback

---

## Next Steps

After data collection:

1. ✅ Train GNN model
2. ✅ Train ensemble models
3. ✅ Train computer vision models
4. ✅ Calibrate bias correction
5. ✅ Evaluate on test set (target MAPE < 5%)
6. ✅ Deploy models to production

---

**Last Updated:** 2025-11-20
