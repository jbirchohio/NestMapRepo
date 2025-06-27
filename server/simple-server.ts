import express from '../../express-augmentations.ts';
import http from 'http';
import { authenticate } from './middleware/secureAuth.js';
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Server running with SecureAuth as JWT source of truth'
    });
});
// Test route
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API working',
        timestamp: new Date().toISOString()
    });
});
// Protected route using SecureAuth
app.get('/api/auth/me', authenticate, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: 'Authenticated via SecureAuth'
    });
});
// Error handling
app.use((err: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, req: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, res: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, next: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
const server = http.createServer(app);
server.listen(Number(PORT), HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log('Using SecureAuth as JWT authentication source of truth');
});
export default app;
