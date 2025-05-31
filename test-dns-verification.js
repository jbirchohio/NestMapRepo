import { verifyDomainOwnership, getDomainVerificationInstructions, generateVerificationToken } from './server/domainVerification.js';

async function testDNSVerification() {
  console.log('=== DNS Verification Test ===\n');
  
  // Test domain (using a real domain for demonstration)
  const testDomain = 'google.com';
  const organizationId = 1;
  
  // Generate verification token
  const token = generateVerificationToken(testDomain, organizationId);
  console.log(`Generated verification token: ${token}\n`);
  
  // Get verification instructions
  const instructions = getDomainVerificationInstructions(testDomain, token);
  console.log('DNS Record Instructions:');
  console.log(`Name: ${instructions.dnsRecord.name}`);
  console.log(`Type: ${instructions.dnsRecord.type}`);
  console.log(`Value: ${instructions.dnsRecord.value}\n`);
  
  console.log('Instructions for user:');
  instructions.instructions.forEach((instruction, index) => {
    console.log(`${index + 1}. ${instruction}`);
  });
  console.log('');
  
  // Test actual DNS verification (this will fail since we don't own google.com)
  console.log('Testing DNS verification...');
  const verificationResult = await verifyDomainOwnership(testDomain, token);
  
  console.log('Verification Result:');
  console.log(`Verified: ${verificationResult.verified}`);
  if (verificationResult.error) {
    console.log(`Error: ${verificationResult.error}`);
  }
  if (verificationResult.records && verificationResult.records.length > 0) {
    console.log(`Found TXT records: ${verificationResult.records.join(', ')}`);
  }
  
  // Test with a subdomain that might have TXT records
  console.log('\n=== Testing with _dmarc subdomain (common TXT record) ===');
  try {
    const dmarcResult = await verifyDomainOwnership('_dmarc.google.com', 'any-token');
    console.log('DMARC verification result:', dmarcResult);
  } catch (error) {
    console.log('DMARC test error:', error.message);
  }
}

// Run the test
testDNSVerification().catch(console.error);