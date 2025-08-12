import { Router, Request, Response } from "express";
import { eq, and, or, inArray } from "drizzle-orm";
import { db } from "../db-connection";
import { 
  templateBundles, 
  bundlePurchases, 
  templates, 
  users,
  templatePurchases 
} from "@shared/schema";
import { requireAuth, optionalAuth } from "../middleware/jwtAuth";
import { generateSlug } from "../utils/slug";

const router = Router();

// Get all published bundles (public)
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { type, featured, creator_id } = req.query;
    
    // Build conditions
    const conditions = [eq(templateBundles.status, "published")];

    // Filter by type if specified
    if (type) {
      conditions.push(eq(templateBundles.type, type as string));
    }

    // Filter by featured if specified
    if (featured === "true") {
      conditions.push(eq(templateBundles.featured, true));
    }

    // Filter by creator if specified
    if (creator_id) {
      conditions.push(eq(templateBundles.creator_id, parseInt(creator_id as string)));
    }

    const bundles = await db
      .select()
      .from(templateBundles)
      .where(and(...conditions));

    // Fetch template details for each bundle
    const bundlesWithTemplates = await Promise.all(
      bundles.map(async (bundle) => {
        const bundleTemplates = await db
          .select()
          .from(templates)
          .where(inArray(templates.id, bundle.template_ids as number[]));

        return {
          ...bundle,
          templates: bundleTemplates,
          savings: parseFloat(bundle.original_price) - parseFloat(bundle.bundle_price)
        };
      })
    );

    res.json(bundlesWithTemplates);
  } catch (error) {
    console.error("Error fetching bundles:", error);
    res.status(500).json({ error: "Failed to fetch bundles" });
  }
});

// Get single bundle details (public)
router.get("/:slug", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [bundle] = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.slug, slug));

    if (!bundle) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    // Increment view count
    await db
      .update(templateBundles)
      .set({ view_count: (bundle.view_count || 0) + 1 })
      .where(eq(templateBundles.id, bundle.id));

    // Fetch template details
    const bundleTemplates = await db
      .select()
      .from(templates)
      .where(inArray(templates.id, bundle.template_ids as number[]));

    // Check if user has purchased this bundle
    let hasPurchased = false;
    if (req.user) {
      const [purchase] = await db
        .select()
        .from(bundlePurchases)
        .where(
          and(
            eq(bundlePurchases.bundle_id, bundle.id),
            eq(bundlePurchases.buyer_id, req.user.id),
            eq(bundlePurchases.status, "completed")
          )
        );
      hasPurchased = !!purchase;
    }

    res.json({
      ...bundle,
      templates: bundleTemplates,
      savings: parseFloat(bundle.original_price) - parseFloat(bundle.bundle_price),
      hasPurchased
    });
  } catch (error) {
    console.error("Error fetching bundle:", error);
    res.status(500).json({ error: "Failed to fetch bundle" });
  }
});

