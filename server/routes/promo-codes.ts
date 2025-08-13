import { Router } from 'express';
import { requireAuth } from '../middleware/jwtAuth';
import { db } from '../db-connection';
import { promoCodes, promoCodeUses, templatePurchases, users } from '@shared/schema';
import { eq, and, gte, lte, sql, desc, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe if API key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

// Schema for creating promo codes
const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).transform(s => s.toUpperCase()),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_amount: z.number().positive(),
  minimum_purchase: z.number().min(0).optional(),
  max_uses: z.number().positive().optional(),
  max_uses_per_user: z.number().positive().default(1),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  template_id: z.number().optional(),
  creator_id: z.number().optional(),
});

// POST /api/promo-codes - Create new promo code (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    // Check if user is admin
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validatedData = createPromoCodeSchema.parse(req.body);

    // Create Stripe coupon if Stripe is configured
    let stripeCouponId: string | null = null;
    if (stripe) {
      try {
        const couponParams: Stripe.CouponCreateParams = {
          duration: 'once',
          id: validatedData.code,
          name: validatedData.code,
        };

        if (validatedData.discount_type === 'percentage') {
          couponParams.percent_off = validatedData.discount_amount;
        } else {
          couponParams.amount_off = Math.round(validatedData.discount_amount * 100); // Convert to cents
          couponParams.currency = 'usd';
        }

        const stripeCoupon = await stripe.coupons.create(couponParams);
        stripeCouponId = stripeCoupon.id;
      } catch (error) {
        console.error('Failed to create Stripe coupon:', error);
        // Continue without Stripe integration
      }
    }

    // Create promo code in database
    const [promoCode] = await db.insert(promoCodes).values({
      code: validatedData.code,
      stripe_coupon_id: stripeCouponId,
      description: validatedData.description,
      discount_type: validatedData.discount_type,
      discount_amount: validatedData.discount_amount.toString(),
      minimum_purchase: validatedData.minimum_purchase?.toString(),
      max_uses: validatedData.max_uses,
      max_uses_per_user: validatedData.max_uses_per_user,
      valid_from: validatedData.valid_from ? new Date(validatedData.valid_from) : new Date(),
      valid_until: validatedData.valid_until ? new Date(validatedData.valid_until) : undefined,
      template_id: validatedData.template_id,
      creator_id: validatedData.creator_id,
      created_by: req.user!.id,
    }).returning();

    res.status(201).json(promoCode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error creating promo code:', error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// GET /api/promo-codes - List all promo codes (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    // Check if user is admin
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const codes = await db.select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.created_at));

    // Add usage stats for each code
    const codesWithStats = await Promise.all(codes.map(async (code) => {
      const uses = await db.select({ count: sql`count(*)::int` })
        .from(promoCodeUses)
        .where(eq(promoCodeUses.promo_code_id, code.id));

      return {
        ...code,
        times_used: uses[0]?.count || 0,
        is_expired: code.valid_until ? new Date(code.valid_until) < new Date() : false,
        is_maxed_out: code.max_uses ? (uses[0]?.count || 0) >= code.max_uses : false,
      };
    }));

    res.json(codesWithStats);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

