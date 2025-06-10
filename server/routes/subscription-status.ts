import { Router, Request, Response } from 'express';
import { validateJWT } from '../middleware/jwtAuth';
import { getSubscriptionStatus, checkTripLimit, checkUserLimit } from '../middleware/subscription-limits';

const router = Router();

// Apply authentication to all subscription status routes
router.use(validateJWT);

// Get comprehensive subscription status for organization
router.get("/", async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization required' });
    }

    const status = await getSubscriptionStatus(req.user.organization_id);
    res.json(status);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

// Get specific limit checks
router.get("/limits/trips", async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization required' });
    }

    const limitCheck = await checkTripLimit(req.user.organization_id);
    res.json(limitCheck);
  } catch (error) {
    console.error("Error checking trip limits:", error);
    res.status(500).json({ error: "Failed to check trip limits" });
  }
});

router.get("/limits/users", async (req: Request, res: Response) => {
  try {
    if (!req.user?.organization_id) {
      return res.status(400).json({ error: 'Organization required' });
    }

    const limitCheck = await checkUserLimit(req.user.organization_id);
    res.json(limitCheck);
  } catch (error) {
    console.error("Error checking user limits:", error);
    res.status(500).json({ error: "Failed to check user limits" });
  }
});

export default router;