import type { Router } from '../../express-augmentations.js';
import { z } from 'zod';
import { validate } from '../utils/validation.js';
const router = Router();
// Test validation schema
const testSchema = z.object({
    body: z.object({
        name: z.string().min(3).max(50),
        email: z.string().email(),
        age: z.number().int().positive().optional(),
    }),
});
/**
 * @route GET /api/test/performance
 * @desc Test performance monitoring
 * @access Public
 */
router.get('/performance', (req, res) => {
    // Simulate some work
    const start = Date.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
        result += Math.random();
    }
    res.json({
        status: 'success',
        message: 'Performance test completed',
        result: result,
        duration: `${Date.now() - start}ms`,
        memory: process.memoryUsage(),
    });
});
/**
 * @route POST /api/test/validation
 * @desc Test request validation
 * @access Public
 */
router.post('/validation', validate(testSchema), (req, res) => {
    res.json({
        status: 'success',
        message: 'Validation passed',
        data: req.body,
    });
});
/**
 * @route GET /api/test/error
 * @desc Test error handling
 * @access Public
 */
router.get('/error', (req, res, next) => {
    // Simulate an error
    const err = new Error('This is a test error');
    (err as any).statusCode = 400;
    return next(err);
});
export default router;
