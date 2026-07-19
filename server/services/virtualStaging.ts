import { generateImage } from '../_core/imageGeneration';
import { getDb } from '../db';
import { eq } from 'drizzle-orm';
import { properties } from '../../drizzle/schema';

/**
 * Virtual Staging Service
 * 
 * Generates AI-powered virtual staging for empty properties.
 * Allows users to visualize properties with different furniture styles.
 */

export interface VirtualStagingRequest {
  propertyId: number;
  roomType: 'living_room' | 'bedroom' | 'kitchen' | 'dining_room' | 'bathroom' | 'office' | 'outdoor';
  style: 'modern' | 'traditional' | 'minimalist' | 'luxury' | 'scandinavian' | 'industrial' | 'bohemian';
  originalImageUrl: string;
}

export interface VirtualStagingResult {
  success: boolean;
  stagedImageUrl?: string;
  originalImageUrl: string;
  roomType: string;
  style: string;
  error?: string;
}

/**
 * Generate virtually staged image for a property room
 */
export async function generateVirtualStaging(
  request: VirtualStagingRequest
): Promise<VirtualStagingResult> {
  try {
    const { propertyId, roomType, style, originalImageUrl } = request;

    // Verify property exists
    const db = await getDb();
    if (db) {
      const property = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (property.length === 0) {
        return {
          success: false,
          originalImageUrl,
          roomType,
          style,
          error: 'Property not found',
        };
      }
    }

    // Generate staging prompt based on room type and style
    const prompt = buildStagingPrompt(roomType, style);

    console.log('[Virtual Staging] Generating staged image:', {
      propertyId,
      roomType,
      style,
    });

    // Generate staged image using AI
    const result = await generateImage({
      prompt,
      originalImages: [
        {
          url: originalImageUrl,
          mimeType: 'image/jpeg',
        },
      ],
    });

    if (!result.url) {
      return {
        success: false,
        originalImageUrl,
        roomType,
        style,
        error: 'Failed to generate staged image',
      };
    }

    console.log('[Virtual Staging] Successfully generated staged image');

    return {
      success: true,
      stagedImageUrl: result.url,
      originalImageUrl,
      roomType,
      style,
    };
  } catch (error) {
    console.error('[Virtual Staging] Error:', error);
    return {
      success: false,
      originalImageUrl: request.originalImageUrl,
      roomType: request.roomType,
      style: request.style,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build detailed prompt for virtual staging
 */
function buildStagingPrompt(
  roomType: string,
  style: string
): string {
  const roomDescriptions: Record<string, string> = {
    living_room: 'a beautifully furnished living room with comfortable seating, coffee table, and tasteful decor',
    bedroom: 'an inviting bedroom with a bed, nightstands, dresser, and cozy bedding',
    kitchen: 'a fully equipped kitchen with modern appliances, countertops, and dining area',
    dining_room: 'an elegant dining room with dining table, chairs, and ambient lighting',
    bathroom: 'a well-appointed bathroom with fixtures, vanity, and stylish accessories',
    office: 'a productive home office with desk, chair, shelving, and professional decor',
    outdoor: 'an attractive outdoor space with patio furniture, plants, and welcoming ambiance',
  };

  const styleDescriptions: Record<string, string> = {
    modern: 'contemporary modern style with clean lines, neutral colors, and sleek furniture',
    traditional: 'classic traditional style with warm wood tones, elegant fabrics, and timeless pieces',
    minimalist: 'minimalist style with simple forms, uncluttered spaces, and functional design',
    luxury: 'luxurious high-end style with premium materials, sophisticated finishes, and designer pieces',
    scandinavian: 'Scandinavian style with light woods, white walls, natural textures, and cozy elements',
    industrial: 'industrial style with exposed materials, metal accents, and urban aesthetics',
    bohemian: 'bohemian style with vibrant colors, eclectic patterns, and artistic touches',
  };

  const roomDesc = roomDescriptions[roomType] || 'a well-furnished room';
  const styleDesc = styleDescriptions[style] || 'tasteful style';

  return `Transform this empty room into ${roomDesc} in ${styleDesc}. 
    Keep the architectural features and lighting of the original space. 
    Add appropriate furniture, decor, and accessories that match the style. 
    Ensure the staging looks realistic and professionally done. 
    Maintain the original room dimensions and perspective.`;
}

/**
 * Get available room types for staging
 */
export function getAvailableRoomTypes(): Array<{ value: string; label: string }> {
  return [
    { value: 'living_room', label: 'Living Room' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'dining_room', label: 'Dining Room' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'office', label: 'Home Office' },
    { value: 'outdoor', label: 'Outdoor Space' },
  ];
}

/**
 * Get available staging styles
 */
export function getAvailableStyles(): Array<{ value: string; label: string; description: string }> {
  return [
    {
      value: 'modern',
      label: 'Modern',
      description: 'Clean lines, neutral colors, contemporary furniture',
    },
    {
      value: 'traditional',
      label: 'Traditional',
      description: 'Classic elegance, warm tones, timeless pieces',
    },
    {
      value: 'minimalist',
      label: 'Minimalist',
      description: 'Simple, uncluttered, functional design',
    },
    {
      value: 'luxury',
      label: 'Luxury',
      description: 'High-end finishes, premium materials, sophisticated',
    },
    {
      value: 'scandinavian',
      label: 'Scandinavian',
      description: 'Light woods, white walls, cozy and natural',
    },
    {
      value: 'industrial',
      label: 'Industrial',
      description: 'Exposed materials, metal accents, urban aesthetic',
    },
    {
      value: 'bohemian',
      label: 'Bohemian',
      description: 'Vibrant colors, eclectic patterns, artistic',
    },
  ];
}

/**
 * Batch generate staging for multiple rooms
 */
export async function batchGenerateStaging(
  requests: VirtualStagingRequest[]
): Promise<VirtualStagingResult[]> {
  console.log(`[Virtual Staging] Batch generating ${requests.length} staged images`);

  const results = await Promise.all(
    requests.map(request => generateVirtualStaging(request))
  );

  const successCount = results.filter(r => r.success).length;
  console.log(`[Virtual Staging] Batch complete: ${successCount}/${requests.length} successful`);

  return results;
}
