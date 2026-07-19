import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";

// Mock context for testing
const createMockContext = (userId: number = 1): Context => ({
  user: {
    id: userId,
    openId: `test-user-${userId}`,
    name: "Test User",
    email: "test@example.com",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    loginMethod: "email",
  },
  req: {} as any,
  res: {} as any,
});

describe("Next Steps Features Integration Tests", () => {
  describe("Appointments Router", () => {
    it("should have appointments router registered", () => {
      expect(appRouter._def.procedures.appointments).toBeDefined();
    });

    it("should have getUserAppointments procedure", () => {
      expect(appRouter._def.procedures["appointments.getUserAppointments"]).toBeDefined();
    });

    it("should have create appointment procedure", () => {
      expect(appRouter._def.procedures["appointments.create"]).toBeDefined();
    });

    it("should have getAvailableSlots procedure", () => {
      expect(appRouter._def.procedures["appointments.getAvailableSlots"]).toBeDefined();
    });

    it("should have updateStatus procedure", () => {
      expect(appRouter._def.procedures["appointments.updateStatus"]).toBeDefined();
    });
  });

  describe("Offers Router", () => {
    it("should have offers router registered", () => {
      expect(appRouter._def.procedures.offers).toBeDefined();
    });

    it("should have create offer procedure", () => {
      expect(appRouter._def.procedures["offers.create"]).toBeDefined();
    });

    it("should have getMyOffers procedure", () => {
      expect(appRouter._def.procedures["offers.getMyOffers"]).toBeDefined();
    });

    it("should have getReceivedOffers procedure", () => {
      expect(appRouter._def.procedures["offers.getReceivedOffers"]).toBeDefined();
    });

    it("should have createCounteroffer procedure", () => {
      expect(appRouter._def.procedures["offers.createCounteroffer"]).toBeDefined();
    });

    it("should have updateStatus procedure", () => {
      expect(appRouter._def.procedures["offers.updateStatus"]).toBeDefined();
    });

    it("should have signOffer procedure", () => {
      expect(appRouter._def.procedures["offers.signOffer"]).toBeDefined();
    });
  });

  describe("Saved Search Alerts Router", () => {
    it("should have savedSearchAlerts router registered", () => {
      expect(appRouter._def.procedures.savedSearchAlerts).toBeDefined();
    });

    it("should have getUserSearches procedure", () => {
      expect(appRouter._def.procedures["savedSearchAlerts.getUserSearches"]).toBeDefined();
    });

    it("should have create procedure", () => {
      expect(appRouter._def.procedures["savedSearchAlerts.create"]).toBeDefined();
    });

    it("should have updateNotifications procedure", () => {
      expect(appRouter._def.procedures["savedSearchAlerts.updateNotifications"]).toBeDefined();
    });

    it("should have getNewProperties procedure", () => {
      expect(appRouter._def.procedures["savedSearchAlerts.getNewProperties"]).toBeDefined();
    });

    it("should have findMatches procedure", () => {
      expect(appRouter._def.procedures["savedSearchAlerts.findMatches"]).toBeDefined();
    });
  });

  describe("Database Schema Verification", () => {
    it("should have offers table schema defined", async () => {
      const { offers } = await import("../../drizzle/schema");
      expect(offers).toBeDefined();
      expect(offers.id).toBeDefined();
      expect(offers.propertyId).toBeDefined();
      expect(offers.buyerId).toBeDefined();
      expect(offers.sellerId).toBeDefined();
      expect(offers.offerAmount).toBeDefined();
      expect(offers.status).toBeDefined();
    });

    it("should have counteroffers table schema defined", async () => {
      const { counteroffers } = await import("../../drizzle/schema");
      expect(counteroffers).toBeDefined();
      expect(counteroffers.id).toBeDefined();
      expect(counteroffers.offerId).toBeDefined();
      expect(counteroffers.counterAmount).toBeDefined();
      expect(counteroffers.status).toBeDefined();
    });

    it("should have offerActivityLog table schema defined", async () => {
      const { offerActivityLog } = await import("../../drizzle/schema");
      expect(offerActivityLog).toBeDefined();
      expect(offerActivityLog.id).toBeDefined();
      expect(offerActivityLog.offerId).toBeDefined();
      expect(offerActivityLog.activityType).toBeDefined();
    });

    it("should have appointments table schema defined", async () => {
      const { appointments } = await import("../../drizzle/schema");
      expect(appointments).toBeDefined();
      expect(appointments.id).toBeDefined();
      expect(appointments.propertyId).toBeDefined();
      expect(appointments.buyerId).toBeDefined();
      expect(appointments.appointmentDate).toBeDefined();
      expect(appointments.status).toBeDefined();
    });

    it("should have agentAvailability table schema defined", async () => {
      const { agentAvailability } = await import("../../drizzle/schema");
      expect(agentAvailability).toBeDefined();
      expect(agentAvailability.id).toBeDefined();
      expect(agentAvailability.agentId).toBeDefined();
      expect(agentAvailability.dayOfWeek).toBeDefined();
    });

    it("should have savedSearches table schema defined", async () => {
      const { savedSearches } = await import("../../drizzle/schema");
      expect(savedSearches).toBeDefined();
      expect(savedSearches.id).toBeDefined();
      expect(savedSearches.userId).toBeDefined();
      expect(savedSearches.searchCriteria).toBeDefined();
      expect(savedSearches.notificationsEnabled).toBeDefined();
    });
  });

  describe("Service Layer Verification", () => {
    it("should have appointment service functions", async () => {
      const appointmentService = await import("../services/appointmentService");
      expect(appointmentService.createAppointment).toBeDefined();
      expect(appointmentService.getAgentAvailableSlots).toBeDefined();
      expect(appointmentService.isSlotAvailable).toBeDefined();
      expect(appointmentService.updateAppointmentStatus).toBeDefined();
      expect(appointmentService.getUserAppointments).toBeDefined();
    });

    it("should have offer service functions", async () => {
      const offerService = await import("../services/offerService");
      expect(offerService.createOffer).toBeDefined();
      expect(offerService.getOfferById).toBeDefined();
      expect(offerService.getBuyerOffers).toBeDefined();
      expect(offerService.getSellerOffers).toBeDefined();
      expect(offerService.createCounteroffer).toBeDefined();
      expect(offerService.updateOfferStatus).toBeDefined();
      expect(offerService.signOffer).toBeDefined();
    });

    it("should have saved search alerts service functions", async () => {
      const alertsService = await import("../services/savedSearchAlertsService");
      expect(alertsService.findMatchingSavedSearches).toBeDefined();
      expect(alertsService.getNewPropertiesForSearch).toBeDefined();
      expect(alertsService.createSavedSearch).toBeDefined();
      expect(alertsService.updateNotificationPreferences).toBeDefined();
      expect(alertsService.getUserSavedSearches).toBeDefined();
    });
  });
});
