import * as dotenv from 'dotenv';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function checkRiskLevel() {
  try {
    const sql = neon(DATABASE_URL!);
    
    // Check if risk_level exists in organizations
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      AND column_name = 'risk_level'
    `;
    
    console.log('Risk level in organizations:', result);
    
    // Check superadmin_audit_logs columns
    const auditCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'superadmin_audit_logs'
      ORDER BY ordinal_position
    `;
    
    console.log('Superadmin audit logs columns:', auditCols);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRiskLevel();