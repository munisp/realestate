import { opensearchClient, PROPERTY_INDEX } from '../config/opensearch';
import { logger } from '../config/logger';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

export interface SearchQuery {
  query?: string;
  propertyType?: string[];
  status?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  city?: string[];
  state?: string[];
  features?: string[];
  amenities?: string[];
  location?: {
    lat: number;
    lon: number;
    radius: string; // e.g., "10km"
  };
  polygon?: Array<{ lat: number; lon: number }>;
  sortBy?: 'price' | 'createdAt' | 'viewCount' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  total: number;
  hits: any[];
  aggregations?: any;
  took: number;
}

export class SearchService {
  async searchProperties(searchQuery: SearchQuery): Promise<SearchResult> {
    const cacheKey = `search:${JSON.stringify(searchQuery)}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Returning cached search results');
      return JSON.parse(cached);
    }

    const {
      query,
      propertyType,
      status,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minSquareFeet,
      maxSquareFeet,
      city,
      state,
      features,
      amenities,
      location,
      polygon,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = searchQuery;

    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'address.*'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Filters
    if (propertyType && propertyType.length > 0) {
      filter.push({ terms: { propertyType } });
    }

    if (status && status.length > 0) {
      filter.push({ terms: { status } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const range: any = {};
      if (minPrice !== undefined) range.gte = minPrice;
      if (maxPrice !== undefined) range.lte = maxPrice;
      filter.push({ range: { price: range } });
    }

    if (minBedrooms !== undefined || maxBedrooms !== undefined) {
      const range: any = {};
      if (minBedrooms !== undefined) range.gte = minBedrooms;
      if (maxBedrooms !== undefined) range.lte = maxBedrooms;
      filter.push({ range: { bedrooms: range } });
    }

    if (minBathrooms !== undefined || maxBathrooms !== undefined) {
      const range: any = {};
      if (minBathrooms !== undefined) range.gte = minBathrooms;
      if (maxBathrooms !== undefined) range.lte = maxBathrooms;
      filter.push({ range: { bathrooms: range } });
    }

    if (minSquareFeet !== undefined || maxSquareFeet !== undefined) {
      const range: any = {};
      if (minSquareFeet !== undefined) range.gte = minSquareFeet;
      if (maxSquareFeet !== undefined) range.lte = maxSquareFeet;
      filter.push({ range: { squareFeet: range } });
    }

    if (city && city.length > 0) {
      filter.push({ terms: { 'address.city': city } });
    }

    if (state && state.length > 0) {
      filter.push({ terms: { 'address.state': state } });
    }

    if (features && features.length > 0) {
      filter.push({ terms: { features } });
    }

    if (amenities && amenities.length > 0) {
      filter.push({ terms: { amenities } });
    }

    // Geospatial search
    if (location) {
      filter.push({
        geo_distance: {
          distance: location.radius,
          location: {
            lat: location.lat,
            lon: location.lon,
          },
        },
      });
    }

    if (polygon && polygon.length > 0) {
      filter.push({
        geo_polygon: {
          location: {
            points: polygon.map((p) => ({ lat: p.lat, lon: p.lon })),
          },
        },
      });
    }

    // Build query
    const searchBody: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
        },
      },
      from: (page - 1) * pageSize,
      size: pageSize,
      track_total_hits: true,
    };

    // Sorting
    if (sortBy === 'relevance') {
      searchBody.sort = [{ _score: { order: 'desc' } }];
    } else {
      searchBody.sort = [{ [sortBy]: { order: sortOrder } }];
    }

    // Aggregations
    searchBody.aggs = {
      property_types: { terms: { field: 'propertyType', size: 20 } },
      cities: { terms: { field: 'address.city', size: 50 } },
      states: { terms: { field: 'address.state', size: 50 } },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 100000 },
            { from: 100000, to: 250000 },
            { from: 250000, to: 500000 },
            { from: 500000, to: 1000000 },
            { from: 1000000 },
          ],
        },
      },
      bedrooms: { terms: { field: 'bedrooms', size: 10 } },
    };

    try {
      const response = await opensearchClient.search({
        index: PROPERTY_INDEX,
        body: searchBody,
      });

      const result: SearchResult = {
        total: response.body.hits.total.value,
        hits: response.body.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
        })),
        aggregations: response.body.aggregations,
        took: response.body.took,
      };

      // Cache results for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(result));

      logger.info(`Search completed: ${result.total} results in ${result.took}ms`);
      return result;
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  async autocomplete(query: string, field: string = 'title'): Promise<string[]> {
    try {
      const response = await opensearchClient.search({
        index: PROPERTY_INDEX,
        body: {
          suggest: {
            property_suggest: {
              prefix: query,
              completion: {
                field: `${field}.suggest`,
                size: 10,
                fuzzy: {
                  fuzziness: 'AUTO',
                },
              },
            },
          },
        },
      });

      const suggestions = response.body.suggest.property_suggest[0].options.map(
        (option: any) => option.text
      );

      return suggestions;
    } catch (error) {
      logger.error('Autocomplete error:', error);
      throw error;
    }
  }

  async indexProperty(property: any): Promise<void> {
    try {
      await opensearchClient.index({
        index: PROPERTY_INDEX,
        id: property.id,
        body: property,
        refresh: true,
      });

      logger.info(`Indexed property: ${property.id}`);
    } catch (error) {
      logger.error('Index property error:', error);
      throw error;
    }
  }

  async updateProperty(id: string, property: Partial<any>): Promise<void> {
    try {
      await opensearchClient.update({
        index: PROPERTY_INDEX,
        id,
        body: {
          doc: property,
        },
        refresh: true,
      });

      logger.info(`Updated property: ${id}`);
    } catch (error) {
      logger.error('Update property error:', error);
      throw error;
    }
  }

  async deleteProperty(id: string): Promise<void> {
    try {
      await opensearchClient.delete({
        index: PROPERTY_INDEX,
        id,
        refresh: true,
      });

      logger.info(`Deleted property: ${id}`);
    } catch (error) {
      logger.error('Delete property error:', error);
      throw error;
    }
  }

  async bulkIndex(properties: any[]): Promise<void> {
    const body = properties.flatMap((property) => [
      { index: { _index: PROPERTY_INDEX, _id: property.id } },
      property,
    ]);

    try {
      const response = await opensearchClient.bulk({
        body,
        refresh: true,
      });

      if (response.body.errors) {
        logger.error('Bulk index errors:', response.body.items);
      } else {
        logger.info(`Bulk indexed ${properties.length} properties`);
      }
    } catch (error) {
      logger.error('Bulk index error:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();
