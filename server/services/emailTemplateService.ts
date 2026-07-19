import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";

/**
 * Email Template Service
 * 
 * Handles loading and rendering of HTML email templates using Handlebars
 */

// Cache compiled templates
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Load and compile an email template
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Load template file
  const templatePath = path.join(__dirname, "../templates/emails", `${templateName}.html`);
  
  try {
    const templateContent = await fs.readFile(templatePath, "utf-8");
    const compiled = Handlebars.compile(templateContent);
    
    // Cache the compiled template
    templateCache.set(templateName, compiled);
    
    return compiled;
  } catch (error) {
    console.error(`[EmailTemplate] Failed to load template ${templateName}:`, error);
    throw new Error(`Email template '${templateName}' not found`);
  }
}

/**
 * Render an email template with data
 */
export async function renderEmailTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<string> {
  const template = await loadTemplate(templateName);
  
  // Add common data available to all templates
  const enrichedData = {
    ...data,
    currentYear: new Date().getFullYear(),
    settingsUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/settings/alerts`,
    unsubscribeUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/email-preferences`,
    socialLinks: {
      facebook: "https://facebook.com/yourcompany",
      twitter: "https://twitter.com/yourcompany",
      linkedin: "https://linkedin.com/company/yourcompany",
    },
  };
  
  return template(enrichedData);
}

/**
 * Render valuation increase email
 */
export async function renderValuationIncreaseEmail(data: {
  userName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyImage?: string;
  previousValuation: string;
  newValuation: string;
  changeAmount: string;
  changePercent: string;
  valuationDate: string;
  propertyUrl: string;
  insights?: string[];
}): Promise<string> {
  return renderEmailTemplate("valuation-increase", data);
}

/**
 * Render valuation decrease email
 */
export async function renderValuationDecreaseEmail(data: {
  userName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyImage?: string;
  previousValuation: string;
  newValuation: string;
  changeAmount: string;
  changePercent: string;
  valuationDate: string;
  propertyUrl: string;
  insights?: string[];
}): Promise<string> {
  return renderEmailTemplate("valuation-decrease", data);
}

/**
 * Render price drop alert email
 */
export async function renderPriceDropEmail(data: {
  userName: string;
  propertyAddress: string;
  propertyImage?: string;
  oldPrice: string;
  newPrice: string;
  priceChange: string;
  percentChange: string;
  propertyUrl: string;
  daysOnMarket: number;
}): Promise<string> {
  return renderEmailTemplate("price-drop", data);
}

/**
 * Render new listing alert email
 */
export async function renderNewListingEmail(data: {
  userName: string;
  propertyAddress: string;
  propertyImage?: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyUrl: string;
  matchReason: string;
  propertyType?: string;
  yearBuilt?: number;
  lotSize?: string;
  scheduleViewingUrl?: string;
  savePropertyUrl?: string;
  refineSearchUrl?: string;
}): Promise<string> {
  return renderEmailTemplate("new-listing", data);
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
  console.log("[EmailTemplate] Template cache cleared");
}

/**
 * Preload all templates (useful for production)
 */
export async function preloadTemplates(): Promise<void> {
  const templates = [
    "valuation-increase",
    "valuation-decrease",
    "price-drop",
    "new-listing",
  ];
  
  console.log("[EmailTemplate] Preloading templates...");
  
  for (const template of templates) {
    try {
      await loadTemplate(template);
      console.log(`[EmailTemplate] Loaded: ${template}`);
    } catch (error) {
      console.warn(`[EmailTemplate] Failed to preload ${template}:`, error);
    }
  }
  
  console.log(`[EmailTemplate] Preloaded ${templateCache.size} templates`);
}

// Register Handlebars helpers
Handlebars.registerHelper("formatCurrency", function (value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
});

Handlebars.registerHelper("formatDate", function (date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
});

Handlebars.registerHelper("formatPercent", function (value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
});