// Create a new bundle (creators and admin)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { 
      title, 
      description, 
      template_ids, 
      bundle_price,
      cover_image,
      tags,
      type = "creator",
      valid_from,
      valid_until,
      max_sales
    } = req.body;

    // Validate templates exist and belong to creator (or admin creating Remvana bundle)
    const selectedTemplates = await db
      .select()
      .from(templates)
      .where(inArray(templates.id, template_ids));

    if (selectedTemplates.length !== template_ids.length) {
      return res.status(400).json({ error: "Some templates not found" });
    }

    // Check if user is admin (can create bundles from any Remvana/seed templates)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const isAdmin = user?.role === 'admin' || false;
    const isRemvanaBundle = isAdmin && type === "admin";

    // For non-admin users, verify they own all templates
    if (!isAdmin) {
      const ownsAllTemplates = selectedTemplates.every(t => t.user_id === userId);
      if (!ownsAllTemplates) {
        return res.status(403).json({ error: "You can only bundle your own templates" });
      }
    } else if (isRemvanaBundle) {
      // For admin creating Remvana bundles, verify templates are from Remvana/seed accounts
      const remvanaUserIds = [1, 2, 3]; // Adjust based on your seed user IDs
      const allRemvanaTemplates = selectedTemplates.every(t => 
        remvanaUserIds.includes(t.user_id) || t.ai_generated
      );
      if (!allRemvanaTemplates) {
        return res.status(403).json({ 
          error: "Remvana bundles can only include Remvana-created templates" 
        });
      }
    }

    // Calculate original price
    const originalPrice = selectedTemplates.reduce((sum, t) => 
      sum + parseFloat(t.price || '0'), 0
    );

    // Calculate discount percentage
    const discountPercentage = ((originalPrice - bundle_price) / originalPrice) * 100;

    // Generate slug
    const slug = generateSlug(title);

    // Create bundle
    const [newBundle] = await db
      .insert(templateBundles)
      .values({
        title,
        slug,
        description,
        creator_id: userId,
        template_ids,
        bundle_price: bundle_price.toString(),
        original_price: originalPrice.toString(),
        discount_percentage: discountPercentage.toString(),
        type: isRemvanaBundle ? "admin" : type,
        tags: tags || [],
        cover_image,
        status: "draft",
        is_remvana_bundle: isRemvanaBundle,
        valid_from: valid_from ? new Date(valid_from) : null,
        valid_until: valid_until ? new Date(valid_until) : null,
        max_sales
      })
      .returning();

    res.json(newBundle);
  } catch (error) {
    console.error("Error creating bundle:", error);
    res.status(500).json({ error: "Failed to create bundle" });
  }
});

// Update bundle (creator/admin only)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bundleId = parseInt(req.params.id);

    // Check ownership
    const [bundle] = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.id, bundleId));

    if (!bundle) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    // Check if user is admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const isAdmin = user?.role === 'admin' || false;

    if (bundle.creator_id !== userId && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updates = req.body;
    
    // If template_ids changed, recalculate prices
    if (updates.template_ids) {
      const selectedTemplates = await db
        .select()
        .from(templates)
        .where(inArray(templates.id, updates.template_ids));

      updates.original_price = selectedTemplates
        .reduce((sum, t) => sum + parseFloat(t.price || '0'), 0)
        .toString();

      if (updates.bundle_price) {
        updates.discount_percentage = (
          ((parseFloat(updates.original_price) - updates.bundle_price) / 
          parseFloat(updates.original_price)) * 100
        ).toString();
      }
    }

    const [updatedBundle] = await db
      .update(templateBundles)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(templateBundles.id, bundleId))
      .returning();

    res.json(updatedBundle);
  } catch (error) {
    console.error("Error updating bundle:", error);
    res.status(500).json({ error: "Failed to update bundle" });
  }
});

// Publish/unpublish bundle
router.post("/:id/publish", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bundleId = parseInt(req.params.id);
    const { status } = req.body; // "published" or "draft"

    // Check ownership
    const [bundle] = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.id, bundleId));

    if (!bundle) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    // Check if user is admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const isAdmin = user?.role === 'admin' || false;

    if (bundle.creator_id !== userId && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const [updatedBundle] = await db
      .update(templateBundles)
      .set({ 
        status,
        updated_at: new Date()
      })
      .where(eq(templateBundles.id, bundleId))
      .returning();

    res.json(updatedBundle);
  } catch (error) {
    console.error("Error publishing bundle:", error);
    res.status(500).json({ error: "Failed to publish bundle" });
  }
});

// Get creator's bundles
router.get("/creator/:userId", optionalAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = parseInt(req.params.userId);

    const bundles = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.creator_id, creatorId));

    // Fetch template details for each bundle
    const bundlesWithTemplates = await Promise.all(
      bundles.map(async (bundle) => {
        const bundleTemplates = await db
          .select()
          .from(templates)
          .where(inArray(templates.id, bundle.template_ids as number[]));

        return {
          ...bundle,
          templates: bundleTemplates,
          savings: parseFloat(bundle.original_price) - parseFloat(bundle.bundle_price)
        };
      })
    );

    res.json(bundlesWithTemplates);
  } catch (error) {
    console.error("Error fetching creator bundles:", error);
    res.status(500).json({ error: "Failed to fetch bundles" });
  }
});

