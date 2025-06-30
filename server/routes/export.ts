import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateAndSanitizeRequest } from '../middleware/inputValidation.js';
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
import { exportTripToCSV, exportTripToICS } from '../utils/exporters.js';
import { getTripById } from '../services/tripService.js';
const router = Router();
router.use(validateJWT);
router.use(injectOrganizationContext);
router.use(validateOrganizationAccess);
const tripIdParamSchema = z.object({
    tripId: z.coerce.number().int().positive("Invalid Trip ID"),
});
// GET /api/export/trip/:tripId/csv
router.get('/trip/:tripId/csv', validateAndSanitizeRequest({ params: tripIdParamSchema }), async (req: Request, res: Response) => {
    try {
        const trip = await getTripById(req.params.tripId, req.user?.organizationId);
        if (!trip)
            return res.status(404).json({ error: 'Trip not found' });
        const csv = exportTripToCSV(trip);
        res.header('Content-Type', 'text/csv');
        res.attachment(`trip_${req.params.tripId}.csv`);
        res.send(csv);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to export trip as CSV' });
    }
});
// GET /api/export/trip/:tripId/ics
router.get('/trip/:tripId/ics', validateAndSanitizeRequest({ params: tripIdParamSchema }), async (req: Request, res: Response) => {
    try {
        const trip = await getTripById(req.params.tripId, req.user?.organizationId);
        if (!trip)
            return res.status(404).json({ error: 'Trip not found' });
        const ics = exportTripToICS(trip);
        res.header('Content-Type', 'text/calendar');
        res.attachment(`trip_${req.params.tripId}.ics`);
        res.send(ics);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to export trip as calendar' });
    }
});
export default router;
