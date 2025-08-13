import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/jwtAuth";
import { logger } from "../utils/logger";
import { z } from "zod";
import { templateQualityService } from "../services/templateQualityService";
import { sanitizeResponseDates } from "../utils/dateSanitizer";
import { db } from "../db-connection";
import { templatePurchases, templates } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { searchRateLimit, templateCreationRateLimit, paymentRateLimit } from "../middleware/rateLimiting";
import { optimizedQueries } from "../storage-consumer-optimized";
import { auditService } from "../services/auditService";

const router = Router();

// Template creation schema
const createTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().min(0).max(9999),
  currency: z.string().default("USD"),
  cover_image: z.string().optional(),
  destinations: z.array(z.string()).default([]),
  duration: z.number().min(1).max(365).optional(),
  trip_data: z.any(), // Full trip itinerary JSON
  tags: z.array(z.string()).default([]),
});

// GET /api/templates - Browse marketplace templates
router.get("/", searchRateLimit, async (req, res) => {
  try {
    const {
      search,
      tag,
      minPrice,
      maxPrice,
      duration,
      destination,
      sort = "popular",
      page = "1",
      limit = "20",
    } = req.query;

    // Get published templates with SQL filtering and pagination
    const result = await storage.searchTemplates({
      search: search as string | undefined,
      tag: tag as string | undefined,
      minPrice: minPrice ? parseFloat(String(minPrice)) : undefined,
      maxPrice: maxPrice ? parseFloat(String(maxPrice)) : undefined,
      duration: duration ? parseInt(String(duration)) : undefined,
      destination: destination as string | undefined,
      sort: sort as string,
      page: parseInt(String(page)),
      limit: parseInt(String(limit)),
    });

    let templates = result.templates;

    // Batch fetch creator profiles to avoid N+1 queries
    if (templates.length > 0) {
      const templateIds = templates.map(t => t.id);
      const templatesWithCreators = await optimizedQueries.getTemplatesWithCreators(templateIds);

      // Map creator data back to templates
      const creatorMap = new Map(templatesWithCreators.map(t => [t.id, t.creator]));
      templates = templates.map(template => ({
        ...template,
        creator: creatorMap.get(template.id)
      }));
    }

    // Transform templates to include activities array for frontend
    templates = templates.map((template) => {
      const tripData = (template.trip_data as any) || {};
      let activities: any[] = [];

      // Calculate a base date for the template (30 days from now)
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 30);

      // Extract activities from the days structure
      if (tripData.days && Array.isArray(tripData.days)) {
        tripData.days.forEach((day: any) => {
          if (day.activities && Array.isArray(day.activities)) {
            // Calculate the date for this day
            const dayDate = new Date(baseDate);
            const dayNumber = parseInt(day.day) || 1;
            dayDate.setDate(dayDate.getDate() + (dayNumber - 1));

            // Check if date is valid before converting
            const dateStr = !isNaN(dayDate.getTime())
              ? dayDate.toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]; // Fallback to today

            day.activities.forEach((activity: any) => {
              activities.push({
                ...activity,
                day: day.day,
                dayTitle: day.title,
                date: dateStr, // Add the date field for grouping
                locationName: activity.location, // Frontend expects locationName
              });
            });
          }
        });
      }

      // Add the activities array to tripData
      tripData.activities = activities;

      return {
        ...template,
        tripData, // Frontend expects camelCase
        salesCount: template.sales_count || 0, // Add camelCase versions
        reviewCount: template.review_count || 0,
        coverImage: template.cover_image,
        viewCount: template.view_count || 0,
      };
    });

    res.json({
      templates: sanitizeResponseDates(templates),
      pagination: {
        page: result.page,
        limit: parseInt(String(limit)),
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    logger.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// GET /api/templates/my - Get user's own templates
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templates = await storage.getTemplatesByUserId(userId);
    res.json(sanitizeResponseDates(templates));
  } catch (error) {
    logger.error("Error fetching user templates:", error);
    res.status(500).json({ message: "Failed to fetch your templates" });
  }
});

// GET /api/templates/purchased - Get user's purchased templates
router.get("/purchased", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const purchases = await storage.getUserPurchases(userId);

    if (purchases.length === 0) {
      return res.json([]);
    }

    // Batch fetch all templates at once to avoid N+1 queries
    const templateIds = purchases.map(p => p.template_id);
    const templatesWithCreators = await optimizedQueries.getTemplatesWithCreators(templateIds);

    // Create a map for quick lookup
    const templateMap = new Map(templatesWithCreators.map(t => [t.id, t]));

    // Combine purchase data with template data
    const templates = purchases.map(purchase => {
      const template = templateMap.get(purchase.template_id);
      if (!template) return null;

      return {
        ...template,
        purchaseDate: purchase.purchased_at,
        purchaseId: purchase.id,
      };
    }).filter(t => t !== null);

    res.json(sanitizeResponseDates(templates));
  } catch (error) {
    logger.error("Error fetching purchased templates:", error);
    res.status(500).json({ message: "Failed to fetch purchased templates" });
  }
});

