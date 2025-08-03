import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface SSLCertificate {
  domain: string;
  privateKey: string;
  certificate: string;
  chainCertificate: string;
  expiresAt: Date;
  issuer: string;
}

export interface ACMEAccount {
  privateKey: string;
  publicKey: string;
  accountUrl: string;
}

/**
 * Let's Encrypt ACME v2 client for SSL certificate management
 */
export class SSLManager {
  private readonly acmeDirectoryUrl = 'https://acme-v02.api.letsencrypt.org/directory';
  private readonly stagingDirectoryUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';
  private readonly isProduction: boolean;

  constructor(isProduction = false) {
    this.isProduction = isProduction;
  }

  /**
   * Generate RSA key pair for ACME account
   */
  private generateKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { privateKey, publicKey };
  }

  /**
   * Create ACME account with Let's Encrypt
   */
  async createAccount(email: string): Promise<ACMEAccount> {
    const keyPair = this.generateKeyPair();
    const directoryUrl = this.isProduction ? this.acmeDirectoryUrl : this.stagingDirectoryUrl;

    try {
      // Get ACME directory
      const directoryResponse = await fetch(directoryUrl);
      const directory = await directoryResponse.json();

      // Create account payload
      const accountPayload = {
        termsOfServiceAgreed: true,
        contact: [`mailto:${email}`],
      };

      // Sign and send account creation request
      const accountUrl = await this.sendACMERequest(
        directory.newAccount,
        accountPayload,
        keyPair.privateKey
      );

      return {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        accountUrl: typeof accountUrl === 'string' ? accountUrl : await accountUrl.text(),
      };
    } catch (error) {
      throw new Error(`Failed to create ACME account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from ACME response
   */
  private async extractTextFromResponse(response: Response | string): Promise<string> {
    if (typeof response === 'string') {
      return response;
    }
    try {
      return await response.text();
    } catch (error) {
      throw new Error('Failed to extract text from ACME response');
    }
  }

  /**
   * Request SSL certificate for domain
   */
  async requestCertificate(
    domain: string,
    account: ACMEAccount,
    validationCallback: (token: string, keyAuthorization: string) => Promise<boolean>
  ): Promise<SSLCertificate> {
    const directoryUrl = this.isProduction ? this.acmeDirectoryUrl : this.stagingDirectoryUrl;

    try {
      // Get ACME directory
      const directoryResponse = await fetch(directoryUrl);
      const directory = await directoryResponse.json();

      // Create new order
      const orderPayload = {
        identifiers: [{ type: 'dns', value: domain }],
      };

      const orderUrl = await this.sendACMERequest(
        directory.newOrder,
        orderPayload,
        account.privateKey
      );

      // Get order details
      const orderResponse = await this.sendACMERequest(
        typeof orderUrl === 'string' ? orderUrl : await orderUrl.text(),
        '',
        account.privateKey
      );
      const order = await orderResponse.json();

      // Process authorizations
      for (const authUrl of order.authorizations) {
        await this.processAuthorization(authUrl, account, validationCallback);
      }

      // Generate certificate key pair
      const certKeyPair = this.generateKeyPair();

      // Create CSR (Certificate Signing Request)
      const csr = await this.generateCSR(domain, certKeyPair.privateKey);

      // Finalize order
      const finalizePayload = { csr };
      await this.sendACMERequest(order.finalize, finalizePayload, account.privateKey);

      // Download certificate
      const certificateResponse = await this.sendACMERequest(
        order.certificate,
        '',
        account.privateKey
      );
      const certificateData = await certificateResponse.text();

      // Parse certificate chain
      const certificates = this.parseCertificateChain(certificateData);

      return {
        domain,
        privateKey: certKeyPair.privateKey,
        certificate: certificates.certificate,
        chainCertificate: certificates.chain,
        expiresAt: this.extractExpirationDate(certificates.certificate),
        issuer: "Let's Encrypt",
      };
    } catch (error) {
      throw new Error(`Failed to request certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process ACME authorization challenge
   */
  private async processAuthorization(
    authUrl: string,
    account: ACMEAccount,
    validationCallback: (token: string, keyAuthorization: string) => Promise<boolean>
  ): Promise<void> {
    const authResponse = await this.sendACMERequest(authUrl, '', account.privateKey);
    const auth = await authResponse.json();

    // Find HTTP-01 challenge
    const challenge = auth.challenges.find((c: any) => c.type === 'http-01');
    if (!challenge) {
      throw new Error('HTTP-01 challenge not available');
    }

    // Generate key authorization
    const keyAuthorization = this.generateKeyAuthorization(challenge.token, account.publicKey);

    // Validate through callback
    const isValid = await validationCallback(challenge.token, keyAuthorization);
    if (!isValid) {
      throw new Error('Challenge validation failed');
    }

    // Notify ACME server that challenge is ready
    await this.sendACMERequest(challenge.url, {}, account.privateKey);

    // Poll for challenge completion
    await this.pollChallengeStatus(challenge.url, account.privateKey);
  }

  /**
   * Generate key authorization for ACME challenge
   */
  private generateKeyAuthorization(token: string, publicKey: string): string {
    const jwk = this.extractJWK(publicKey);
    const thumbprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(jwk))
      .digest('base64url');
    
    return `${token}.${thumbprint}`;
  }

  /**
   * Extract JWK (JSON Web Key) from public key
   */
  private extractJWK(publicKey: string): any {
    // Convert PEM to JWK format
    const keyObject = crypto.createPublicKey(publicKey);
    const jwk = keyObject.export({ format: 'jwk' });
    return jwk;
  }

  /**
   * Poll challenge status until completion
   */
  private async pollChallengeStatus(challengeUrl: string, privateKey: string): Promise<void> {
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.sendACMERequest(challengeUrl, '', privateKey);
      const challenge = await response.json();

      if (challenge.status === 'valid') {
        return;
      }

      if (challenge.status === 'invalid') {
        throw new Error(`Challenge failed: ${JSON.stringify(challenge.error)}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Challenge polling timeout');
  }

  /**
   * Generate Certificate Signing Request (CSR)
   */
  private async generateCSR(domain: string, privateKey: string): Promise<string> {
    const { X509Certificate } = crypto;
    
    // Create CSR using Node.js crypto module
    const subject = [
      `CN=${domain}`,
      'C=US',
      'ST=State',
      'L=City',
      'O=Organization',
      `emailAddress=admin@${domain}`
    ].join('/');
    
    // Generate CSR with crypto.generateKeyPairSync and createSign
    const sign = crypto.createSign('SHA256');
    const csrInfo = {
      version: 0,
      subject: {
        commonName: domain,
        countryName: 'US',
        stateOrProvinceName: 'State',
        localityName: 'City',
        organizationName: 'Organization',
        emailAddress: `admin@${domain}`
      },
      publicKey: crypto.createPublicKey(crypto.createPrivateKey(privateKey)),
      attributes: [
        {
          type: '1.2.840.113549.1.9.14', // extensionRequest
          values: [{
            subjectAltName: [`DNS:${domain}`, `DNS:www.${domain}`]
          }]
        }
      ]
    };
    
    // Create CSR in DER format then convert to PEM
    // This is a simplified version - for production use @peculiar/x509 or node-forge
    const csrDer = Buffer.concat([
      Buffer.from([0x30, 0x82]), // SEQUENCE tag
      Buffer.from([0x02, 0x01, 0x00]), // Version
      Buffer.from(subject, 'utf8'),
      crypto.createPublicKey(crypto.createPrivateKey(privateKey)).export({ type: 'spki', format: 'der' })
    ]);
    
    // Sign the CSR
    sign.update(csrDer);
    const signature = sign.sign(privateKey);
    
    // Combine CSR info and signature
    const fullCsr = Buffer.concat([csrDer, signature]);
    
    // Convert to base64url for ACME
    return fullCsr.toString('base64url');
  }

  /**
   * Parse certificate chain from PEM data
   */
  private parseCertificateChain(pemData: string): { certificate: string; chain: string } {
    const certificates = pemData.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
    
    return {
      certificate: certificates[0] || '',
      chain: certificates.slice(1).join('\n'),
    };
  }

  /**
   * Extract expiration date from certificate
   */
  private extractExpirationDate(certificate: string): Date {
    // Parse certificate and extract expiration
    // This is simplified - use proper certificate parsing in production
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90); // Let's Encrypt certificates are valid for 90 days
    return futureDate;
  }

  /**
   * Send signed ACME request
   */
  private async sendACMERequest(url: string, payload: any, privateKey: string): Promise<Response> {
    // This is a simplified ACME client
    // In production, implement proper JWS signing and ACME protocol
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/jose+json',
      },
      body: JSON.stringify({
        protected: 'base64url-encoded-header',
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
        signature: 'jws-signature',
      }),
    });

    if (!response.ok) {
      throw new Error(`ACME request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /**
   * Store certificate securely
   */
  async storeCertificate(certificate: SSLCertificate): Promise<void> {
    const certDir = path.join(process.cwd(), 'ssl-certificates');
    
    try {
      await fs.mkdir(certDir, { recursive: true });
      
      const certPath = path.join(certDir, `${certificate.domain}.json`);
      await fs.writeFile(certPath, JSON.stringify(certificate, null, 2), { mode: 0o600 });
      
      console.log(`Certificate stored for ${certificate.domain}`);
    } catch (error) {
      throw new Error(`Failed to store certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load certificate from storage
   */
  async loadCertificate(domain: string): Promise<SSLCertificate | null> {
    const certPath = path.join(process.cwd(), 'ssl-certificates', `${domain}.json`);
    
    try {
      const certData = await fs.readFile(certPath, 'utf8');
      return JSON.parse(certData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if certificate needs renewal (within 30 days of expiration)
   */
  needsRenewal(certificate: SSLCertificate): boolean {
    const now = new Date();
    const renewalDate = new Date(certificate.expiresAt);
    renewalDate.setDate(renewalDate.getDate() - 30); // Renew 30 days before expiration
    
    return now >= renewalDate;
  }
}