// POST /api/promo-codes/validate - Validate a promo code for a user
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { code, template_id, amount } = req.body;
    const userId = req.user!.id;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Find the promo code
    const [promoCode] = await db.select()
      .from(promoCodes)
      .where(and(
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.is_active, true)
      ))
      .limit(1);

    if (!promoCode) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    // Check if code is expired
    const now = new Date();
    if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
      return res.status(400).json({ error: 'This promo code has expired' });
    }

    // Check if code has started
    if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
      return res.status(400).json({ error: 'This promo code is not yet active' });
    }

    // Check max uses
    if (promoCode.max_uses) {
      const [totalUses] = await db.select({ count: sql`count(*)::int` })
        .from(promoCodeUses)
        .where(eq(promoCodeUses.promo_code_id, promoCode.id));

      if ((totalUses.count || 0) >= promoCode.max_uses) {
        return res.status(400).json({ error: 'This promo code has reached its usage limit' });
      }
    }

    // Check user's usage
    const [userUses] = await db.select({ count: sql`count(*)::int` })
      .from(promoCodeUses)
      .where(and(
        eq(promoCodeUses.promo_code_id, promoCode.id),
        eq(promoCodeUses.user_id, userId)
      ));

    if ((userUses.count || 0) >= (promoCode.max_uses_per_user || 1)) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    // Check minimum purchase requirement
    if (promoCode.minimum_purchase && amount < parseFloat(promoCode.minimum_purchase)) {
      return res.status(400).json({ 
        error: `Minimum purchase of $${promoCode.minimum_purchase} required for this code` 
      });
    }

    // Check if code is for specific template
    if (promoCode.template_id && promoCode.template_id !== template_id) {
      return res.status(400).json({ error: 'This promo code is not valid for this template' });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discount_type === 'percentage') {
      discountAmount = (amount * parseFloat(promoCode.discount_amount)) / 100;
    } else {
      discountAmount = Math.min(parseFloat(promoCode.discount_amount), amount);
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    res.json({
      valid: true,
      promo_code_id: promoCode.id,
      code: promoCode.code,
      description: promoCode.description,
      discount_type: promoCode.discount_type,
      discount_amount: parseFloat(promoCode.discount_amount),
      discount_applied: discountAmount,
      original_amount: amount,
      final_amount: finalAmount,
      stripe_coupon_id: promoCode.stripe_coupon_id,
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

// POST /api/promo-codes/apply - Apply promo code to a purchase
router.post('/apply', requireAuth, async (req, res) => {
  try {
    const { promo_code_id, template_purchase_id, discount_applied } = req.body;
    const userId = req.user!.id;

    // Verify the purchase belongs to the user
    const [purchase] = await db.select()
      .from(templatePurchases)
      .where(and(
        eq(templatePurchases.id, template_purchase_id),
        eq(templatePurchases.buyer_id, userId)
      ))
      .limit(1);

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Record the promo code usage
    const [usage] = await db.insert(promoCodeUses).values({
      promo_code_id,
      user_id: userId,
      template_purchase_id,
      discount_applied: discount_applied.toString(),
    }).returning();

    // Increment used count on promo code
    await db.update(promoCodes)
      .set({ used_count: sql`${promoCodes.used_count} + 1` })
      .where(eq(promoCodes.id, promo_code_id));

    res.json({
      success: true,
      usage_id: usage.id,
    });
  } catch (error) {
    console.error('Error applying promo code:', error);
    res.status(500).json({ error: 'Failed to apply promo code' });
  }
});

// PUT /api/promo-codes/:id - Update promo code (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    // Check if user is admin
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const promoCodeId = parseInt(req.params.id);
    const updates = req.body;

    // Update promo code
    const [updated] = await db.update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, promoCodeId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

// DELETE /api/promo-codes/:id - Delete/deactivate promo code (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    // Check if user is admin
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const promoCodeId = parseInt(req.params.id);

    // Soft delete by deactivating
    const [updated] = await db.update(promoCodes)
      .set({ is_active: false })
      .where(eq(promoCodes.id, promoCodeId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    // Also delete from Stripe if integrated
    if (stripe && updated.stripe_coupon_id) {
      try {
        await stripe.coupons.del(updated.stripe_coupon_id);
      } catch (error) {
        console.error('Failed to delete Stripe coupon:', error);
      }
    }

    res.json({ success: true, message: 'Promo code deactivated' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

// GET /api/promo-codes/stats - Get promo code statistics (admin only)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    // Check if user is admin
    if (!user[0] || user[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get overall stats
    const [totalCodes] = await db.select({ count: sql`count(*)::int` })
      .from(promoCodes);

    const [activeCodes] = await db.select({ count: sql`count(*)::int` })
      .from(promoCodes)
      .where(and(
        eq(promoCodes.is_active, true),
        or(
          isNull(promoCodes.valid_until),
          gte(promoCodes.valid_until, new Date())
        )
      ));

    const [totalUses] = await db.select({ 
      count: sql`count(*)::int`,
      total_discount: sql`COALESCE(SUM(discount_applied), 0)::decimal`
    })
      .from(promoCodeUses);

    // Get top performing codes
    const topCodes = await db.select({
      code: promoCodes.code,
      description: promoCodes.description,
      uses: sql`count(${promoCodeUses.id})::int`,
      total_discount: sql`COALESCE(SUM(${promoCodeUses.discount_applied}), 0)::decimal`
    })
      .from(promoCodes)
      .leftJoin(promoCodeUses, eq(promoCodeUses.promo_code_id, promoCodes.id))
      .groupBy(promoCodes.id, promoCodes.code, promoCodes.description)
      .orderBy(desc(sql`count(${promoCodeUses.id})`))
      .limit(10);

    res.json({
      total_codes: totalCodes.count || 0,
      active_codes: activeCodes.count || 0,
      total_uses: totalUses.count || 0,
      total_discount_given: parseFloat(totalUses.total_discount || '0'),
      top_performing_codes: topCodes,
    });
  } catch (error) {
    console.error('Error fetching promo code stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;