import { Client } from '@opensearch-project/opensearch';
import { logger } from './logger';

const opensearchConfig = {
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
  },
  ssl: {
    rejectUnauthorized: false,
  },
};

export const opensearchClient = new Client(opensearchConfig);

// Property index mapping
export const PROPERTY_INDEX = 'properties';

export const propertyIndexMapping = {
  settings: {
    number_of_shards: 3,
    number_of_replicas: 2,
    analysis: {
      analyzer: {
        property_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'property_synonym'],
        },
      },
      filter: {
        property_synonym: {
          type: 'synonym',
          synonyms: [
            'apt, apartment',
            'condo, condominium',
            'house, home',
            'studio, efficiency',
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'property_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
          },
        },
      },
      description: {
        type: 'text',
        analyzer: 'property_analyzer',
      },
      propertyType: { type: 'keyword' },
      status: { type: 'keyword' },
      price: { type: 'double' },
      bedrooms: { type: 'integer' },
      bathrooms: { type: 'float' },
      squareFeet: { type: 'integer' },
      yearBuilt: { type: 'integer' },
      address: {
        properties: {
          street: { type: 'text' },
          city: { type: 'keyword' },
          state: { type: 'keyword' },
          zipCode: { type: 'keyword' },
          country: { type: 'keyword' },
        },
      },
      location: {
        type: 'geo_point',
      },
      features: { type: 'keyword' },
      amenities: { type: 'keyword' },
      images: { type: 'keyword' },
      agentId: { type: 'keyword' },
      developerId: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      viewCount: { type: 'integer' },
      favoriteCount: { type: 'integer' },
      tags: { type: 'keyword' },
    },
  },
};

// Initialize index
export async function initializeIndex() {
  try {
    const indexExists = await opensearchClient.indices.exists({
      index: PROPERTY_INDEX,
    });

    if (!indexExists.body) {
      await opensearchClient.indices.create({
        index: PROPERTY_INDEX,
        body: propertyIndexMapping,
      });
      logger.info(`Created index: ${PROPERTY_INDEX}`);
    } else {
      logger.info(`Index already exists: ${PROPERTY_INDEX}`);
    }
  } catch (error) {
    logger.error('Error initializing OpenSearch index:', error);
    throw error;
  }
}

// Health check
export async function checkOpenSearchHealth() {
  try {
    const health = await opensearchClient.cluster.health();
    return health.body;
  } catch (error) {
    logger.error('OpenSearch health check failed:', error);
    throw error;
  }
}
