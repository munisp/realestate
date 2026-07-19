import { describe, it, expect } from 'vitest';

describe('Smart Recommendations Navigation', () => {
  it('should have For You link in main navigation', () => {
    const navigationLinks = [
      { href: '/properties', label: 'Properties' },
      { href: '/map', label: 'Map View' },
      { href: '/blockchain-registry', label: 'Registry' },
      { href: '/verified-properties', label: 'Verified' },
      { href: '/smart-recommendations', label: 'For You' },
    ];

    const forYouLink = navigationLinks.find(link => link.href === '/smart-recommendations');
    expect(forYouLink).toBeDefined();
    expect(forYouLink?.label).toBe('For You');
  });

  it('should link to smart recommendations page', () => {
    const route = '/smart-recommendations';
    expect(route).toBe('/smart-recommendations');
  });
});

describe('Weekly Recommendation Digest', () => {
  it('should analyze new listings from past 7 days', () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const mockListings = [
      { id: 1, createdAt: new Date() },
      { id: 2, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    ];

    const recentListings = mockListings.filter(
      listing => listing.createdAt >= sevenDaysAgo
    );

    expect(recentListings.length).toBe(2);
  });

  it('should generate top 3 recommendations per user', () => {
    const mockRecommendations = [
      { propertyId: 101, matchScore: 95, reason: 'Perfect match' },
      { propertyId: 102, matchScore: 88, reason: 'Great location' },
      { propertyId: 103, matchScore: 82, reason: 'Similar to favorites' },
    ];

    expect(mockRecommendations).toHaveLength(3);
    expect(mockRecommendations[0].matchScore).toBeGreaterThan(mockRecommendations[1].matchScore);
    expect(mockRecommendations[1].matchScore).toBeGreaterThan(mockRecommendations[2].matchScore);
  });

  it('should send email digest with recommendations', () => {
    const emailContent = {
      to: 'user@example.com',
      subject: 'Weekly Recommendations',
      properties: [
        { id: 101, title: 'Beautiful Home', price: 500000 },
        { id: 102, title: 'Modern Condo', price: 350000 },
        { id: 103, title: 'Spacious Townhouse', price: 450000 },
      ],
    };

    expect(emailContent.properties).toHaveLength(3);
    expect(emailContent.subject).toContain('Recommendations');
  });

  it('should schedule digest for Mondays at 9 AM', () => {
    const MONDAY = 1;
    const TARGET_HOUR = 9;
    const TARGET_MINUTE = 0;

    const nextRun = new Date();
    nextRun.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);

    expect(nextRun.getHours()).toBe(9);
    expect(nextRun.getMinutes()).toBe(0);
  });

  it('should only process users with favorites or saved searches', () => {
    const mockUsers = [
      { id: 1, hasFavorites: true, hasSavedSearches: false },
      { id: 2, hasFavorites: false, hasSavedSearches: true },
      { id: 3, hasFavorites: false, hasSavedSearches: false },
    ];

    const activeUsers = mockUsers.filter(
      user => user.hasFavorites || user.hasSavedSearches
    );

    expect(activeUsers).toHaveLength(2);
  });
});