// Purchase a bundle
router.post("/:id/purchase", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bundleId = parseInt(req.params.id);
    const { payment_intent_id } = req.body;

    // Get bundle details
    const [bundle] = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.id, bundleId));

    if (!bundle) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    if (bundle.status !== "published") {
      return res.status(400).json({ error: "Bundle is not available for purchase" });
    }

    // Check if already purchased
    const [existingPurchase] = await db
      .select()
      .from(bundlePurchases)
      .where(
        and(
          eq(bundlePurchases.bundle_id, bundleId),
          eq(bundlePurchases.buyer_id, userId),
          eq(bundlePurchases.status, "completed")
        )
      );

    if (existingPurchase) {
      return res.status(400).json({ error: "Bundle already purchased" });
    }

    // Check max sales limit
    if (bundle.max_sales && bundle.sales_count !== null && bundle.sales_count >= bundle.max_sales) {
      return res.status(400).json({ error: "Bundle is sold out" });
    }

    // Check validity dates
    const now = new Date();
    if (bundle.valid_from && now < bundle.valid_from) {
      return res.status(400).json({ error: "Bundle is not yet available" });
    }
    if (bundle.valid_until && now > bundle.valid_until) {
      return res.status(400).json({ error: "Bundle offer has expired" });
    }

    // Calculate fees (30% platform fee)
    const purchasePrice = parseFloat(bundle.bundle_price);
    const platformFee = purchasePrice * 0.3;
    const creatorEarnings = purchasePrice * 0.7;
    const stripeFee = purchasePrice * 0.029 + 0.30; // Stripe fees

    // Create purchase record
    const [purchase] = await db
      .insert(bundlePurchases)
      .values({
        bundle_id: bundleId,
        buyer_id: userId,
        purchase_price: purchasePrice.toString(),
        platform_fee: platformFee.toString(),
        creator_earnings: creatorEarnings.toString(),
        stripe_fee: stripeFee.toString(),
        payment_intent_id,
        status: "completed",
        purchased_template_ids: bundle.template_ids
      })
      .returning();

    // Update bundle sales count
    await db
      .update(templateBundles)
      .set({ 
        sales_count: (bundle.sales_count || 0) + 1,
        updated_at: new Date()
      })
      .where(eq(templateBundles.id, bundleId));

    // Also create individual template purchase records for access
    for (const templateId of bundle.template_ids as number[]) {
      // Get the template to find the seller
      const [template] = await db
        .select()
        .from(templates)
        .where(eq(templates.id, templateId));
      
      if (template) {
        await db
          .insert(templatePurchases)
          .values({
            template_id: templateId,
            buyer_id: userId,
            seller_id: template.user_id,
            price: "0", // Part of bundle
            platform_fee: "0",
            seller_earnings: "0",
            status: "completed",
            bundle_purchase_id: purchase.id
          });
      }
    }

    res.json({
      success: true,
      purchase,
      message: "Bundle purchased successfully"
    });
  } catch (error) {
    console.error("Error purchasing bundle:", error);
    res.status(500).json({ error: "Failed to purchase bundle" });
  }
});

// Delete bundle (creator/admin only)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const bundleId = parseInt(req.params.id);

    // Check ownership
    const [bundle] = await db
      .select()
      .from(templateBundles)
      .where(eq(templateBundles.id, bundleId));

    if (!bundle) {
      return res.status(404).json({ error: "Bundle not found" });
    }

    // Check if user is admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const isAdmin = user?.role === 'admin' || false;

    if (bundle.creator_id !== userId && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Don't delete if there are purchases
    const [purchase] = await db
      .select()
      .from(bundlePurchases)
      .where(eq(bundlePurchases.bundle_id, bundleId));

    if (purchase) {
      // Archive instead of delete
      await db
        .update(templateBundles)
        .set({ 
          status: "archived",
          updated_at: new Date()
        })
        .where(eq(templateBundles.id, bundleId));

      return res.json({ message: "Bundle archived (has purchases)" });
    }

    // Delete bundle
    await db
      .delete(templateBundles)
      .where(eq(templateBundles.id, bundleId));

    res.json({ message: "Bundle deleted successfully" });
  } catch (error) {
    console.error("Error deleting bundle:", error);
    res.status(500).json({ error: "Failed to delete bundle" });
  }
});

export default router;