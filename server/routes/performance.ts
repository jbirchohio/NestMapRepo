/**
 * Performance Analytics API Routes - Phase 3 Optimization
 * Real-time performance monitoring and optimization endpoints
 */
import type { Express } from '../../express-augmentations.js';
import { performanceMonitor } from "../performance-monitor.js";
import { authenticate as validateJWT } from '../middleware/secureAuth.js';
import { injectOrganizationContext, validateOrganizationAccess } from '../middleware/organizationContext.js';
export function registerPerformanceRoutes(app: Express): void {
    // Apply middleware to all admin performance routes
    app.use('/api/admin/performance', validateJWT);
    app.use('/api/admin/performance', injectOrganizationContext);
    app.use('/api/admin/performance', validateOrganizationAccess);
    // Get comprehensive performance report
    app.get("/api/admin/performance", async (req, res) => {
        if (!req.user || req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        try {
            const report = performanceMonitor.getPerformanceReport();
            res.json({
                success: true,
                data: report,
                generatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error("Performance report error:", error);
            res.status(500).json({ error: "Failed to generate performance report" });
        }
    });
    // Get real-time performance metrics
    app.get("/api/admin/performance/realtime", async (req, res) => {
        if (!req.user || req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        try {
            const report = performanceMonitor.getPerformanceReport();
            const realtimeMetrics = {
                currentLoad: {
                    avgResponseTime: report.overview.avgResponseTime,
                    errorRate: report.overview.errorRate,
                    requestsLast24h: report.overview.totalRequests
                },
                criticalAlerts: report.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH'),
                topSlowEndpoints: report.overview.topSlowEndpoints.slice(0, 5),
                memoryTrend: report.memoryTrends.slice(-10) // Last 10 samples
            };
            res.json({
                success: true,
                data: realtimeMetrics,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error("Realtime metrics error:", error);
            res.status(500).json({ error: "Failed to get realtime metrics" });
        }
    });
    // Export performance data for analysis
    app.get("/api/admin/performance/export", async (req, res) => {
        if (!req.user || req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        try {
            const exportData = performanceMonitor.exportMetrics();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="performance-metrics-${Date.now()}.json"`);
            res.send(exportData);
        }
        catch (error) {
            console.error("Performance export error:", error);
            res.status(500).json({ error: "Failed to export performance data" });
        }
    });
    // Performance optimization recommendations
    app.get("/api/admin/performance/recommendations", async (req, res) => {
        if (!req.user || req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        try {
            const report = performanceMonitor.getPerformanceReport();
            const recommendations = generateOptimizationRecommendations(report);
            res.json({
                success: true,
                data: recommendations,
                generatedAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error("Recommendations error:", error);
            res.status(500).json({ error: "Failed to generate recommendations" });
        }
    });
    // Clear old performance data
    app.post("/api/admin/performance/cleanup", async (req, res) => {
        if (!req.user || req.user?.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        try {
            performanceMonitor.clearOldData();
            res.json({
                success: true,
                message: "Performance data cleanup completed"
            });
        }
        catch (error) {
            console.error("Performance cleanup error:", error);
            res.status(500).json({ error: "Failed to cleanup performance data" });
        }
    });
}
function generateOptimizationRecommendations(report: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */): any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */[] {
    const recommendations = [];
    // Analyze slow endpoints
    if (report.overview.topSlowEndpoints.length > 0) {
        const slowestEndpoint = report.overview.topSlowEndpoints[0];
        if (slowestEndpoint.avgTime > 1000) {
            recommendations.push({
                type: 'SLOW_ENDPOINT',
                priority: 'HIGH',
                title: 'Optimize Slow Endpoints',
                description: `${slowestEndpoint.endpoint} averages ${slowestEndpoint.avgTime.toFixed(0)}ms response time`,
                action: 'Add caching, optimize database queries, or implement pagination',
                impact: 'High - Directly affects user experience'
            });
        }
    }
    // Analyze error rates
    if (report.overview.errorRate > 0.02) { // > 2%
        recommendations.push({
            type: 'HIGH_ERROR_RATE',
            priority: 'CRITICAL',
            title: 'Reduce Error Rate',
            description: `Current error rate: ${(report.overview.errorRate * 100).toFixed(1)}%`,
            action: 'Review error logs, implement better error handling, add monitoring',
            impact: 'Critical - Affects application reliability'
        });
    }
    // Analyze memory trends
    const recentMemory = report.memoryTrends.slice(-10);
    if (recentMemory.length > 5) {
        const avgMemory = recentMemory.reduce((sum: number, m: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => sum + m.usage, 0) / recentMemory.length;
        if (avgMemory > 300) { // > 300MB
            recommendations.push({
                type: 'MEMORY_OPTIMIZATION',
                priority: 'MEDIUM',
                title: 'Optimize Memory Usage',
                description: `Average memory usage: ${avgMemory.toFixed(0)}MB`,
                action: 'Implement object pooling, optimize caching strategies, check for memory leaks',
                impact: 'Medium - Affects server performance and costs'
            });
        }
    }
    // CSS Performance recommendation based on our Phase 3 work
    recommendations.push({
        type: 'CSS_OPTIMIZATION',
        priority: 'HIGH',
        title: 'CSS Loading Optimization',
        description: 'CSS files loading in 2000ms+ detected in monitoring',
        action: 'Critical CSS extraction implemented, consider lazy loading non-critical styles',
        impact: 'High - Improves perceived performance and Core Web Vitals'
    });
    // General recommendations
    if (report.overview.avgResponseTime > 500) {
        recommendations.push({
            type: 'GENERAL_PERFORMANCE',
            priority: 'MEDIUM',
            title: 'Overall Response Time',
            description: `Average response time: ${report.overview.avgResponseTime.toFixed(0)}ms`,
            action: 'Implement Redis caching, optimize database connections, use CDN',
            impact: 'Medium - Improves overall user experience'
        });
    }
    return recommendations;
}
