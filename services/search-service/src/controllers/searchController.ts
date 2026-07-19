import { Request, Response } from 'express';
import { searchService, SearchQuery } from '../services/searchService';
import { logger } from '../config/logger';

export class SearchController {
  async search(req: Request, res: Response) {
    try {
      const searchQuery: SearchQuery = {
        query: req.query.q as string,
        propertyType: req.query.propertyType
          ? (req.query.propertyType as string).split(',')
          : undefined,
        status: req.query.status
          ? (req.query.status as string).split(',')
          : undefined,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        minBedrooms: req.query.minBedrooms
          ? parseInt(req.query.minBedrooms as string)
          : undefined,
        maxBedrooms: req.query.maxBedrooms
          ? parseInt(req.query.maxBedrooms as string)
          : undefined,
        minBathrooms: req.query.minBathrooms
          ? parseFloat(req.query.minBathrooms as string)
          : undefined,
        maxBathrooms: req.query.maxBathrooms
          ? parseFloat(req.query.maxBathrooms as string)
          : undefined,
        minSquareFeet: req.query.minSquareFeet
          ? parseInt(req.query.minSquareFeet as string)
          : undefined,
        maxSquareFeet: req.query.maxSquareFeet
          ? parseInt(req.query.maxSquareFeet as string)
          : undefined,
        city: req.query.city
          ? (req.query.city as string).split(',')
          : undefined,
        state: req.query.state
          ? (req.query.state as string).split(',')
          : undefined,
        features: req.query.features
          ? (req.query.features as string).split(',')
          : undefined,
        amenities: req.query.amenities
          ? (req.query.amenities as string).split(',')
          : undefined,
        location: req.query.lat && req.query.lon && req.query.radius
          ? {
              lat: parseFloat(req.query.lat as string),
              lon: parseFloat(req.query.lon as string),
              radius: req.query.radius as string,
            }
          : undefined,
        polygon: req.body.polygon,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : 20,
      };

      const results = await searchService.searchProperties(searchQuery);
      res.json(results);
    } catch (error) {
      logger.error('Search controller error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  async autocomplete(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      const field = (req.query.field as string) || 'title';

      if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
      }

      const suggestions = await searchService.autocomplete(query, field);
      res.json({ suggestions });
    } catch (error) {
      logger.error('Autocomplete controller error:', error);
      res.status(500).json({ error: 'Autocomplete failed' });
    }
  }

  async indexProperty(req: Request, res: Response) {
    try {
      const property = req.body;
      await searchService.indexProperty(property);
      res.json({ success: true, message: 'Property indexed' });
    } catch (error) {
      logger.error('Index property controller error:', error);
      res.status(500).json({ error: 'Indexing failed' });
    }
  }

  async updateProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const property = req.body;
      await searchService.updateProperty(id, property);
      res.json({ success: true, message: 'Property updated' });
    } catch (error) {
      logger.error('Update property controller error:', error);
      res.status(500).json({ error: 'Update failed' });
    }
  }

  async deleteProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await searchService.deleteProperty(id);
      res.json({ success: true, message: 'Property deleted' });
    } catch (error) {
      logger.error('Delete property controller error:', error);
      res.status(500).json({ error: 'Delete failed' });
    }
  }

  async bulkIndex(req: Request, res: Response) {
    try {
      const properties = req.body.properties;
      await searchService.bulkIndex(properties);
      res.json({ success: true, message: 'Bulk indexing completed' });
    } catch (error) {
      logger.error('Bulk index controller error:', error);
      res.status(500).json({ error: 'Bulk indexing failed' });
    }
  }
}

export const searchController = new SearchController();