// GET /api/templates/:slug - Get single template by slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const template = await storage.getTemplateBySlug(slug);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Increment view count
    await storage.incrementTemplateViews(template.id);

    // Check if user has purchased (if requireAuthd)
    let hasPurchased = false;
    let purchaseStatus = null;
    if (req.user) {
      // Check not just if purchased, but if purchase is still valid
      const purchases = await db.select()
        .from(templatePurchases)
        .where(and(
          eq(templatePurchases.buyer_id, req.user.id),
          eq(templatePurchases.template_id, template.id)
        ))
        .limit(1);

      if (purchases.length > 0) {
        purchaseStatus = purchases[0].status;
        // Only consider it purchased if status is completed (not refunded/disputed)
        hasPurchased = purchases[0].status === 'completed';
      }
    }

    // Get creator profile
    const creatorProfile = await storage.getCreatorProfile(template.user_id);

    // Get reviews
    const reviews = await storage.getTemplateReviews(template.id);

    // Transform template data for frontend
    const tripData = (template.trip_data as any) || {};
    let activities: any[] = [];

    // Calculate a base date for the template (30 days from now)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 30);

    // Extract activities - check both formats (days structure or direct activities array)
    if (tripData.activities && Array.isArray(tripData.activities)) {
      // Direct activities array (new format from AI generation)
      activities = tripData.activities;
    } else if (tripData.days && Array.isArray(tripData.days)) {
      tripData.days.forEach((day: any) => {
        if (day.activities && Array.isArray(day.activities)) {
          // Calculate the date for this day
          const dayDate = new Date(baseDate);
          const dayNumber = parseInt(day.day) || 1;
          dayDate.setDate(dayDate.getDate() + (dayNumber - 1));

          // Check if date is valid before converting
          const dateStr = !isNaN(dayDate.getTime())
            ? dayDate.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]; // Fallback to today

          day.activities.forEach((activity: any) => {
            activities.push({
              ...activity,
              day: day.day,
              dayTitle: day.title,
              date: dateStr, // Add the date field for grouping
              locationName: activity.location, // Frontend expects locationName
            });
          });
        }
      });
    }

    // Add the activities array to tripData
    tripData.activities = activities;

    res.json(
      sanitizeResponseDates({
        ...template,
        tripData, // Frontend expects camelCase
        salesCount: template.sales_count || 0,
        reviewCount: template.review_count || 0,
        coverImage: template.cover_image,
        viewCount: template.view_count || 0,
        hasPurchased,
        creator: creatorProfile,
        reviews,
      }),
    );
  } catch (error) {
    logger.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST /api/templates - Create new template
router.post("/", requireAuth, templateCreationRateLimit, async (req, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = createTemplateSchema.parse(req.body);

    // Ensure creator profile exists
    await storage.getOrCreateCreatorProfile(userId);

    const template = await storage.createTemplate({
      ...validatedData,
      user_id: userId,
      status: "draft",
    });

    // Audit log template creation
    await auditService.logTemplateEvent('template.created', template.id, userId, {
      title: template.title,
      price: template.price,
      status: template.status
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid template data",
        errors: error.errors,
      });
    }
    logger.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// GET /api/templates/suggest-price - Get AI-suggested pricing
router.get("/suggest-price", requireAuth, async (req, res) => {
  try {
    const {
      duration,
      activityCount,
      destinations,
      tags,
      hasFlights,
      hasHotels,
      hasMeals,
    } = req.query;

    const { pricingSuggestionService } = await import(
      "../services/pricingSuggestionService"
    );

    // Get user's creator score
    const user = await storage.getUserById(req.user!.id);

    // Get similar templates prices
    const similarPrices =
      await pricingSuggestionService.getSimilarTemplatesPrices(
        parseInt(String(duration || "7")),
        String(destinations || "")
          .split(",")
          .filter(Boolean),
        storage,
      );

    const suggestion = pricingSuggestionService.calculateSuggestedPrice({
      duration: parseInt(String(duration || "7")),
      activityCount: parseInt(String(activityCount || "0")),
      hasFlights: hasFlights === "true",
      hasHotels: hasHotels === "true",
      hasMeals: hasMeals === "true",
      hasTransportation: false,
      destinations: String(destinations || "")
        .split(",")
        .filter(Boolean),
      tags: String(tags || "")
        .split(",")
        .filter(Boolean),
      creatorScore: user?.creator_score ?? undefined,
      similarTemplatesPrices: similarPrices,
    });

    res.json(suggestion);
  } catch (error) {
    logger.error("Error suggesting price:", error);
    res.status(500).json({ message: "Failed to suggest price" });
  }
});

// POST /api/templates/from-trip/:tripId - Create template from existing trip
router.post("/from-trip/:tripId", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tripId } = req.params;
    const { title, description, price, tags, coverImage } = req.body;

    // Get the trip
    const trip = await storage.getTrip(parseInt(tripId));
    if (!trip || trip.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Trip not found or access denied" });
    }

    // Enhanced anti-piracy check using multiple detection methods
    const { antiPiracyService } = await import("../services/antiPiracyService");
    const { antiPiracyServiceV2 } = await import("../services/antiPiracyServiceV2");

    // First check user behavior patterns
    const behaviorAnalysis = await antiPiracyServiceV2.trackUserBehavior(userId);
    if (behaviorAnalysis.riskScore >= 70) {
      logger.warn(`High risk user ${userId} blocked from creating template. Risk score: ${behaviorAnalysis.riskScore}`, behaviorAnalysis.flags);
      return res.status(403).json({
        message: "Your account has been flagged for suspicious activity. Please contact support if you believe this is an error.",
        flags: behaviorAnalysis.flags
      });
    }

    const piracyCheck = await antiPiracyService.detectPiratedContent(
      parseInt(tripId),
      userId,
    );

    if (piracyCheck.isPirated) {
      logger.warn(
        `Anti-piracy blocked: User ${userId} attempted to create template from trip ${tripId}. Reason: ${piracyCheck.reason}. Confidence: ${piracyCheck.confidence}%`,
      );

      // Different messages based on confidence level
      if (piracyCheck.confidence >= 90) {
        return res.status(403).json({
          message:
            "This trip contains content from a purchased template and cannot be resold. Please create original content for your templates.",
        });
      } else if (piracyCheck.confidence >= 70) {
        return res.status(403).json({
          message:
            "This trip appears to be based on purchased content. Templates must contain original itineraries.",
        });
      } else {
        return res.status(403).json({
          message:
            "This trip may contain copyrighted content. Please ensure your templates are original creations.",
        });
      }
    }

    // Also check for duplicate content against ALL published templates
    const duplicateCheck = await antiPiracyService.checkForDuplicateContent(
      parseInt(tripId),
      userId,
    );
    if (duplicateCheck.isDuplicate) {
      logger.warn(
        `Duplicate content: User ${userId} trip ${tripId} is ${(duplicateCheck.similarity! * 100).toFixed(1)}% similar to template ${duplicateCheck.similarTemplateId}`,
      );
      return res.status(403).json({
        message:
          "This itinerary is too similar to an existing template. Please create unique content to differentiate your offering.",
      });
    }

    // Get trip activities
    const activities = await storage.getActivitiesByTripId(parseInt(tripId));

    // Import geocoding service if we need it
    const { geocodingService } = await import("../services/geocodingService");

    // Calculate duration
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const duration =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    // Prepare destinations
    const destinations = [];
    if (trip.city) destinations.push(trip.city);
    if (trip.country && !destinations.includes(trip.country)) {
      destinations.push(trip.country);
    }

    // Process activities and ensure they have coordinates
    const processedActivities = await Promise.all(
      activities.map(async (a) => {
        let latitude = a.latitude;
        let longitude = a.longitude;

        // If activity is missing coordinates but has a location name, geocode it
        if ((!latitude || !longitude) && a.location_name) {
            const geocoded = await geocodingService.geocodeWithFallback(
              a.location_name,
              trip.city || trip.country || undefined, // Use trip's city as context
            );
          if (geocoded) {
            latitude = geocoded.latitude;
            longitude = geocoded.longitude;
            logger.info(
              `Geocoded template activity: ${a.location_name} in ${trip.city} -> ${latitude}, ${longitude}`,
            );
          }
        }

        return {
          title: a.title,
          date: a.date,
          time: a.time,
          locationName: a.location_name,
          latitude,
          longitude,
          notes: a.notes,
          tag: a.tag,
          order: a.order,
          travelMode: a.travel_mode,
        };
      }),
    );

    // Create trip data JSON with geocoded activities
    const tripData = {
      title: trip.title,
      duration,
      city: trip.city,
      country: trip.country,
      location: trip.location,
      cityLatitude: trip.city_latitude,
      cityLongitude: trip.city_longitude,
      hotel: trip.hotel,
      hotelLatitude: trip.hotel_latitude,
      hotelLongitude: trip.hotel_longitude,
      activities: processedActivities,
    };

    // Create the template
    const template = await storage.createTemplate({
      user_id: userId,
      title: title || `${trip.title} Itinerary`,
      description:
        description ||
        `A ${duration}-day trip to ${trip.city || "an amazing destination"}`,
      price: price || 0,
      currency: "USD",
      cover_image: coverImage,
      destinations,
      duration,
      trip_data: tripData,
      tags: tags || [],
      status: "draft",
    });

    res.status(201).json(template);
  } catch (error) {
    logger.error("Error creating template from trip:", error);
    res.status(500).json({ message: "Failed to create template from trip" });
  }
});

