/**
 * Innovation 9: Carbon Footprint Calculator for Properties
 *
 * Calculates the estimated annual carbon footprint of living in a property,
 * covering energy consumption, commute emissions, and embodied carbon.
 *
 * Methodology:
 *  - Energy: building size × energy intensity × Nigeria grid emission factor
 *  - Commute: distance to CBD × transport mode × days/year
 *  - Embodied carbon: property age × material type × depreciation
 *  - Offset opportunities: solar potential, tree coverage, green rating
 *
 * Output: CO₂e tonnes/year with breakdown and improvement suggestions
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { logger } from "../_core/logger";

// ── Emission Factors (Nigeria-specific) ───────────────────────────────────

const NIGERIA_GRID_EMISSION_FACTOR = 0.431; // kg CO₂e per kWh (IPCC/IEA Nigeria 2023)
const DIESEL_GENERATOR_FACTOR = 0.702; // kg CO₂e per kWh (common in Nigeria)
const PETROL_CAR_FACTOR = 0.192; // kg CO₂e per km
const DIESEL_BUS_FACTOR = 0.089; // kg CO₂e per km per passenger
const MOTORCYCLE_FACTOR = 0.103; // kg CO₂e per km (okada/keke)
const SOLAR_OFFSET_FACTOR = 0.431; // kg CO₂e saved per kWh generated

// Energy intensity by property type (kWh/m²/year) — Nigerian climate
const ENERGY_INTENSITY: Record<string, number> = {
  apartment: 45,
  flat: 45,
  bungalow: 55,
  duplex: 60,
  detached: 65,
  semi_detached: 58,
  terrace: 52,
  commercial: 120,
  default: 55,
};

// Generator usage assumption (% of energy from generator in Nigeria)
const GENERATOR_USAGE_PERCENT = 0.40; // 40% of energy from generator (NERC data)

interface CarbonBreakdown {
  category: string;
  annualKgCO2e: number;
  description: string;
  improvementPotentialKgCO2e: number;
  improvementAction: string;
}

interface CarbonReport {
  propertyId: string;
  annualTotalKgCO2e: number;
  annualTotalTonnesCO2e: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  breakdown: CarbonBreakdown[];
  offsetOpportunities: { action: string; annualSavingKgCO2e: number; estimatedCostNGN: number }[];
  comparisonToNigeriaAverage: number; // % above/below average
  equivalentTrees: number; // trees needed to offset
  recommendations: string[];
  calculatedAt: string;
}

function calculateCarbonFootprint(property: any, commuteKm: number = 15, commuteMode: string = "car"): CarbonReport {
  const sizeSqm = property.size_sqm || 100;
  const propertyType = (property.property_type || "default").toLowerCase();
  const yearBuilt = property.year_built || 2010;
  const hasSolar = property.has_solar || false;
  const hasPool = property.has_pool || false;

  const energyIntensity = ENERGY_INTENSITY[propertyType] || ENERGY_INTENSITY.default;
  const annualKwh = sizeSqm * energyIntensity;

  // Grid vs generator split
  const gridKwh = annualKwh * (1 - GENERATOR_USAGE_PERCENT);
  const generatorKwh = annualKwh * GENERATOR_USAGE_PERCENT;

  const energyEmissions = (gridKwh * NIGERIA_GRID_EMISSION_FACTOR) + (generatorKwh * DIESEL_GENERATOR_FACTOR);

  // Solar offset
  const solarOffset = hasSolar ? Math.min(energyEmissions * 0.6, sizeSqm * 150 * SOLAR_OFFSET_FACTOR) : 0;
  const netEnergyEmissions = Math.max(0, energyEmissions - solarOffset);

  // Commute emissions (250 working days/year)
  const commuteDays = 250;
  const commuteFactors: Record<string, number> = {
    car: PETROL_CAR_FACTOR,
    bus: DIESEL_BUS_FACTOR,
    motorcycle: MOTORCYCLE_FACTOR,
    walk: 0,
    bicycle: 0,
  };
  const commuteFactor = commuteFactors[commuteMode] || PETROL_CAR_FACTOR;
  const commuteEmissions = commuteKm * 2 * commuteDays * commuteFactor; // round trip

  // Embodied carbon (amortised over 50-year building life)
  const buildingAge = new Date().getFullYear() - yearBuilt;
  const remainingLife = Math.max(0, 50 - buildingAge);
  const embodiedCarbonTotal = sizeSqm * 400; // kg CO₂e/m² for concrete construction
  const annualEmbodiedCarbon = remainingLife > 0 ? embodiedCarbonTotal / 50 : 0;

  // Pool emissions
  const poolEmissions = hasPool ? 1200 : 0; // kg CO₂e/year for pool pump + chemicals

  const totalKgCO2e = netEnergyEmissions + commuteEmissions + annualEmbodiedCarbon + poolEmissions;

  // Nigeria average: ~1.8 tonnes CO₂e/person/year (World Bank)
  const nigeriaAverageKg = 1800;
  const comparisonPercent = Math.round(((totalKgCO2e - nigeriaAverageKg) / nigeriaAverageKg) * 100);

  // Grade (kg CO₂e/year)
  const grade = totalKgCO2e < 1000 ? "A+" : totalKgCO2e < 1800 ? "A" : totalKgCO2e < 3000 ? "B" :
    totalKgCO2e < 5000 ? "C" : totalKgCO2e < 8000 ? "D" : "F";

  const breakdown: CarbonBreakdown[] = [
    {
      category: "Home Energy",
      annualKgCO2e: Math.round(netEnergyEmissions),
      description: `${sizeSqm}m² property using ${annualKwh.toFixed(0)} kWh/year (${Math.round(GENERATOR_USAGE_PERCENT * 100)}% generator)`,
      improvementPotentialKgCO2e: Math.round(netEnergyEmissions * 0.5),
      improvementAction: "Install solar panels + inverter system",
    },
    {
      category: "Commute",
      annualKgCO2e: Math.round(commuteEmissions),
      description: `${commuteKm}km daily commute by ${commuteMode} (${commuteDays} days/year)`,
      improvementPotentialKgCO2e: Math.round(commuteEmissions * 0.7),
      improvementAction: commuteMode === "car" ? "Switch to BRT/bus for major savings" : "Already low-carbon transport",
    },
    {
      category: "Embodied Carbon",
      annualKgCO2e: Math.round(annualEmbodiedCarbon),
      description: `${buildingAge}-year-old building (${remainingLife} years remaining life)`,
      improvementPotentialKgCO2e: 0,
      improvementAction: "Extend building life through good maintenance",
    },
    ...(hasPool ? [{
      category: "Swimming Pool",
      annualKgCO2e: poolEmissions,
      description: "Pool pump and chemical treatment",
      improvementPotentialKgCO2e: 600,
      improvementAction: "Install solar pool pump",
    }] : []),
  ];

  const offsetOpportunities = [
    { action: "Install 5kW solar + 10kWh battery", annualSavingKgCO2e: Math.round(netEnergyEmissions * 0.6), estimatedCostNGN: 3500000 },
    { action: "Plant 10 trees on property", annualSavingKgCO2e: 200, estimatedCostNGN: 50000 },
    { action: "Switch to LED lighting throughout", annualSavingKgCO2e: Math.round(netEnergyEmissions * 0.08), estimatedCostNGN: 80000 },
    { action: "Use BRT/public transport for commute", annualSavingKgCO2e: Math.round(commuteEmissions * 0.7), estimatedCostNGN: 0 },
    { action: "Install solar water heater", annualSavingKgCO2e: Math.round(netEnergyEmissions * 0.15), estimatedCostNGN: 350000 },
  ].filter((o) => o.annualSavingKgCO2e > 50);

  return {
    propertyId: property.id,
    annualTotalKgCO2e: Math.round(totalKgCO2e),
    annualTotalTonnesCO2e: Math.round(totalKgCO2e / 100) / 10,
    grade,
    breakdown,
    offsetOpportunities,
    comparisonToNigeriaAverage: comparisonPercent,
    equivalentTrees: Math.ceil(totalKgCO2e / 21), // avg tree absorbs 21 kg CO₂/year
    recommendations: [
      grade === "F" || grade === "D" ? "⚠️ High carbon footprint — prioritise solar installation" : null,
      commuteMode === "car" && commuteKm > 20 ? "Consider relocating closer to work or using public transport" : null,
      !hasSolar ? "Solar panels could reduce your footprint by 50-60%" : "Great — solar is already reducing your footprint",
      "Seal air gaps and improve insulation to reduce AC usage",
    ].filter(Boolean) as string[],
    calculatedAt: new Date().toISOString(),
  };
}

export const carbonFootprintRouter = router({
  calculate: publicProcedure
    .input(z.object({
      propertyId: z.string(),
      commuteKm: z.number().min(0).max(200).default(15),
      commuteMode: z.enum(["car", "bus", "motorcycle", "walk", "bicycle"]).default("car"),
    }))
    .query(async ({ input }) => {
      const propResult = await db.execute(
        `SELECT id, property_type, size_sqm, year_built, has_solar, has_pool, city
         FROM properties WHERE id = $1 LIMIT 1` as any,
        [input.propertyId]
      );
      if (!propResult.rows?.length) throw new Error("Property not found");
      return calculateCarbonFootprint(propResult.rows[0], input.commuteKm, input.commuteMode);
    }),

  compareProperties: publicProcedure
    .input(z.object({
      propertyIds: z.array(z.string()).min(2).max(5),
      commuteKm: z.number().default(15),
      commuteMode: z.enum(["car", "bus", "motorcycle", "walk", "bicycle"]).default("car"),
    }))
    .query(async ({ input }) => {
      const props = await db.execute(
        `SELECT id, property_type, size_sqm, year_built, has_solar, has_pool, title
         FROM properties WHERE id = ANY($1)` as any,
        [input.propertyIds]
      );

      return ((props.rows || []) as any[]).map((p) => ({
        propertyId: p.id,
        title: p.title,
        ...calculateCarbonFootprint(p, input.commuteKm, input.commuteMode),
      }));
    }),

  getAverageByCity: publicProcedure
    .input(z.object({ city: z.string() }))
    .query(async ({ input }) => {
      const result = await db.execute(
        `SELECT AVG(size_sqm) as avg_size, AVG(EXTRACT(YEAR FROM NOW()) - year_built) as avg_age,
                COUNT(*) as property_count
         FROM properties WHERE city ILIKE $1 AND size_sqm > 0` as any,
        [`%${input.city}%`]
      );
      const data = (result.rows?.[0] || {}) as any;
      const mockProp = { id: "avg", property_type: "apartment", size_sqm: Number(data.avg_size) || 100, year_built: new Date().getFullYear() - (Number(data.avg_age) || 10), has_solar: false, has_pool: false };
      const report = calculateCarbonFootprint(mockProp);
      return { city: input.city, propertyCount: data.property_count, averageFootprint: report };
    }),
});
