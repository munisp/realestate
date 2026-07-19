import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

interface Property {
  id: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  location: string;
  propertyType: string;
  amenities: string[];
}

interface UserPreferences {
  userId: string;
  minPrice?: number;
  maxPrice?: number;
  preferredLocations?: string[];
  minBedrooms?: number;
  requiredAmenities?: string[];
  viewHistory: string[];
  savedProperties: string[];
}

class RecommendationService {
  private userPreferences: Map<string, UserPreferences> = new Map();
  private mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5103';

  async getRecommendations(userId: string, properties: Property[], method: 'hybrid' | 'collaborative' | 'content' = 'hybrid') {
    const userPrefs = this.userPreferences.get(userId) || {
      userId,
      viewHistory: [],
      savedProperties: []
    };

    try {
      const response = await axios.post(`${this.mlServiceUrl}/recommend/${method}`, {
        userId,
        properties,
        userPreferences: userPrefs
      });

      return response.data;
    } catch (error) {
      console.error('ML service error, falling back to basic recommendations');
      return this.basicRecommendations(properties, userPrefs);
    }
  }

  async getLocationBasedRecommendations(
    userLocation: { latitude: number; longitude: number },
    properties: Property[],
    maxDistanceKm: number = 10
  ) {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/recommend/location`, {
        userLocation,
        properties,
        maxDistanceKm
      });

      return response.data;
    } catch (error) {
      console.error('ML service error for location recommendations');
      return properties.slice(0, 10);
    }
  }

  async getSimilarProperties(propertyId: string, allProperties: Property[]) {
    const targetProperty = allProperties.find(p => p.id === propertyId);
    if (!targetProperty) {
      return [];
    }

    const scored = allProperties
      .filter(p => p.id !== propertyId)
      .map(p => ({
        ...p,
        similarityScore: this.calculateSimilarity(targetProperty, p)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10);

    return scored;
  }

  async getTrendingProperties(properties: Property[], timeWindow: 'day' | 'week' | 'month' = 'week') {
    const viewCounts = new Map<string, number>();
    
    this.userPreferences.forEach(prefs => {
      prefs.viewHistory.forEach(propId => {
        viewCounts.set(propId, (viewCounts.get(propId) || 0) + 1);
      });
    });

    const trending = properties
      .map(p => ({
        ...p,
        viewCount: viewCounts.get(p.id) || 0,
        trendingScore: (viewCounts.get(p.id) || 0) * 10
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 20);

    return trending;
  }

  async getNewListings(properties: Property[], limit: number = 10) {
    return properties
      .sort((a, b) => (b as any).createdAt - (a as any).createdAt)
      .slice(0, limit);
  }

  async getPriceDropAlerts(userId: string, properties: Property[]) {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) {
      return [];
    }

    const savedProps = properties.filter(p => 
      userPrefs.savedProperties.includes(p.id)
    );

    return savedProps.filter(p => (p as any).priceDropPercentage > 5);
  }

  updateUserPreferences(userId: string, action: {
    type: 'VIEW' | 'SAVE' | 'CONTACT' | 'OFFER';
    propertyId: string;
    property?: Property;
  }) {
    let prefs = this.userPreferences.get(userId);
    
    if (!prefs) {
      prefs = {
        userId,
        viewHistory: [],
        savedProperties: []
      };
    }

    if (action.type === 'VIEW') {
      prefs.viewHistory.push(action.propertyId);
      if (prefs.viewHistory.length > 100) {
        prefs.viewHistory = prefs.viewHistory.slice(-100);
      }
    }

    if (action.type === 'SAVE') {
      if (!prefs.savedProperties.includes(action.propertyId)) {
        prefs.savedProperties.push(action.propertyId);
      }
    }

    if (action.property) {
      this.updatePreferencesFromProperty(prefs, action.property);
    }

    this.userPreferences.set(userId, prefs);

    axios.post(`${this.mlServiceUrl}/user/preferences`, {
      userId,
      property: action.property
    }).catch(err => console.error('Failed to update ML preferences:', err));

    return prefs;
  }

  private updatePreferencesFromProperty(prefs: UserPreferences, property: Property) {
    if (!prefs.preferredLocations) {
      prefs.preferredLocations = [];
    }

    if (!prefs.preferredLocations.includes(property.location)) {
      prefs.preferredLocations.push(property.location);
    }

    if (!prefs.minPrice || property.price < prefs.minPrice) {
      prefs.minPrice = property.price * 0.8;
    }

    if (!prefs.maxPrice || property.price > prefs.maxPrice) {
      prefs.maxPrice = property.price * 1.2;
    }

    if (!prefs.minBedrooms || property.bedrooms < prefs.minBedrooms) {
      prefs.minBedrooms = property.bedrooms;
    }
  }

  private calculateSimilarity(prop1: Property, prop2: Property): number {
    let score = 0;

    if (prop1.propertyType === prop2.propertyType) score += 30;
    if (prop1.location === prop2.location) score += 25;

    const priceDiff = Math.abs(prop1.price - prop2.price) / prop1.price;
    score += Math.max(0, 20 - priceDiff * 100);

    if (prop1.bedrooms === prop2.bedrooms) score += 15;
    if (prop1.bathrooms === prop2.bathrooms) score += 10;

    const commonAmenities = prop1.amenities.filter(a => prop2.amenities.includes(a));
    score += commonAmenities.length * 2;

    return score;
  }

  private basicRecommendations(properties: Property[], userPrefs: UserPreferences) {
    let filtered = properties;

    if (userPrefs.minPrice) {
      filtered = filtered.filter(p => p.price >= userPrefs.minPrice!);
    }

    if (userPrefs.maxPrice) {
      filtered = filtered.filter(p => p.price <= userPrefs.maxPrice!);
    }

    if (userPrefs.preferredLocations && userPrefs.preferredLocations.length > 0) {
      filtered = filtered.filter(p => userPrefs.preferredLocations!.includes(p.location));
    }

    if (userPrefs.minBedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= userPrefs.minBedrooms!);
    }

    return filtered.slice(0, 10);
  }
}

const service = new RecommendationService();

app.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { userId, properties, method } = req.body;
    const recommendations = await service.getRecommendations(userId, properties, method);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/recommend/location', async (req: Request, res: Response) => {
  try {
    const { userLocation, properties, maxDistanceKm } = req.body;
    const recommendations = await service.getLocationBasedRecommendations(
      userLocation, properties, maxDistanceKm
    );
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/similar/:propertyId', async (req: Request, res: Response) => {
  try {
    const { properties } = req.body;
    const similar = await service.getSimilarProperties(req.params.propertyId, properties);
    res.json(similar);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/trending', async (req: Request, res: Response) => {
  try {
    const { properties, timeWindow } = req.body;
    const trending = await service.getTrendingProperties(properties, timeWindow);
    res.json(trending);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/new-listings', async (req: Request, res: Response) => {
  try {
    const { properties, limit } = req.body;
    const newListings = await service.getNewListings(properties, limit);
    res.json(newListings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/price-drops/:userId', async (req: Request, res: Response) => {
  try {
    const { properties } = req.body;
    const alerts = await service.getPriceDropAlerts(req.params.userId, properties);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/user/:userId/action', async (req: Request, res: Response) => {
  try {
    const prefs = service.updateUserPreferences(req.params.userId, req.body);
    res.json(prefs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'recommendation' });
});

const PORT = process.env.PORT || 5106;
app.listen(PORT, () => {
  console.log(`Recommendation service running on port ${PORT}`);
});
