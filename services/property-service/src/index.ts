import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: { address: string; city: string; state: string; country: string; lat?: number; lon?: number };
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  type: 'HOUSE' | 'APARTMENT' | 'CONDO' | 'LAND' | 'COMMERCIAL';
  status: 'AVAILABLE' | 'PENDING' | 'SOLD' | 'RENTED';
  sellerId: string;
  images: string[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

class PropertyService {
  private properties = new Map<string, Property>();

  create(data: Omit<Property, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const property: Property = {
      ...data,
      id: uuidv4(),
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.properties.set(property.id, property);
    return property;
  }

  get(id: string) {
    return this.properties.get(id);
  }

  list(filters?: { city?: string; minPrice?: number; maxPrice?: number; type?: string; status?: string }) {
    let results = Array.from(this.properties.values());
    if (filters?.city) results = results.filter(p => p.location.city === filters.city);
    if (filters?.minPrice) results = results.filter(p => p.price >= filters.minPrice!);
    if (filters?.maxPrice) results = results.filter(p => p.price <= filters.maxPrice!);
    if (filters?.type) results = results.filter(p => p.type === filters.type);
    if (filters?.status) results = results.filter(p => p.status === filters.status);
    return results;
  }

  update(id: string, updates: Partial<Property>) {
    const property = this.properties.get(id);
    if (!property) throw new Error('Property not found');
    Object.assign(property, updates, { updatedAt: new Date().toISOString() });
    this.properties.set(id, property);
    return property;
  }

  updateStatus(id: string, status: Property['status']) {
    return this.update(id, { status });
  }

  delete(id: string) {
    return this.properties.delete(id);
  }

  search(query: string) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.properties.values()).filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.location.city.toLowerCase().includes(lowerQuery)
    );
  }
}

const service = new PropertyService();

app.post('/properties', (req, res) => {
  try {
    const property = service.create(req.body);
    res.status(201).json(property);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/properties/:id', (req, res) => {
  const property = service.get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Not found' });
  res.json(property);
});

app.get('/properties', (req, res) => {
  const properties = service.list(req.query as any);
  res.json(properties);
});

app.put('/properties/:id', (req, res) => {
  try {
    const property = service.update(req.params.id, req.body);
    res.json(property);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/properties/:id/status', (req, res) => {
  try {
    const property = service.updateStatus(req.params.id, req.body.status);
    res.json(property);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/properties/:id', (req, res) => {
  const deleted = service.delete(req.params.id);
  res.json({ success: deleted });
});

app.get('/search', (req, res) => {
  const results = service.search(req.query.q as string || '');
  res.json(results);
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'property' }));

app.listen(process.env.PORT || 5112, () => console.log('Property service running'));