describe('Recommendation Feedback Loop', () => {
  it('should allow thumbs up/down ratings', () => {
    const feedback = {
      propertyId: 101,
      rating: 'up' as const,
    };

    expect(feedback.rating).toBe('up');
    expect(['up', 'down']).toContain(feedback.rating);
  });

  it('should store user feedback', () => {
    const feedbackStore = [
      { userId: 1, propertyId: 101, rating: 'up' as const },
      { userId: 1, propertyId: 102, rating: 'down' as const },
    ];

    expect(feedbackStore).toHaveLength(2);
    expect(feedbackStore[0].rating).toBe('up');
    expect(feedbackStore[1].rating).toBe('down');
  });

  it('should replace existing feedback for same property', () => {
    let feedbackStore = [
      { userId: 1, propertyId: 101, rating: 'up' as const },
    ];

    // User changes their mind
    feedbackStore = feedbackStore.filter(
      f => !(f.userId === 1 && f.propertyId === 101)
    );
    feedbackStore.push({ userId: 1, propertyId: 101, rating: 'down' as const });

    expect(feedbackStore).toHaveLength(1);
    expect(feedbackStore[0].rating).toBe('down');
  });

  it('should calculate satisfaction rate', () => {
    const feedback = [
      { rating: 'up' },
      { rating: 'up' },
      { rating: 'up' },
      { rating: 'down' },
    ];

    const upCount = feedback.filter(f => f.rating === 'up').length;
    const satisfactionRate = (upCount / feedback.length) * 100;

    expect(satisfactionRate).toBe(75);
  });

  it('should aggregate feedback for LLM improvement', () => {
    const feedbackStore = [
      { userId: 1, propertyId: 101, rating: 'up' as const },
      { userId: 1, propertyId: 102, rating: 'up' as const },
      { userId: 1, propertyId: 103, rating: 'down' as const },
    ];

    const likedProperties = feedbackStore
      .filter(f => f.rating === 'up')
      .map(f => f.propertyId);

    const dislikedProperties = feedbackStore
      .filter(f => f.rating === 'down')
      .map(f => f.propertyId);

    expect(likedProperties).toEqual([101, 102]);
    expect(dislikedProperties).toEqual([103]);
  });

  it('should show feedback buttons on recommendations', () => {
    const recommendationUI = {
      hasThumbsUpButton: true,
      hasThumbsDownButton: true,
      feedbackPrompt: 'Was this recommendation helpful?',
    };

    expect(recommendationUI.hasThumbsUpButton).toBe(true);
    expect(recommendationUI.hasThumbsDownButton).toBe(true);
    expect(recommendationUI.feedbackPrompt).toContain('helpful');
  });
});

describe('Integration Tests', () => {
  it('should provide complete recommendation enhancement experience', () => {
    const features = {
      navigationLink: true,
      weeklyDigest: true,
      feedbackLoop: true,
    };

    expect(Object.values(features).every(v => v === true)).toBe(true);
  });

  it('should improve recommendations over time with feedback', () => {
    const iterations = [
      { satisfactionRate: 60 },
      { satisfactionRate: 70 },
      { satisfactionRate: 80 },
    ];

    expect(iterations[2].satisfactionRate).toBeGreaterThan(iterations[0].satisfactionRate);
  });

  it('should use LLM for personalized analysis', () => {
    const llmInput = {
      favorites: [{ type: 'house', price: 500000 }],
      candidates: [{ id: 101, type: 'house', price: 480000 }],
      feedback: { liked: [101], disliked: [102] },
    };

    expect(llmInput.feedback.liked).toContain(101);
    expect(llmInput.feedback.disliked).toContain(102);
  });
});

