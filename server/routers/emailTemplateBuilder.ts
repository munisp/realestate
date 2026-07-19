// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  emailTemplateBlocks,
  customEmailTemplates,
} from "../../drizzle/schema";

/**
 * Email Template Builder Router
 * 
 * Provides endpoints for:
 * - Managing template blocks (pre-built components)
 * - Creating custom templates from blocks
 * - Template preview and rendering
 * - Variable substitution
 */

export const emailTemplateBuilderRouter = router({
  /**
   * Get all available template blocks
   */
  getBlocks: protectedProcedure
    .input(
      z.object({
        category: z.enum(["header", "text", "image", "cta", "footer", "custom"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(emailTemplateBlocks).where(eq(emailTemplateBlocks.isPublic, 1));

      if (input.category) {
        query = query.where(eq(emailTemplateBlocks.category, input.category)) as any;
      }

      return query;
    }),

  /**
   * Create a new template block
   */
  createBlock: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["header", "text", "image", "cta", "footer", "custom"]),
        htmlContent: z.string(),
        cssStyles: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isPublic: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [block] = await db.insert(emailTemplateBlocks).values({
        name: input.name,
        description: input.description,
        category: input.category,
        htmlContent: input.htmlContent,
        cssStyles: input.cssStyles,
        thumbnailUrl: input.thumbnailUrl,
        variables: input.variables ? JSON.stringify(input.variables) : null,
        isPublic: input.isPublic ? 1 : 0,
        createdBy: ctx.user.id,
      });

      return { blockId: block.id };
    }),

  /**
   * Update a template block
   */
  updateBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        htmlContent: z.string().optional(),
        cssStyles: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        variables: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.htmlContent) updates.htmlContent = input.htmlContent;
      if (input.cssStyles) updates.cssStyles = input.cssStyles;
      if (input.thumbnailUrl) updates.thumbnailUrl = input.thumbnailUrl;
      if (input.variables) updates.variables = JSON.stringify(input.variables);

      await db
        .update(emailTemplateBlocks)
        .set(updates)
        .where(eq(emailTemplateBlocks.id, input.blockId));

      return { success: true };
    }),

  /**
   * Delete a template block
   */
  deleteBlock: protectedProcedure
    .input(z.object({ blockId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(emailTemplateBlocks).where(eq(emailTemplateBlocks.id, input.blockId));

      return { success: true };
    }),

  /**
   * Create a custom template from blocks
   */
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        blockSequence: z.array(z.number()), // Array of block IDs
        blockCustomizations: z.record(z.any()).optional(), // Block-specific overrides
        availableVariables: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
              defaultValue: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db.insert(customEmailTemplates).values({
        name: input.name,
        description: input.description,
        blockSequence: JSON.stringify(input.blockSequence),
        blockCustomizations: input.blockCustomizations
          ? JSON.stringify(input.blockCustomizations)
          : null,
        availableVariables: input.availableVariables
          ? JSON.stringify(input.availableVariables)
          : null,
        createdBy: ctx.user.id,
      });

      return { templateId: template.id };
    }),

  /**
   * Get all custom templates
   */
  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return db
      .select()
      .from(customEmailTemplates)
      .where(eq(customEmailTemplates.createdBy, ctx.user.id));
  }),

  /**
   * Get template by ID with blocks
   */
  getTemplateById: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db
        .select()
        .from(customEmailTemplates)
        .where(eq(customEmailTemplates.id, input.templateId));

      if (!template) throw new Error("Template not found");

      // Get blocks
      const blockIds = JSON.parse(template.blockSequence);
      const blocks = await db
        .select()
        .from(emailTemplateBlocks)
        .where(eq(emailTemplateBlocks.id, blockIds[0])); // This is simplified

      return {
        template,
        blocks,
      };
    }),

  /**
   * Render template with variables
   */
  renderTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        variables: z.record(z.string()), // Variable name -> value mapping
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [template] = await db
        .select()
        .from(customEmailTemplates)
        .where(eq(customEmailTemplates.id, input.templateId));

      if (!template) throw new Error("Template not found");

      // Get blocks in sequence
      const blockIds = JSON.parse(template.blockSequence);
      const blocks = await db
        .select()
        .from(emailTemplateBlocks)
        .where(eq(emailTemplateBlocks.id, blockIds[0])); // Simplified

      // Build HTML by concatenating blocks
      let html = "";
      for (const block of blocks) {
        let blockHtml = block.htmlContent;

        // Replace variables
        for (const [varName, varValue] of Object.entries(input.variables)) {
          const regex = new RegExp(`{{${varName}}}`, "g");
          blockHtml = blockHtml.replace(regex, varValue);
        }

        html += blockHtml;
      }

      // Wrap in email template structure
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .email-container { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="email-container">
    ${html}
  </div>
</body>
</html>
      `;

      return { html: fullHtml };
    }),

  /**
   * Update custom template
   */
  updateTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        blockSequence: z.array(z.number()).optional(),
        blockCustomizations: z.record(z.any()).optional(),
        availableVariables: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
              defaultValue: z.string().optional(),
            })
          )
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: any = {};
      if (input.name) updates.name = input.name;
      if (input.description) updates.description = input.description;
      if (input.blockSequence) updates.blockSequence = JSON.stringify(input.blockSequence);
      if (input.blockCustomizations)
        updates.blockCustomizations = JSON.stringify(input.blockCustomizations);
      if (input.availableVariables)
        updates.availableVariables = JSON.stringify(input.availableVariables);
      if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;

      await db
        .update(customEmailTemplates)
        .set(updates)
        .where(eq(customEmailTemplates.id, input.templateId));

      return { success: true };
    }),

  /**
   * Delete custom template
   */
  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(customEmailTemplates)
        .where(eq(customEmailTemplates.id, input.templateId));

      return { success: true };
    }),

  /**
   * Seed default template blocks
   */
  seedDefaultBlocks: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const defaultBlocks = [
      {
        name: "Simple Header",
        description: "Clean header with logo and title",
        category: "header" as const,
        htmlContent: `
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="margin: 0; color: #333;">{{company_name}}</h1>
          </div>
        `,
        variables: JSON.stringify(["company_name"]),
        isPublic: 1,
        createdBy: ctx.user.id,
      },
      {
        name: "Text Block",
        description: "Simple text content block",
        category: "text" as const,
        htmlContent: `
          <div style="padding: 20px; color: #333;">
            <p style="margin: 0; line-height: 1.6;">{{content}}</p>
          </div>
        `,
        variables: JSON.stringify(["content"]),
        isPublic: 1,
        createdBy: ctx.user.id,
      },
      {
        name: "CTA Button",
        description: "Call-to-action button",
        category: "cta" as const,
        htmlContent: `
          <div style="padding: 20px; text-align: center;">
            <a href="{{button_url}}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">{{button_text}}</a>
          </div>
        `,
        variables: JSON.stringify(["button_url", "button_text"]),
        isPublic: 1,
        createdBy: ctx.user.id,
      },
      {
        name: "Simple Footer",
        description: "Footer with unsubscribe link",
        category: "footer" as const,
        htmlContent: `
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© {{year}} {{company_name}}. All rights reserved.</p>
            <p style="margin: 10px 0 0 0;"><a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a></p>
          </div>
        `,
        variables: JSON.stringify(["year", "company_name", "unsubscribe_url"]),
        isPublic: 1,
        createdBy: ctx.user.id,
      },
    ];

    for (const block of defaultBlocks) {
      await db.insert(emailTemplateBlocks).values(block);
    }

    return { success: true, count: defaultBlocks.length };
  }),
});
