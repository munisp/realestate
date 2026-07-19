// @ts-nocheck
import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';

const propertyDataSchema = z.object({
  type: z.string(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number(),
  price: z.number(),
  location: z.string(),
  yearBuilt: z.number().optional(),
  features: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  neighborhood: z.string().optional(),
  tone: z.enum(['professional', 'luxury', 'casual', 'investment']).optional(),
});

export const aiPropertyDescriptionRouter = router({
  /**
   * Generate property description using AI
   */
  generate: protectedProcedure
    .input(propertyDataSchema)
    .mutation(async ({ input }) => {
      const {
        type,
        bedrooms,
        bathrooms,
        squareFeet,
        price,
        location,
        yearBuilt,
        features = [],
        amenities = [],
        neighborhood,
        tone = 'professional',
      } = input;

      // Build context-aware prompt based on tone
      const tonePrompts = {
        professional: 'Write a professional, informative property listing description.',
        luxury: 'Write an elegant, sophisticated property listing that emphasizes luxury and exclusivity.',
        casual: 'Write a friendly, conversational property listing that feels welcoming and approachable.',
        investment: 'Write a property listing focused on investment potential, ROI, and market analysis.',
      };

      const prompt = `${tonePrompts[tone]}

Property Details:
- Type: ${type}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Square Feet: ${squareFeet.toLocaleString()}
- Price: $${price.toLocaleString()}
- Location: ${location}
${yearBuilt ? `- Year Built: ${yearBuilt}` : ''}
${neighborhood ? `- Neighborhood: ${neighborhood}` : ''}
${features.length > 0 ? `- Key Features: ${features.join(', ')}` : ''}
${amenities.length > 0 ? `- Amenities: ${amenities.join(', ')}` : ''}

Requirements:
1. Write 2-3 paragraphs (150-250 words total)
2. Highlight unique selling points
3. Use vivid, descriptive language
4. Include location benefits
5. End with a call-to-action
6. DO NOT use placeholder text or generic phrases
7. Make it specific to this property

Write the description now:`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert real estate copywriter who creates compelling property listings that sell. Your descriptions are specific, vivid, and persuasive.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const description = response.choices[0]?.message?.content || '';

        if (!description) {
          throw new Error('No description generated');
        }

        return {
          success: true,
          description: (String(description ?? "")).trim(),
          wordCount: (String(description ?? "")).trim().split(/\s+/).length,
        };
      } catch (error: any) {
        console.error('[AI Description] Generation error:', error);
        
        // Fallback description template
        const fallbackDescription = `Discover this beautiful ${bedrooms}-bedroom, ${bathrooms}-bathroom ${type} located in ${location}. ` +
          `Spanning ${squareFeet.toLocaleString()} square feet, this property offers comfortable living spaces perfect for ${bedrooms > 3 ? 'families' : bedrooms > 1 ? 'couples or small families' : 'individuals'}. ` +
          `${features.length > 0 ? `Notable features include ${features.slice(0, 3).join(', ')}.` : ''} ` +
          `${amenities.length > 0 ? `Enjoy amenities such as ${amenities.slice(0, 3).join(', ')}.` : ''} ` +
          `Priced at $${price.toLocaleString()}, this property represents excellent value in the ${location} market. ` +
          `Schedule a viewing today to experience this exceptional property firsthand.`;

        return {
          success: false,
          description: fallbackDescription,
          wordCount: (String(fallbackDescription ?? "")).split(/\s+/).length,
          error: 'AI service unavailable - using template description',
        };
      }
    }),

  /**
   * Generate multiple description variations
   */
  generateVariations: protectedProcedure
    .input(propertyDataSchema.extend({
      count: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ input }) => {
      const { count = 3, ...propertyData } = input;
      const tones: Array<'professional' | 'luxury' | 'casual' | 'investment'> = ['professional', 'luxury', 'casual'];

      try {
        const variations = await Promise.all(
          tones.slice(0, count).map(async (tone) => {
            const prompt = `Write a ${tone} property listing description for:

Property: ${propertyData.type}
Bedrooms: ${propertyData.bedrooms}
Bathrooms: ${propertyData.bathrooms}
Size: ${propertyData.squareFeet.toLocaleString()} sq ft
Price: $${propertyData.price.toLocaleString()}
Location: ${propertyData.location}

Write 2-3 paragraphs in a ${tone} tone. Be specific and compelling.`;

            const response = await invokeLLM({
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert real estate copywriter.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            });

            return {
              tone,
              description: response.choices[0]?.message?.content?.trim() || '',
            };
          })
        );

        return {
          success: true,
          variations: variations.filter(v => v.description),
        };
      } catch (error: any) {
        console.error('[AI Description] Variations error:', error);
        throw new Error('Failed to generate description variations');
      }
    }),

  /**
   * Enhance existing description
   */
  enhance: protectedProcedure
    .input(z.object({
      currentDescription: z.string(),
      propertyData: propertyDataSchema,
      focus: z.enum(['length', 'clarity', 'persuasion', 'seo']).optional(),
    }))
    .mutation(async ({ input }) => {
      const { currentDescription, propertyData, focus = 'clarity' } = input;

      const focusPrompts = {
        length: 'Make this description more detailed and comprehensive',
        clarity: 'Make this description clearer and easier to read',
        persuasion: 'Make this description more persuasive and compelling',
        seo: 'Optimize this description for search engines while maintaining readability',
      };

      const prompt = `${focusPrompts[focus]}:

Current Description:
${currentDescription}

Property Details:
- Type: ${propertyData.type}
- Bedrooms: ${propertyData.bedrooms}
- Bathrooms: ${propertyData.bathrooms}
- Square Feet: ${propertyData.squareFeet.toLocaleString()}
- Price: $${propertyData.price.toLocaleString()}
- Location: ${propertyData.location}

Provide an improved version that ${focus === 'length' ? 'expands on key points' : focus === 'clarity' ? 'is easier to understand' : focus === 'persuasion' ? 'is more compelling' : 'includes relevant keywords'}.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert real estate copywriter who improves property listings.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const enhanced = response.choices[0]?.message?.content || '';

        return {
          success: true,
          original: currentDescription,
          enhanced: (String(enhanced ?? "")).trim(),
          improvements: `Enhanced for ${focus}`,
        };
      } catch (error: any) {
        console.error('[AI Description] Enhancement error:', error);
        throw new Error('Failed to enhance description');
      }
    }),

  /**
   * Generate property highlights/bullet points
   */
  generateHighlights: protectedProcedure
    .input(propertyDataSchema)
    .mutation(async ({ input }) => {
      const prompt = `Generate 5-7 compelling bullet points highlighting the key features of this property:

Property: ${input.type}
Bedrooms: ${input.bedrooms}
Bathrooms: ${input.bathrooms}
Size: ${input.squareFeet.toLocaleString()} sq ft
Price: $${input.price.toLocaleString()}
Location: ${input.location}
${input.features?.length ? `Features: ${input.features.join(', ')}` : ''}
${input.amenities?.length ? `Amenities: ${input.amenities.join(', ')}` : ''}

Format: Return ONLY the bullet points, one per line, starting with a dash (-). Be specific and compelling.`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating concise, impactful property highlights.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content || '';
        const highlights = content
          .split('\n')
          .map((line: string) => (String(line ?? "")).trim())
          .filter((line: string) => line.startsWith('-') || line.match(/^\d+\./))
          .map((line: string) => line.replace(/^[-\d.]\s*/, '').trim())
          .filter(Boolean);

        return {
          success: true,
          highlights,
        };
      } catch (error: any) {
        console.error('[AI Description] Highlights error:', error);
        
        // Fallback highlights
        const fallbackHighlights = [
          `${input.bedrooms} spacious bedrooms and ${input.bathrooms} modern bathrooms`,
          `${input.squareFeet.toLocaleString()} square feet of living space`,
          `Prime location in ${input.location}`,
          `Priced competitively at $${input.price.toLocaleString()}`,
          ...(input.features?.slice(0, 3) || []),
        ];

        return {
          success: false,
          highlights: fallbackHighlights,
          error: 'AI service unavailable - using template highlights',
        };
      }
    }),
});