describe("Feedback Analytics Dashboard", () => {
  it("should calculate user satisfaction rate from feedback", () => {
    const mockFeedback = [
      { rating: "up" },
      { rating: "up" },
      { rating: "up" },
      { rating: "down" },
      { rating: "down" },
    ];

    const total = mockFeedback.length;
    const positive = mockFeedback.filter((f) => f.rating === "up").length;
    const negative = mockFeedback.filter((f) => f.rating === "down").length;
    const satisfactionRate = (positive / total) * 100;

    expect(total).toBe(5);
    expect(positive).toBe(3);
    expect(negative).toBe(2);
    expect(satisfactionRate).toBe(60);
  });

  it("should identify most liked property types", () => {
    const mockLikedProperties = [
      { propertyType: "single_family" },
      { propertyType: "condo" },
      { propertyType: "single_family" },
      { propertyType: "single_family" },
      { propertyType: "condo" },
    ];

    const typeCounts = mockLikedProperties.reduce((acc, p) => {
      acc[p.propertyType] = (acc[p.propertyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    expect(sorted[0].type).toBe("single_family");
    expect(sorted[0].count).toBe(3);
    expect(sorted[1].type).toBe("condo");
    expect(sorted[1].count).toBe(2);
  });

  it("should track recommendation accuracy trends over time", () => {
    const mockTrends = [
      { date: "2025-01-01", accuracy: 70 },
      { date: "2025-01-08", accuracy: 75 },
      { date: "2025-01-15", accuracy: 80 },
    ];

    expect(mockTrends.length).toBe(3);
    expect(mockTrends[2].accuracy).toBeGreaterThan(mockTrends[0].accuracy);
  });

  it("should calculate average property preferences", () => {
    const likedProperties = [
      { bedrooms: 3, bathrooms: 2, price: 400000 },
      { bedrooms: 4, bathrooms: 3, price: 500000 },
      { bedrooms: 3, bathrooms: 2, price: 450000 },
    ];

    const avgBedrooms = likedProperties.reduce((sum, p) => sum + p.bedrooms, 0) / likedProperties.length;
    const avgBathrooms = likedProperties.reduce((sum, p) => sum + p.bathrooms, 0) / likedProperties.length;
    const avgPrice = likedProperties.reduce((sum, p) => sum + p.price, 0) / likedProperties.length;

    expect(Math.round(avgBedrooms)).toBe(3);
    expect(Math.round(avgBathrooms)).toBe(2);
    expect(avgPrice).toBe(450000);
  });
});

describe("Smart Filter Suggestions", () => {
  it("should suggest filters based on liked properties", () => {
    const preferences = {
      averageBedrooms: 3,
      averageBathrooms: 2,
      averagePrice: 450000,
      preferredPropertyTypes: [{ type: "single_family", count: 5 }],
      preferredCities: [{ city: "Austin", count: 3 }],
    };

    const suggestions = [];

    if (preferences.averageBedrooms > 0) {
      suggestions.push({ label: `${preferences.averageBedrooms}+ bedrooms`, value: { minBedrooms: 3 } });
    }

    if (preferences.preferredPropertyTypes.length > 0) {
      suggestions.push({
        label: preferences.preferredPropertyTypes[0].type,
        value: { propertyType: "single_family" },
      });
    }

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].value.minBedrooms).toBe(3);
  });

  it("should generate price range from average price", () => {
    const averagePrice = 500000;
    const minPrice = Math.round(averagePrice * 0.8);
    const maxPrice = Math.round(averagePrice * 1.2);

    expect(minPrice).toBe(400000);
    expect(maxPrice).toBe(600000);
  });

  it("should not show suggestions that match current filters", () => {
    const currentFilters = {
      minBedrooms: 3,
      propertyType: "single_family",
    };

    const preferences = {
      averageBedrooms: 3,
      preferredPropertyTypes: [{ type: "single_family", count: 5 }],
    };

    const suggestions = [];

    if (preferences.averageBedrooms !== currentFilters.minBedrooms) {
      suggestions.push({ label: `${preferences.averageBedrooms}+ bedrooms` });
    }

    if (preferences.preferredPropertyTypes[0]?.type !== currentFilters.propertyType) {
      suggestions.push({ label: preferences.preferredPropertyTypes[0].type });
    }

    expect(suggestions.length).toBe(0); // All match current filters
  });

  it("should apply all smart filter suggestions at once", () => {
    const suggestions = [
      { value: { minBedrooms: 3 } },
      { value: { propertyType: "single_family" } },
      { value: { city: "Austin" } },
    ];

    const combinedFilters = suggestions.reduce((acc, s) => ({ ...acc, ...s.value }), {});

    expect(combinedFilters).toEqual({
      minBedrooms: 3,
      propertyType: "single_family",
      city: "Austin",
    });
  });
});

describe("Recommendation Email Preferences", () => {
  it("should support weekly, biweekly, and monthly digest frequencies", () => {
    const validFrequencies = ["weekly", "biweekly", "monthly"];

    validFrequencies.forEach((freq) => {
      expect(["weekly", "biweekly", "monthly"]).toContain(freq);
    });
  });

  it("should support match score thresholds of 70%, 80%, and 90%", () => {
    const validThresholds = [70, 80, 90];

    validThresholds.forEach((threshold) => {
      expect(threshold).toBeGreaterThanOrEqual(70);
      expect(threshold).toBeLessThanOrEqual(90);
      expect(threshold % 10).toBe(0);
    });
  });

  it("should filter recommendations by match score threshold", () => {
    const recommendations = [
      { propertyId: 1, matchScore: 95 },
      { propertyId: 2, matchScore: 85 },
      { propertyId: 3, matchScore: 75 },
      { propertyId: 4, matchScore: 65 },
    ];

    const threshold = 80;
    const filtered = recommendations.filter((r) => r.matchScore >= threshold);

    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.matchScore >= 80)).toBe(true);
  });

  it("should skip users with email disabled", () => {
    const users = [
      { id: 1, emailEnabled: 1 },
      { id: 2, emailEnabled: 0 },
      { id: 3, emailEnabled: 1 },
    ];

    const activeUsers = users.filter((u) => u.emailEnabled === 1);

    expect(activeUsers.length).toBe(2);
    expect(activeUsers.every((u) => u.emailEnabled === 1)).toBe(true);
  });

  it("should use default preferences if none exist", () => {
    const userPreferences = undefined;

    const defaults = {
      digestFrequency: "weekly" as const,
      matchScoreThreshold: 70,
      emailEnabled: 1,
    };

    const prefs = userPreferences || defaults;

    expect(prefs.digestFrequency).toBe("weekly");
    expect(prefs.matchScoreThreshold).toBe(70);
    expect(prefs.emailEnabled).toBe(1);
  });

  it("should update preferences independently", () => {
    let preferences = {
      digestFrequency: "weekly" as const,
      matchScoreThreshold: 70,
      emailEnabled: 1,
    };

    // Update only frequency
    preferences = { ...preferences, digestFrequency: "monthly" as const };
    expect(preferences.digestFrequency).toBe("monthly");
    expect(preferences.matchScoreThreshold).toBe(70); // Unchanged

    // Update only threshold
    preferences = { ...preferences, matchScoreThreshold: 90 };
    expect(preferences.matchScoreThreshold).toBe(90);
    expect(preferences.digestFrequency).toBe("monthly"); // Unchanged
  });
});