// PUT /api/templates/:id - Update template
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);

    // Check ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    const updated = await storage.updateTemplate(templateId, req.body);
    res.json(updated);
  } catch (error) {
    logger.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});

// POST /api/templates/:id/publish - Publish template with quality checks
router.post("/:id/publish", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);

    // Check ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    // Run quality checks
    const qualityResult = await templateQualityService.checkTemplateQuality({
      title: template.title,
      description: template.description || "",
      price: parseFloat(template.price || "0"),
      tripData: template.trip_data as any,
      tags: (template.tags as string[]) || [],
      destinations: (template.destinations as string[]) || [],
      duration: template.duration || 0,
      userId: userId,
    });

    // Update quality score in database
    await templateQualityService.updateTemplateQuality(
      templateId,
      qualityResult,
    );

    // Check if template passes quality threshold
    if (!qualityResult.passed) {
      return res.status(400).json({
        message: "Template does not meet quality standards",
        qualityScore: qualityResult.score,
        issues: qualityResult.issues,
        minimumScore: 40,
      });
    }

    // Run auto-moderation for trusted creators
    const autoModResult = await templateQualityService.autoModerateTemplate(
      templateId,
      userId,
    );

    if (autoModResult.autoApproved) {
      logger.info(
        `Template ${templateId} auto-approved: ${autoModResult.reason}`,
      );

      return res.json({
        message: "Template submitted and automatically approved!",
        templateId,
        status: "published",
        qualityScore: qualityResult.score,
        autoApproved: true,
        approvalReason: autoModResult.reason,
      });
    }

    // If quality score is high enough, auto-approve
    let status = "published";
    let moderationStatus = "pending";

    if (qualityResult.score >= 70) {
      // High quality - auto-approve
      moderationStatus = "approved";
    } else {
      // Medium quality - needs review
      status = "draft"; // Keep as draft until reviewed
      logger.info(
        `Template ${templateId} needs manual review. Score: ${qualityResult.score}`,
      );
    }

    const updated = await storage.updateTemplate(templateId, {
      status,
      moderation_status: moderationStatus,
      quality_score: qualityResult.score,
    });

    res.json({
      ...updated,
      qualityScore: qualityResult.score,
      moderationStatus,
      message:
        qualityResult.score >= 70
          ? "Template published successfully!"
          : "Template submitted for review. You will be notified once approved.",
    });
  } catch (error) {
    logger.error("Error publishing template:", error);
    res.status(500).json({ message: "Failed to publish template" });
  }
});

