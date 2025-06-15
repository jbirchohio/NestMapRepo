import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import shell from 'shelljs';
import { findProjectRoot } from '../utils/project';

interface SeedOptions {
  env?: string;
  reset?: boolean;
}

/**
 * Seed database with sample data
 */
export const seedDatabase = async (options: SeedOptions): Promise<void> => {
  const spinner = ora('Seeding database...').start();
  
  try {
    const rootDir = findProjectRoot();
    
    if (!rootDir) {
      spinner.fail(chalk.red('Could not find project root directory'));
      return;
    }

    // Validate environment
    const environment = options.env || 'development';
    if (!['development', 'test'].includes(environment)) {
      spinner.fail(chalk.red(`Invalid environment: ${environment}. Must be one of: development, test`));
      return;
    }

    // Change to server directory
    shell.cd(path.join(rootDir, 'server'));

    // Reset database if requested
    if (options.reset) {
      spinner.text = 'Resetting database...';
      
      const resetResult = shell.exec('npm run db:reset', { silent: true });
      
      if (resetResult.code !== 0) {
        spinner.fail(chalk.red('Failed to reset database'));
        console.log(resetResult.stderr);
        return;
      }
      
      spinner.succeed(chalk.green('Database reset successfully'));
      spinner.text = 'Seeding database...';
      spinner.start();
    }
    
    // Set environment
    process.env.NODE_ENV = environment;
    
    // Run seed script
    const seedCommand = `npm run db:seed -- --env=${environment}`;
    const seedResult = shell.exec(seedCommand, { silent: true });
    
    if (seedResult.code !== 0) {
      spinner.fail(chalk.red('Failed to seed database'));
      console.log(seedResult.stderr);
      return;
    }
    
    spinner.succeed(chalk.green(`Database seeded successfully for environment: ${environment}`));
    
    // Display seed information
    console.log(chalk.blue('\nSeed Information:'));
    console.log(chalk.blue(`Environment: ${environment}`));
    console.log(chalk.blue(`Reset: ${options.reset ? 'Yes' : 'No'}`));
    
    // Display sample credentials if available
    console.log(chalk.yellow('\nSample Credentials:'));
    console.log(chalk.yellow('Admin User:'));
    console.log(chalk.yellow('  Email: admin@nestmap.com'));
    console.log(chalk.yellow('  Password: password123'));
    console.log(chalk.yellow('\nRegular User:'));
    console.log(chalk.yellow('  Email: user@nestmap.com'));
    console.log(chalk.yellow('  Password: password123'));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to seed database: ${error}`));
  }
};
