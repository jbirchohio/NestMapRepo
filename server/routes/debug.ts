import express, { Request, Response } from 'express';

const router = express.Router();

// Debug endpoint to check auth context
router.get('/whoami', (req: Request, res: Response) => {
  console.log('🔍 Debug whoami:', {
    hasUser: !!req.user,
    user: req.user,
    headers: req.headers.authorization ? 'Bearer token present' : 'No auth header'
  });
  
  res.json({
    authenticated: !!req.user,
    user: req.user || null,
    timestamp: new Date().toISOString()
  });
});

export default router;