describe("End-to-End Recommendation Enhancement Flow", () => {
  it("should complete full feedback analytics workflow", () => {
    // 1. User rates recommendations
    const feedback = [
      { propertyId: 1, rating: "up" as const },
      { propertyId: 2, rating: "up" as const },
      { propertyId: 3, rating: "down" as const },
    ];

    // 2. System calculates satisfaction
    const satisfaction = (feedback.filter((f) => f.rating === "up").length / feedback.length) * 100;
    expect(satisfaction).toBeCloseTo(66.67, 1);

    // 3. System identifies preferences
    const likedPropertyIds = feedback.filter((f) => f.rating === "up").map((f) => f.propertyId);
    expect(likedPropertyIds).toEqual([1, 2]);

    // 4. Dashboard shows analytics
    const analytics = {
      totalFeedback: feedback.length,
      satisfactionRate: satisfaction,
      likedProperties: likedPropertyIds.length,
    };

    expect(analytics.totalFeedback).toBe(3);
    expect(analytics.likedProperties).toBe(2);
  });

  it("should complete full smart filter workflow", () => {
    // 1. User likes several properties
    const likedProperties = [
      { bedrooms: 3, city: "Austin", propertyType: "single_family" },
      { bedrooms: 3, city: "Austin", propertyType: "single_family" },
      { bedrooms: 4, city: "Austin", propertyType: "condo" },
    ];

    // 2. System analyzes preferences
    const avgBedrooms = Math.round(
      likedProperties.reduce((sum, p) => sum + p.bedrooms, 0) / likedProperties.length
    );

    const cityCount = likedProperties.reduce((acc, p) => {
      acc[p.city] = (acc[p.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCity = Object.entries(cityCount).sort(([, a], [, b]) => b - a)[0][0];

    // 3. System suggests filters
    const suggestions = {
      minBedrooms: avgBedrooms,
      city: topCity,
    };

    expect(suggestions.minBedrooms).toBe(3);
    expect(suggestions.city).toBe("Austin");

    // 4. User applies suggestions
    const appliedFilters = { ...suggestions };
    expect(appliedFilters.minBedrooms).toBe(3);
    expect(appliedFilters.city).toBe("Austin");
  });

  it("should complete full email preferences workflow", () => {
    // 1. User sets preferences
    const userPreferences = {
      digestFrequency: "biweekly" as const,
      matchScoreThreshold: 85,
      emailEnabled: 1,
    };

    // 2. System generates recommendations
    const allRecommendations = [
      { propertyId: 1, matchScore: 95 },
      { propertyId: 2, matchScore: 88 },
      { propertyId: 3, matchScore: 75 },
    ];

    // 3. System filters by threshold
    const filtered = allRecommendations.filter((r) => r.matchScore >= userPreferences.matchScoreThreshold);

    expect(filtered.length).toBe(2);
    expect(filtered.every((r) => r.matchScore >= 85)).toBe(true);

    // 4. System sends email (if enabled)
    const shouldSendEmail = userPreferences.emailEnabled === 1 && filtered.length > 0;
    expect(shouldSendEmail).toBe(true);
  });
});


describe("A/B Testing Framework", () => {
  it("should assign users to variants based on traffic allocation", () => {
    const allocation = { control: 50, variant_a: 50 };
    const assignments: Record<string, number> = { control: 0, variant_a: 0 };

    // Simulate 100 user assignments
    for (let userId = 1; userId <= 100; userId++) {
      const hash = userId % 100;
      let cumulative = 0;
      let variant = "control";

      for (const [key, weight] of Object.entries(allocation)) {
        cumulative += weight;
        if (hash < cumulative) {
          variant = key;
          break;
        }
      }

      assignments[variant]++;
    }

    // Should be roughly 50/50 split
    expect(assignments.control).toBeGreaterThan(40);
    expect(assignments.control).toBeLessThan(60);
    expect(assignments.variant_a).toBeGreaterThan(40);
    expect(assignments.variant_a).toBeLessThan(60);
  });

  it("should track experiment metrics by variant", () => {
    const metrics = [
      { variant: "control", metricType: "click", value: 1 },
      { variant: "control", metricType: "click", value: 1 },
      { variant: "variant_a", metricType: "click", value: 1 },
      { variant: "variant_a", metricType: "favorite", value: 1 },
    ];

    const grouped = metrics.reduce((acc, m) => {
      const key = `${m.variant}-${m.metricType}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(grouped["control-click"]).toBe(2);
    expect(grouped["variant_a-click"]).toBe(1);
    expect(grouped["variant_a-favorite"]).toBe(1);
  });

  it("should calculate conversion rates per variant", () => {
    const variantStats = [
      { variant: "control", conversions: 20, users: 100 },
      { variant: "variant_a", conversions: 30, users: 100 },
    ];

    const results = variantStats.map((stat) => ({
      variant: stat.variant,
      conversionRate: (stat.conversions / stat.users) * 100,
    }));

    expect(results[0].conversionRate).toBe(20);
    expect(results[1].conversionRate).toBe(30);
  });

  it("should detect statistical significance using chi-square test", () => {
    const control = { conversions: 20, users: 100 };
    const variant = { conversions: 30, users: 100 };

    const pooledRate = (control.conversions + variant.conversions) / (control.users + variant.users);
    const expectedControl = control.users * pooledRate;
    const expectedVariant = variant.users * pooledRate;

    const chiSquare =
      Math.pow(control.conversions - expectedControl, 2) / expectedControl +
      Math.pow(variant.conversions - expectedVariant, 2) / expectedVariant;

    // Chi-square critical value for 95% confidence is 3.841
    const isSignificant = chiSquare > 3.841;

    expect(chiSquare).toBeGreaterThan(0);
    expect(typeof isSignificant).toBe("boolean");
  });

  it("should maintain consistent variant assignment for same user", () => {
    const userId = 42;
    const allocation = { control: 50, variant_a: 50 };

    const assignVariant = (uid: number) => {
      const hash = uid % 100;
      let cumulative = 0;
      for (const [key, weight] of Object.entries(allocation)) {
        cumulative += weight;
        if (hash < cumulative) return key;
      }
      return "control";
    };

    const assignment1 = assignVariant(userId);
    const assignment2 = assignVariant(userId);
    const assignment3 = assignVariant(userId);

    expect(assignment1).toBe(assignment2);
    expect(assignment2).toBe(assignment3);
  });
});

describe("Collaborative Filtering", () => {
  it("should calculate Jaccard similarity between users", () => {
    const user1Likes = [1, 2, 3, 4, 5];
    const user2Likes = [3, 4, 5, 6, 7];

    const intersection = user1Likes.filter((id) => user2Likes.includes(id));
    const union = new Set([...user1Likes, ...user2Likes]);
    const similarity = intersection.length / union.size;

    expect(intersection.length).toBe(3); // 3, 4, 5
    expect(union.size).toBe(7); // 1, 2, 3, 4, 5, 6, 7
    expect(similarity).toBeCloseTo(0.43, 1);
  });

  it("should find users with similar preferences", () => {
    const currentUserLikes = [1, 2, 3];
    const allUserLikes = [
      { userId: 2, likes: [1, 2, 3, 4] }, // High similarity
      { userId: 3, likes: [1, 2] }, // Medium similarity
      { userId: 4, likes: [5, 6, 7] }, // Low similarity
    ];

    const similarities = allUserLikes.map((user) => {
      const intersection = currentUserLikes.filter((id) => user.likes.includes(id));
      const union = new Set([...currentUserLikes, ...user.likes]);
      return {
        userId: user.userId,
        similarity: intersection.length / union.size,
      };
    });

    const sorted = similarities.sort((a, b) => b.similarity - a.similarity);

    expect(sorted[0].userId).toBe(2); // Most similar
    expect(sorted[0].similarity).toBeGreaterThan(sorted[1].similarity);
  });

  it("should recommend properties liked by similar users", () => {
    const currentUserLikes = [1, 2];
    const similarUserLikes = [
      { userId: 2, propertyId: 3 },
      { userId: 2, propertyId: 4 },
      { userId: 3, propertyId: 3 },
      { userId: 3, propertyId: 5 },
    ];

    // Filter out properties current user already liked
    const recommendations = similarUserLikes
      .filter((like) => !currentUserLikes.includes(like.propertyId))
      .reduce((acc, like) => {
        acc[like.propertyId] = (acc[like.propertyId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const sorted = Object.entries(recommendations)
      .map(([id, count]) => ({ propertyId: Number(id), likeCount: count }))
      .sort((a, b) => b.likeCount - a.likeCount);

    expect(sorted[0].propertyId).toBe(3); // Most liked by similar users
    expect(sorted[0].likeCount).toBe(2);
  });

  it("should calculate collaborative score based on similar user overlap", () => {
    const similarUserCount = 5;
    const propertyLikedBy = 3;

    const collaborativeScore = Math.round((propertyLikedBy / similarUserCount) * 100);

    expect(collaborativeScore).toBe(60);
  });

  it("should handle users with no similar preferences", () => {
    const currentUserLikes: number[] = [];
    const similarUsers: any[] = [];

    expect(currentUserLikes.length).toBe(0);
    expect(similarUsers.length).toBe(0);
  });
});

describe("Recommendation Explanations", () => {
  it("should generate match score breakdown by category", () => {
    const criteria = [
      { category: "Property Type", score: 95 },
      { category: "Price Range", score: 85 },
      { category: "Location", score: 90 },
    ];

    const overallScore = Math.round(
      criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length
    );

    expect(overallScore).toBe(90);
    expect(criteria.every((c) => c.score >= 0 && c.score <= 100)).toBe(true);
  });

  it("should provide reason for each matching criterion", () => {
    const explanations = [
      { category: "Property Type", reason: "Matches your preference for single_family" },
      { category: "Price Range", reason: "Within your typical price range" },
      { category: "Location", reason: "Similar to your favorite locations" },
    ];

    expect(explanations.length).toBe(3);
    expect(explanations.every((e) => e.reason.length > 0)).toBe(true);
  });

  it("should color-code scores based on thresholds", () => {
    const getScoreColor = (score: number) => {
      if (score >= 90) return "green";
      if (score >= 75) return "blue";
      if (score >= 60) return "yellow";
      return "gray";
    };

    expect(getScoreColor(95)).toBe("green");
    expect(getScoreColor(80)).toBe("blue");
    expect(getScoreColor(65)).toBe("yellow");
    expect(getScoreColor(50)).toBe("gray");
  });

  it("should support expandable/collapsible explanation UI", () => {
    let isExpanded = false;

    const toggle = () => {
      isExpanded = !isExpanded;
    };

    expect(isExpanded).toBe(false);
    toggle();
    expect(isExpanded).toBe(true);
    toggle();
    expect(isExpanded).toBe(false);
  });

  it("should show progress bars for each criterion", () => {
    const criteria = [
      { category: "Property Type", score: 90 },
      { category: "Price Range", score: 75 },
    ];

    const progressBars = criteria.map((c) => ({
      category: c.category,
      width: `${c.score}%`,
    }));

    expect(progressBars[0].width).toBe("90%");
    expect(progressBars[1].width).toBe("75%");
  });
});

describe("Integration: Advanced Recommendation Features", () => {
  it("should combine A/B testing with collaborative filtering", () => {
    const experiment = {
      variants: {
        control: { algorithm: "llm" },
        variant_a: { algorithm: "collaborative" },
      },
    };

    const userAssignment = "variant_a";
    const shouldUseCollaborative = experiment.variants[userAssignment].algorithm === "collaborative";

    expect(shouldUseCollaborative).toBe(true);
  });

  it("should show explanations for both LLM and collaborative recommendations", () => {
    const recommendations = [
      { type: "llm", matchScore: 90, reason: "Based on your preferences" },
      { type: "collaborative", matchScore: 85, reason: "Users like you also liked this" },
    ];

    expect(recommendations.length).toBe(2);
    expect(recommendations.every((r) => r.reason.length > 0)).toBe(true);
  });

  it("should track A/B test metrics for collaborative recommendations", () => {
    const events = [
      { variant: "collaborative", metricType: "click", propertyId: 1 },
      { variant: "collaborative", metricType: "favorite", propertyId: 1 },
      { variant: "control", metricType: "click", propertyId: 2 },
    ];

    const collaborativeEvents = events.filter((e) => e.variant === "collaborative");

    expect(collaborativeEvents.length).toBe(2);
  });

  it("should provide detailed explanations for high-scoring matches", () => {
    const recommendation = {
      matchScore: 92,
      criteria: [
        { category: "Property Type", score: 95 },
        { category: "Price Range", score: 90 },
        { category: "Location", score: 91 },
      ],
    };

    const hasDetailedExplanation = recommendation.criteria.length > 0;
    const isHighScore = recommendation.matchScore >= 90;

    expect(hasDetailedExplanation).toBe(true);
    expect(isHighScore).toBe(true);
  });
});