// POST /api/templates/:id/unpublish - Unpublish template
router.post("/:id/unpublish", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);

    // Check ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    const updated = await storage.updateTemplate(templateId, {
      status: "draft",
    });
    res.json(updated);
  } catch (error) {
    logger.error("Error unpublishing template:", error);
    res.status(500).json({ message: "Failed to unpublish template" });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);

    // Check ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    // Don't allow deletion if template has sales
    if ((template.sales_count || 0) > 0) {
      return res.status(400).json({
        message:
          "Cannot delete template with existing sales. Unpublish instead.",
      });
    }

    await storage.deleteTemplate(templateId);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    logger.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// POST /api/templates/:id/purchase - Purchase template
router.post("/:id/purchase", requireAuth, paymentRateLimit, async (req, res) => {
  try {
    const buyerId = req.user!.id;
    const templateId = parseInt(req.params.id);
    const { paymentIntentId } = req.body;

    // Use database transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Get template within transaction
      const [template] = await tx.select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1)
        .for('update'); // Lock the row to prevent concurrent purchases

      if (!template || template.status !== "published") {
        throw new Error("Template not found or not available");
      }

      // Check if already purchased within transaction
      const [existingPurchase] = await tx.select()
        .from(templatePurchases)
        .where(and(
          eq(templatePurchases.buyer_id, buyerId),
          eq(templatePurchases.template_id, templateId),
          eq(templatePurchases.status, "completed")
        ))
        .limit(1);

      if (existingPurchase) {
        throw new Error("Template already purchased");
      }

      // Calculate fees - Industry standard: deduct Stripe fees first
      const grossPrice = parseFloat(template.price || "0");
      // Stripe fees: 2.9% + $0.30 per transaction
      const stripeFee = grossPrice * 0.029 + 0.3;
      const netRevenue = grossPrice - stripeFee;

      // Split net revenue: 70% to creator, 30% to platform
      const sellerEarnings = netRevenue * 0.7;
      const platformFee = netRevenue * 0.3;

      // Create purchase record within transaction
      const [purchase] = await tx.insert(templatePurchases).values({
        template_id: templateId,
        buyer_id: buyerId,
        seller_id: template.user_id,
        price: grossPrice.toFixed(2),
        platform_fee: platformFee.toFixed(2),
        seller_earnings: sellerEarnings.toFixed(2),
        stripe_fee: stripeFee.toFixed(2),
        stripe_payment_intent_id: paymentIntentId,
        status: "completed",
        purchased_at: new Date()
      }).returning();

      // Update template sales count atomically
      await tx.update(templates)
        .set({ 
          sales_count: sql`${templates.sales_count} + 1`,
          last_sale_at: new Date()
        })
        .where(eq(templates.id, templateId));

      return { purchase, template };
    });

    // Copy template to user's trips (outside transaction for performance)
    const { templateCopyService } = await import(
      "../services/templateCopyService"
    );
    const newTripId = await templateCopyService.copyTemplateToTrip(
      templateId,
      buyerId,
    );

    res.json({
      message: "Template purchased successfully",
      purchase: result.purchase,
      tripId: newTripId,
    });
  } catch (error: any) {
    logger.error("Error purchasing template:", error);
    
    // Return appropriate error message
    if (error.message === "Template already purchased") {
      return res.status(400).json({ message: error.message });
    } else if (error.message === "Template not found or not available") {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: "Failed to purchase template" });
  }
});

