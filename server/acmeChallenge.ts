import type { Request as ExpressRequest, Response } from './express-augmentations.js';

interface ACMEChallenge {
    token: string;
    keyAuthorization: string;
    domain: string;
    expiresAt: Date;
}
// In-memory storage for ACME challenges (in production, use Redis)
const challengeStore = new Map<string, ACMEChallenge>();
/**
 * Store ACME challenge for domain verification
 */
export function storeACMEChallenge(domain: string, token: string, keyAuthorization: string, ttlMinutes: number = 60): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
    challengeStore.set(token, {
        token,
        keyAuthorization,
        domain,
        expiresAt
    });
    console.log(`ACME challenge stored for ${domain}: ${token}`);
    // Clean up expired challenges
    setTimeout(() => {
        challengeStore.delete(token);
        console.log(`ACME challenge expired for ${domain}: ${token}`);
    }, ttlMinutes * 60 * 1000);
}
/**
 * Serve ACME challenge response
 */
type ServeRequest = ExpressRequest<{
    token: string;
}>;
export async function serveACMEChallenge(req: ServeRequest, res: Response): Promise<void> {
    try {
        const { token } = req.params;
        const host = req.get('host');
        if (!token || !host) {
            res.status(400).send('Invalid request');
            return;
        }
        // Look up challenge
        const challenge = challengeStore.get(token);
        if (!challenge) {
            console.log(`ACME challenge not found for token: ${token}`);
            res.status(404).send('Challenge not found');
            return;
        }
        // Check if challenge has expired
        if (new Date() > challenge.expiresAt) {
            challengeStore.delete(token);
            console.log(`ACME challenge expired for token: ${token}`);
            res.status(404).send('Challenge expired');
            return;
        }
        // Verify domain matches
        if (challenge.domain !== host) {
            console.log(`ACME challenge domain mismatch: expected ${challenge.domain}, got ${host}`);
            res.status(400).send('Domain mismatch');
            return;
        }
        // Serve the key authorization
        console.log(`Serving ACME challenge for ${host}: ${token}`);
        res.type('text/plain').send(challenge.keyAuthorization);
    }
    catch (error) {
        console.error('Error serving ACME challenge:', error);
        res.status(500).send('Internal server error');
    }
}
/**
 * Validate ACME challenge by making HTTP request
 */
export async function validateACMEChallenge(domain: string, token: string, expectedKeyAuthorization: string): Promise<boolean> {
    try {
        const challengeUrl = `http://${domain}/.well-known/acme-challenge/${token}`;
        console.log(`Validating ACME challenge: ${challengeUrl}`);
        const response = await fetch(challengeUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'NestMap-ACME-Client/1.0'
            }
        });
        if (!response.ok) {
            console.log(`ACME challenge validation failed: ${response.status} ${response.statusText}`);
            return false;
        }
        const responseText = await response.text();
        const isValid = responseText.trim() === expectedKeyAuthorization.trim();
        // ACME challenge validation completed
        if (!isValid) {
            console.log(`Expected: ${expectedKeyAuthorization}`);
            console.log(`Received: ${responseText}`);
        }
        return isValid;
    }
    catch (error) {
        console.error('ACME challenge validation error:', error);
        return false;
    }
}
/**
 * Clean up expired challenges
 */
export function cleanupExpiredChallenges(): void {
    const now = new Date();
    let cleanedCount = 0;
    for (const [token, challenge] of Array.from(challengeStore.entries())) {
        if (now > challenge.expiresAt) {
            challengeStore.delete(token);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired ACME challenges`);
    }
}
/**
 * Get challenge statistics
 */
export function getChallengeStats(): {
    totalChallenges: number;
    activeChallenges: number;
    expiredChallenges: number;
    challengesByDomain: {
        [domain: string]: number;
    };
} {
    const now = new Date();
    let activeChallenges = 0;
    let expiredChallenges = 0;
    const challengesByDomain: {
        [domain: string]: number;
    } = {};
    for (const challenge of Array.from(challengeStore.values())) {
        if (now > challenge.expiresAt) {
            expiredChallenges++;
        }
        else {
            activeChallenges++;
        }
        challengesByDomain[challenge.domain] = (challengesByDomain[challenge.domain] || 0) + 1;
    }
    return {
        totalChallenges: challengeStore.size,
        activeChallenges,
        expiredChallenges,
        challengesByDomain
    };
}
/**
 * Enhanced ACME challenge callback for SSL Manager
 */
export function createACMEValidationCallback(domain: string) {
    return async (token: string, keyAuthorization: string): Promise<boolean> => {
        try {
            // Store challenge for serving
            storeACMEChallenge(domain, token, keyAuthorization, 60);
            // Wait for challenge to be available
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Validate the challenge is accessible
            const isValid = await validateACMEChallenge(domain, token, keyAuthorization);
            if (isValid) {
                console.log(`ACME challenge validation successful for ${domain}`);
                return true;
            }
            else {
                console.log(`ACME challenge validation failed for ${domain}`);
                return false;
            }
        }
        catch (error) {
            console.error(`ACME challenge error for ${domain}:`, error);
            return false;
        }
    };
}
// Start cleanup interval (run every 5 minutes)
setInterval(cleanupExpiredChallenges, 5 * 60 * 1000);
