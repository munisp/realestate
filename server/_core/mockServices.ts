/**
 * Mock Service Implementations
 * 
 * Provides realistic mock responses for all microservices
 * Enables frontend development without running actual Docker services
 */

// ============================================================================
// Mock ML Valuation Service
// ============================================================================

export class MockMLValuationService {
  async valuateProperty(data: any) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    const basePrice = 300000;
    const bedroomValue = (data.features?.bedrooms || 0) * 50000;
    const bathroomValue = (data.features?.bathrooms || 0) * 30000;
    const sqftValue = (data.features?.sqft || 0) * 200;
    
    const estimatedValue = basePrice + bedroomValue + bathroomValue + sqftValue;
    const variance = estimatedValue * 0.1;

    return {
      propertyId: data.propertyId || `prop_${Date.now()}`,
      estimatedValue,
      confidence: 0.85,
      priceRange: {
        low: Math.round(estimatedValue - variance),
        high: Math.round(estimatedValue + variance),
      },
      comparables: [
        {
          id: 'comp_1',
          address: '456 Oak St',
          price: estimatedValue * 0.95,
          similarity: 0.92,
        },
        {
          id: 'comp_2',
          address: '789 Pine Ave',
          price: estimatedValue * 1.05,
          similarity: 0.88,
        },
      ],
      marketTrend: 'rising' as const,
      modelVersion: 'v2.1.0',
    };
  }

  async batchValuate(data: any) {
    const properties = data.properties || [];
    return Promise.all(properties.map((prop: any) => this.valuateProperty(prop)));
  }

  async getMarketTrends(params: any) {
    return {
      region: params.region,
      timeframe: params.timeframe,
      averagePrice: 450000,
      medianPrice: 425000,
      priceChange: 5.2,
      inventory: 1234,
      daysOnMarket: 45,
      trends: [
        { month: '2024-01', avgPrice: 420000 },
        { month: '2024-02', avgPrice: 430000 },
        { month: '2024-03', avgPrice: 450000 },
      ],
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'ml-valuation', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock OCR Service
// ============================================================================

export class MockOCRService {
  async processDocument(data: any) {
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockData: Record<string, any> = {
      id: {
        name: 'John Doe',
        documentNumber: 'ID123456789',
        dateOfBirth: '1990-01-15',
        expiryDate: '2030-01-15',
        address: '123 Main St, San Francisco, CA 94102',
      },
      passport: {
        name: 'Jane Smith',
        documentNumber: 'P987654321',
        dateOfBirth: '1985-05-20',
        expiryDate: '2028-05-20',
        nationality: 'USA',
      },
      driver_license: {
        name: 'Bob Johnson',
        documentNumber: 'DL456789123',
        dateOfBirth: '1992-08-10',
        expiryDate: '2026-08-10',
        address: '456 Oak Ave, Los Angeles, CA 90001',
      },
    };

    const docType = data.documentType || 'id';
    const structuredData = mockData[docType] || mockData.id;

    return {
      documentId: `doc_${Date.now()}`,
      documentType: docType,
      extractedText: `Full text extraction from ${docType}...`,
      structuredData,
      confidence: 0.92,
      faceImage: data.extractFace ? 'base64_encoded_face_image_data' : undefined,
      processingTime: 750,
    };
  }

  async verifyFaceMatch(data: any) {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      match: true,
      confidence: 0.89,
      similarity: 0.91,
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'ocr', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Fraud Detection Service
// ============================================================================

export class MockFraudDetectionService {
  async checkTransaction(data: any) {
    await new Promise(resolve => setTimeout(resolve, 400));

    const amount = data.amount || 0;
    let riskScore = 10;
    const flags = [];

    // Simulate risk calculation
    if (amount > 1000000) {
      riskScore += 30;
      flags.push({
        type: 'high_value',
        severity: 'medium',
        description: 'Transaction amount exceeds $1M',
      });
    }

    if (data.metadata?.ipAddress?.startsWith('192.168')) {
      riskScore += 5;
    }

    const riskLevel = riskScore < 30 ? 'low' : riskScore < 60 ? 'medium' : 'high';
    const recommendation = riskScore < 30 ? 'approve' : riskScore < 70 ? 'review' : 'reject';

    return {
      transactionId: data.transactionId || `txn_${Date.now()}`,
      riskScore,
      riskLevel,
      flags,
      recommendation,
      reasons: flags.length > 0 ? flags.map(f => f.description) : ['No significant risk factors detected'],
    };
  }

  async getUserRiskProfile(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      overallRiskScore: 15,
      transactionHistory: 42,
      flaggedTransactions: 2,
      lastReview: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'fraud-detection', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Geospatial Service
// ============================================================================

export class MockGeospatialService {
  async searchNearby(data: any) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const center = data.center || { lat: 37.7749, lng: -122.4194 };
    const radius = data.radius || 5000;
    const limit = data.limit || 10;

    const properties = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `prop_${i + 1}`,
      location: {
        lat: center.lat + (Math.random() - 0.5) * 0.01,
        lng: center.lng + (Math.random() - 0.5) * 0.01,
      },
      distance: Math.random() * radius,
      h3Index: `891f1d4a9${i}fffff`,
      title: `Property ${i + 1}`,
      price: 400000 + Math.random() * 200000,
    }));

    return {
      properties,
      total: properties.length,
      searchArea: { center, radius },
    };
  }

  async searchPolygon(data: any) {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      properties: [
        {
          id: 'prop_polygon_1',
          location: { lat: 37.7749, lng: -122.4194 },
          distance: 0,
          h3Index: '891f1d4a9ffffff',
          title: 'Property in Polygon',
          price: 500000,
        },
      ],
      total: 1,
      searchArea: { polygon: data.polygon },
    };
  }

  async getHeatmap(data: any) {
    await new Promise(resolve => setTimeout(resolve, 700));

    const points = Array.from({ length: 50 }, () => ({
      lat: 37.7 + Math.random() * 0.2,
      lng: -122.5 + Math.random() * 0.2,
      value: 300000 + Math.random() * 500000,
      intensity: Math.random(),
    }));

    return {
      points,
      bounds: data.bounds,
      resolution: data.resolution || 9,
      metric: 'price',
    };
  }

  async getNeighborhoodStats(h3Index: string) {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      h3Index,
      propertyCount: 156,
      averagePrice: 475000,
      pricePerSqft: 320,
      demographics: {
        population: 12500,
        medianIncome: 85000,
        medianAge: 35,
      },
      amenities: {
        schools: 5,
        parks: 3,
        restaurants: 42,
      },
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'geospatial', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Payment Service
// ============================================================================

export class MockPaymentService {
  async processPayment(data: any) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'completed',
      provider: data.paymentMethod || 'stripe',
      timestamp: new Date().toISOString(),
    };
  }

  async getPaymentStatus(transactionId: string) {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      transactionId,
      status: 'completed',
      amount: 1000,
      currency: 'USD',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3000000).toISOString(),
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'payment', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Notification Service
// ============================================================================

export class MockNotificationService {
  async sendEmail(data: any) {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      messageId: `msg_${Date.now()}`,
      status: 'sent',
      to: data.to,
      subject: data.subject,
      timestamp: new Date().toISOString(),
    };
  }

  async sendSMS(data: any) {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      messageId: `sms_${Date.now()}`,
      status: 'sent',
      to: data.to,
      timestamp: new Date().toISOString(),
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'notification', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Image Service
// ============================================================================

export class MockImageService {
  async uploadImage(data: any) {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      url: `https://storage.example.com/images/${Date.now()}.jpg`,
      key: `images/${Date.now()}.jpg`,
      size: data.buffer?.length || 1024 * 100,
      mimeType: 'image/jpeg',
    };
  }

  async resizeImage(data: any) {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      url: `https://storage.example.com/images/resized_${Date.now()}.jpg`,
      width: data.width,
      height: data.height,
    };
  }

  async generateThumbnail(data: any) {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      url: `https://storage.example.com/thumbnails/thumb_${Date.now()}.jpg`,
      width: data.width || 200,
      height: data.height || 200,
    };
  }

  async healthCheck() {
    return { status: 'healthy', service: 'image', timestamp: new Date().toISOString() };
  }
}

// ============================================================================
// Mock Service Factory
// ============================================================================

export const mockServices = {
  mlValuation: new MockMLValuationService(),
  ocr: new MockOCRService(),
  fraudDetection: new MockFraudDetectionService(),
  geospatial: new MockGeospatialService(),
  payment: new MockPaymentService(),
  notification: new MockNotificationService(),
  image: new MockImageService(),
};
