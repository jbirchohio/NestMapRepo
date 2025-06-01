import { execSync } from 'child_process';

console.log('Running database migration...');
try {
  execSync('tsx drizzle/migrate.ts', { stdio: 'inherit' });
  console.log('Database migration completed successfully!');
} catch (error) {
  console.error('Error running database migration:', error);
  process.exit(1);
}