// POST /api/templates/:id/review - Add review
router.post("/:id/review", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);
    const { rating, review } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Check if user purchased the template
    const hasPurchased = await storage.hasUserPurchasedTemplate(
      userId,
      templateId,
    );
    if (!hasPurchased) {
      return res
        .status(403)
        .json({ message: "You must purchase the template to review it" });
    }

    // Check if already reviewed
    const existingReview = await storage.getUserReview(userId, templateId);
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this template" });
    }

    // Create review
    const newReview = await storage.createTemplateReview({
      template_id: templateId,
      user_id: userId,
      rating,
      review,
      verified_purchase: true,
    });

    res.status(201).json(newReview);
  } catch (error) {
    logger.error("Error creating review:", error);
    res.status(500).json({ message: "Failed to create review" });
  }
});

// GET /api/templates/:id/analytics - Get template analytics (creator only)
router.get("/:id/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);

    // Check ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    // Get purchases
    const purchases = await storage.getTemplatePurchases(templateId);

    // Calculate analytics
    const analytics = {
      views: template.view_count,
      sales: template.sales_count,
      revenue: purchases.reduce(
        (sum, p) => sum + parseFloat(p.seller_earnings || "0"),
        0,
      ),
      conversionRate:
        (template.view_count || 0) > 0
          ? (
              ((template.sales_count || 0) / (template.view_count || 1)) *
              100
            ).toFixed(2)
          : 0,
      averageRating: template.rating || 0,
      reviewCount: template.review_count,
      recentPurchases: purchases.slice(0, 10),
    };

    res.json(analytics);
  } catch (error) {
    logger.error("Error fetching template analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// GET /api/templates/share/:shareCode - Get template by share code or slug
router.get("/share/:shareCode", async (req, res) => {
  try {
    const { shareCode } = req.params;

    // First try to get by share code
    let template = await storage.getTemplateByShareCode(shareCode);

    // If not found, try treating it as a slug (for backward compatibility)
    if (!template) {
      template = await storage.getTemplateBySlug(shareCode);
    }

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Get creator info
    const creator = template.user_id
      ? await storage.getUser(template.user_id)
      : null;

    // Transform the template data for frontend
    const tripData = (template.trip_data as any) || {};
    let activities: any[] = [];

    // Calculate a base date for the template (30 days from now)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 30);

    // Extract activities from the days structure
    if (tripData.days && Array.isArray(tripData.days)) {
      tripData.days.forEach((day: any) => {
        if (day.activities && Array.isArray(day.activities)) {
          // Calculate the date for this day
          const dayDate = new Date(baseDate);
          const dayNumber = parseInt(day.day) || 1;
          dayDate.setDate(dayDate.getDate() + (dayNumber - 1));

          day.activities.forEach((activity: any) => {
            activities.push({
              ...activity,
              date: dayDate.toISOString(),
              day: dayNumber,
            });
          });
        }
      });
    }

    const transformedTemplate = {
      ...template,
      activities: activities,
      tripData: tripData,
      creator: creator
        ? {
            id: creator.id,
            username: creator.username,
            displayName: creator.display_name,
            verified: false,
          }
        : null,
    };

    res.json(sanitizeResponseDates(transformedTemplate));
  } catch (error) {
    logger.error("Error fetching template by share code:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST /api/templates/:id/share - Track social share
router.post("/:id/share", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { platform } = req.body;
    const userId = req.user?.id;

    if (!platform) {
      return res.status(400).json({ message: "Platform is required" });
    }

    const share = await storage.trackTemplateShare({
      template_id: templateId,
      shared_by: userId,
      platform,
    });

    res.json({
      message: "Share tracked successfully",
      shareCode: share.share_code,
      shareUrl: `${process.env.FRONTEND_URL}/t/${share.share_code}`,
    });
  } catch (error) {
    logger.error("Error tracking share:", error);
    res.status(500).json({ message: "Failed to track share" });
  }
});

// POST /api/templates/reuse - Create a new trip from an owned template
router.post("/reuse", requireAuth, async (req, res) => {
  try {
    const { template_id, start_date, end_date } = req.body;
    const userId = req.user!.id;

    logger.info(`User ${userId} attempting to reuse template ${template_id}`);

    if (!template_id || !start_date || !end_date) {
      return res.status(400).json({
        message: "Template ID and travel dates are required",
      });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        message: "Invalid date format provided",
      });
    }

    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        message: "End date must be after start date",
      });
    }

    // Verify user has purchased the template
    const hasPurchased = await storage.hasUserPurchasedTemplate(
      userId,
      template_id,
    );

    // Get template details
    const template = await storage.getTemplate(template_id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check if user owns the template (either purchased or it's free)
    if (!hasPurchased && parseFloat(template.price || "0") > 0) {
      logger.warn(
        `User ${userId} attempted to reuse unpurchased template ${template_id}`,
      );
      return res.status(403).json({
        message: "You must purchase this template before using it",
      });
    }

    // Copy template to user's trips with the selected dates
    const { templateCopyService } = await import(
      "../services/templateCopyService"
    );
    const newTripId = await templateCopyService.copyTemplateToTrip(
      template_id,
      userId,
      startDateObj,
      endDateObj,
    );

    logger.info(
      `Template ${template_id} reused by user ${userId}, created trip ${newTripId}`,
    );

    res.json({
      message: "Trip created successfully from template",
      tripId: newTripId,
    });
  } catch (error) {
    logger.error("Error reusing template:", error);
    res.status(500).json({ message: "Failed to create trip from template" });
  }
});

// GET /api/templates/:id/analytics - Get template analytics
router.get("/:id/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const templateId = parseInt(req.params.id);
    const { range = '30d' } = req.query;
    
    // Get template and verify ownership
    const template = await storage.getTemplate(templateId);
    if (!template || template.user_id !== userId) {
      return res.status(404).json({ message: "Template not found or access denied" });
    }
    
    // Get all purchases for this template
    const purchases = await storage.getTemplatePurchases(templateId);
    
    // Calculate metrics
    const totalRevenue = purchases.reduce((sum, p) => sum + parseFloat(p.seller_earnings || '0'), 0);
    const totalSales = purchases.length;
    const viewCount = template.view_count || 0;
    const conversionRate = viewCount > 0 ? ((totalSales / viewCount) * 100).toFixed(2) : 0;
    
    // Get template reviews for rating
    const reviews = await storage.getTemplateReviews(templateId);
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    // Calculate sales over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const salesByDay = new Map();
    purchases
      .filter(p => p.purchased_at && new Date(p.purchased_at) >= thirtyDaysAgo)
      .forEach(purchase => {
        if (!purchase.purchased_at) return;
        const date = new Date(purchase.purchased_at).toISOString().split('T')[0];
        if (!salesByDay.has(date)) {
          salesByDay.set(date, { sales: 0, revenue: 0 });
        }
        const dayData = salesByDay.get(date);
        dayData.sales += 1;
        dayData.revenue += parseFloat(purchase.seller_earnings || '0');
      });
    
    // Convert to array for chart
    const salesOverTime = Array.from(salesByDay.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        revenue: data.revenue
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Mock views data for now (would need view tracking implementation)
    const viewsOverTime = salesOverTime.map(item => ({
      date: item.date,
      views: Math.floor(Math.random() * 100) + 20
    }));
    
    // Mock traffic sources
    const topReferrers = [
      { source: 'Search', visits: Math.floor(viewCount * 0.35), percentage: 35 },
      { source: 'Direct', visits: Math.floor(viewCount * 0.25), percentage: 25 },
      { source: 'Social Media', visits: Math.floor(viewCount * 0.20), percentage: 20 },
      { source: 'Email', visits: Math.floor(viewCount * 0.15), percentage: 15 },
      { source: 'Other', visits: Math.floor(viewCount * 0.05), percentage: 5 }
    ];
    
    res.json({
      template: {
        id: template.id,
        title: template.title,
        price: template.price,
        salesCount: template.sales_count,
        viewCount: template.view_count,
        rating: avgRating,
        status: template.status
      },
      metrics: {
        totalRevenue: totalRevenue.toFixed(2),
        totalSales,
        totalViews: viewCount,
        conversionRate,
        avgRating: avgRating.toFixed(1),
        reviewCount: reviews.length
      },
      salesOverTime,
      viewsOverTime,
      topReferrers,
      recentPurchases: purchases.slice(0, 10).map(p => ({
        id: p.id,
        date: p.purchased_at,
        earnings: p.seller_earnings
      }))
    });
  } catch (error) {
    logger.error("Error fetching template analytics:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

export default router;
