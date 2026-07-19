import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVirtualStaging, getAvailableRoomTypes, getAvailableStyles } from '../virtualStaging';

// Mock the image generation module
vi.mock('../../_core/imageGeneration', () => ({
  generateImage: vi.fn().mockResolvedValue({
    url: 'https://example.com/staged-image.jpg',
  }),
}));

// Mock the database
vi.mock('../../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              title: 'Test Property',
              price: 50000000,
            },
          ]),
        }),
      }),
    }),
  }),
}));

describe('Virtual Staging Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVirtualStaging', () => {
    it('should generate staged image successfully', async () => {
      const request = {
        propertyId: 1,
        roomType: 'living_room' as const,
        style: 'modern' as const,
        originalImageUrl: 'https://example.com/original.jpg',
      };

      const result = await generateVirtualStaging(request);

      expect(result.success).toBe(true);
      expect(result.stagedImageUrl).toBe('https://example.com/staged-image.jpg');
      expect(result.roomType).toBe('living_room');
      expect(result.style).toBe('modern');
    });

    it('should handle different room types', async () => {
      const roomTypes = ['living_room', 'bedroom', 'kitchen', 'dining_room', 'bathroom', 'office', 'outdoor'] as const;

      for (const roomType of roomTypes) {
        const request = {
          propertyId: 1,
          roomType,
          style: 'modern' as const,
          originalImageUrl: 'https://example.com/original.jpg',
        };

        const result = await generateVirtualStaging(request);
        expect(result.success).toBe(true);
        expect(result.roomType).toBe(roomType);
      }
    });

    it('should handle different styles', async () => {
      const styles = ['modern', 'traditional', 'minimalist', 'luxury', 'scandinavian', 'industrial', 'bohemian'] as const;

      for (const style of styles) {
        const request = {
          propertyId: 1,
          roomType: 'living_room' as const,
          style,
          originalImageUrl: 'https://example.com/original.jpg',
        };

        const result = await generateVirtualStaging(request);
        expect(result.success).toBe(true);
        expect(result.style).toBe(style);
      }
    });
  });

  describe('getAvailableRoomTypes', () => {
    it('should return all available room types', () => {
      const roomTypes = getAvailableRoomTypes();

      expect(roomTypes).toHaveLength(7);
      expect(roomTypes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'living_room', label: 'Living Room' }),
          expect.objectContaining({ value: 'bedroom', label: 'Bedroom' }),
          expect.objectContaining({ value: 'kitchen', label: 'Kitchen' }),
          expect.objectContaining({ value: 'dining_room', label: 'Dining Room' }),
          expect.objectContaining({ value: 'bathroom', label: 'Bathroom' }),
          expect.objectContaining({ value: 'office', label: 'Home Office' }),
          expect.objectContaining({ value: 'outdoor', label: 'Outdoor Space' }),
        ])
      );
    });
  });

  describe('getAvailableStyles', () => {
    it('should return all available styles with descriptions', () => {
      const styles = getAvailableStyles();

      expect(styles).toHaveLength(7);
      expect(styles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: 'modern',
            label: 'Modern',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'traditional',
            label: 'Traditional',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'minimalist',
            label: 'Minimalist',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'luxury',
            label: 'Luxury',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'scandinavian',
            label: 'Scandinavian',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'industrial',
            label: 'Industrial',
            description: expect.any(String),
          }),
          expect.objectContaining({
            value: 'bohemian',
            label: 'Bohemian',
            description: expect.any(String),
          }),
        ])
      );
    });

    it('should include descriptions for all styles', () => {
      const styles = getAvailableStyles();

      styles.forEach((style) => {
        expect(style.description).toBeTruthy();
        expect(style.description.length).toBeGreaterThan(10);
      });
    });
  });
});
