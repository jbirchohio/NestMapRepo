import { Router } from "express";
import { authenticate as validateJWT } from '../middleware/secureAuth';
import { organizationFundingService } from "../services/organizationFundingService";
import { z } from "zod";

const router = Router();

// Schema for creating connected account
const createAccountSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().default("company"),
  email: z.string().email(),
  country: z.string().default("US"),
  currency: z.string().default("usd"),
});

// Schema for funding source setup
const fundingSourceSchema = z.object({
  type: z.enum(["bank_account", "credit_line", "stripe_balance"]),
  bankAccount: z.object({
    accountNumber: z.string(),
    routingNumber: z.string(),
    accountHolderName: z.string(),
    accountType: z.enum(["checking", "savings"]),
  }).optional(),
  creditLine: z.object({
    requestedAmount: z.number().positive(),
    currency: z.string().default("usd"),
  }).optional(),
});

// Get organization funding status
router.get("/status", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const status = await organizationFundingService.getFundingSourceStatus(req.user.organization_id);
    res.json(status);
  } catch (error: any) {
    console.error("Get funding status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create Stripe Connect account for organization
router.post("/create-account", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const validatedData = createAccountSchema.parse(req.body);
    
    const account = await organizationFundingService.createConnectedAccount(
      req.user.organization_id,
      validatedData
    );

    res.json({
      success: true,
      accountId: account.id,
      message: "Stripe Connect account created successfully"
    });
  } catch (error: any) {
    console.error("Create account error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Generate onboarding link for Stripe Connect
router.post("/onboarding-link", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const { returnUrl, refreshUrl } = req.body;
    
    if (!returnUrl || !refreshUrl) {
      return res.status(400).json({ error: "returnUrl and refreshUrl are required" });
    }

    const link = await organizationFundingService.createOnboardingLink(
      req.user.organization_id,
      returnUrl,
      refreshUrl
    );

    res.json({
      success: true,
      onboardingUrl: link.url,
      expiresAt: link.expires_at
    });
  } catch (error: any) {
    console.error("Create onboarding link error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Check Stripe account readiness
router.get("/account-status", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const status = await organizationFundingService.checkAccountStatus(req.user.organization_id);
    res.json(status);
  } catch (error: any) {
    console.error("Check account status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup funding source
router.post("/setup-funding", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const validatedData = fundingSourceSchema.parse(req.body);
    
    const result = await organizationFundingService.setupFundingSource({
      organizationId: req.user.organization_id,
      ...validatedData
    });

    res.json({
      success: true,
      fundingSourceId: result.fundingSourceId,
      message: "Funding source configured successfully"
    });
  } catch (error: any) {
    console.error("Setup funding source error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add funds to organization account
router.post("/add-funds", validateJWT, async (req, res) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: "No organization found" });
    }

    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const result = await organizationFundingService.addFundsToOrganization(
      req.user.organization_id,
      amount
    );

    res.json({
      success: true,
      amount: result.amount,
      message: `$${amount} added to organization funding`
    });
  } catch (error: any) {
    console.error("Add organization funds error:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;

