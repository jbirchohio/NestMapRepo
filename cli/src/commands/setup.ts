import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import { findProjectRoot } from '../utils/project';
interface SetupOptions {
    db?: boolean;
    redis?: boolean;
    env?: boolean;
}
/**
 * Setup project dependencies and environment
 */
export const setupProject = async (options: SetupOptions): Promise<void> => {
    const spinner = ora('Setting up project...').start();
    try {
        const rootDir = findProjectRoot();
        if (!rootDir) {
            spinner.fail(chalk.red('Could not find project root directory'));
            return;
        }
        spinner.succeed(chalk.green('Project root found'));
        // Determine what to setup
        const setupAll = !options.db && !options.redis && !options.env;
        const setupDb = options.db || setupAll;
        const setupRedis = options.redis || setupAll;
        const setupEnv = options.env || setupAll;
        // Setup environment variables
        if (setupEnv) {
            await setupEnvironmentVariables(rootDir);
        }
        // Setup database
        if (setupDb) {
            await setupDatabase(rootDir);
        }
        // Setup Redis
        if (setupRedis) {
            await setupRedis(rootDir);
        }
        // Install dependencies
        await installDependencies(rootDir);
        console.log(chalk.green('\n✓ Project setup completed'));
        console.log(chalk.yellow('\nNext steps:'));
        console.log(chalk.yellow('1. Start the development server: nestmap dev'));
        console.log(chalk.yellow('2. Run database migrations: nestmap migrate'));
        console.log(chalk.yellow('3. Seed the database: nestmap db:seed'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to setup project: ${error}`));
    }
};
/**
 * Setup environment variables
 */
async function setupEnvironmentVariables(rootDir: string): Promise<void> {
    const spinner = ora('Setting up environment variables...').start();
    try {
        // Check for .env.example files
        const serverEnvExample = path.join(rootDir, 'server', '.env.example');
        const clientEnvExample = path.join(rootDir, 'client', '.env.example');
        // Create server .env file
        if (fs.existsSync(serverEnvExample)) {
            const serverEnv = path.join(rootDir, 'server', '.env');
            if (!fs.existsSync(serverEnv)) {
                fs.copyFileSync(serverEnvExample, serverEnv);
                console.log(chalk.green('✓ Created server .env file'));
            }
            else {
                console.log(chalk.blue('ℹ Server .env file already exists'));
            }
        }
        else {
            console.log(chalk.yellow('⚠ Server .env.example file not found'));
        }
        // Create client .env file
        if (fs.existsSync(clientEnvExample)) {
            const clientEnv = path.join(rootDir, 'client', '.env');
            if (!fs.existsSync(clientEnv)) {
                fs.copyFileSync(clientEnvExample, clientEnv);
                console.log(chalk.green('✓ Created client .env file'));
            }
            else {
                console.log(chalk.blue('ℹ Client .env file already exists'));
            }
        }
        else {
            console.log(chalk.yellow('⚠ Client .env.example file not found'));
        }
        spinner.succeed(chalk.green('Environment variables setup completed'));
        console.log(chalk.yellow('Remember to update the .env files with your actual configuration values'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to setup environment variables: ${error}`));
    }
}
/**
 * Setup database
 */
async function setupDatabase(rootDir: string): Promise<void> {
    const spinner = ora('Setting up database...').start();
    try {
        // Check if Docker is installed
        if (!shell.which('docker')) {
            spinner.warn(chalk.yellow('Docker not found. Please install Docker to use the database setup feature.'));
            return;
        }
        // Check if docker-compose file exists
        const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
        if (!fs.existsSync(dockerComposePath)) {
            // Create docker-compose.yml file
            const dockerComposeContent = `version: '3'
services:
  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: nestmap
      POSTGRES_PASSWORD: nestmap
      POSTGRES_DB: nestmap
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
`;
            fs.writeFileSync(dockerComposePath, dockerComposeContent);
            console.log(chalk.green('✓ Created docker-compose.yml file'));
        }
        // Start PostgreSQL container
        spinner.text = 'Starting PostgreSQL container...';
        const dbResult = shell.exec('docker-compose up -d postgres', { cwd: rootDir });
        if (dbResult.code !== 0) {
            spinner.fail(chalk.red('Failed to start PostgreSQL container'));
            console.log(dbResult.stderr);
            return;
        }
        spinner.succeed(chalk.green('PostgreSQL container started'));
        // Update .env file with database connection
        const serverEnvPath = path.join(rootDir, 'server', '.env');
        if (fs.existsSync(serverEnvPath)) {
            let envContent = fs.readFileSync(serverEnvPath, 'utf8');
            // Update or add DATABASE_URL
            if (envContent.includes('DATABASE_URL=')) {
                envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL=postgresql://nestmap:nestmap@localhost:5432/nestmap');
            }
            else {
                envContent += '\nDATABASE_URL=postgresql://nestmap:nestmap@localhost:5432/nestmap\n';
            }
            fs.writeFileSync(serverEnvPath, envContent);
            console.log(chalk.green('✓ Updated DATABASE_URL in .env file'));
        }
        console.log(chalk.blue('\nDatabase Information:'));
        console.log(chalk.blue('Host: localhost'));
        console.log(chalk.blue('Port: 5432'));
        console.log(chalk.blue('Username: nestmap'));
        console.log(chalk.blue('Password: nestmap'));
        console.log(chalk.blue('Database: nestmap'));
        console.log(chalk.blue('Connection URL: postgresql://nestmap:nestmap@localhost:5432/nestmap'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to setup database: ${error}`));
    }
}
/**
 * Setup Redis
 */
async function setupRedis(rootDir: string): Promise<void> {
    const spinner = ora('Setting up Redis...').start();
    try {
        // Check if Docker is installed
        if (!shell.which('docker')) {
            spinner.warn(chalk.yellow('Docker not found. Please install Docker to use the Redis setup feature.'));
            return;
        }
        // Start Redis container
        spinner.text = 'Starting Redis container...';
        const redisResult = shell.exec('docker-compose up -d redis', { cwd: rootDir });
        if (redisResult.code !== 0) {
            spinner.fail(chalk.red('Failed to start Redis container'));
            console.log(redisResult.stderr);
            return;
        }
        spinner.succeed(chalk.green('Redis container started'));
        // Update .env file with Redis connection
        const serverEnvPath = path.join(rootDir, 'server', '.env');
        if (fs.existsSync(serverEnvPath)) {
            let envContent = fs.readFileSync(serverEnvPath, 'utf8');
            // Update or add REDIS_URL
            if (envContent.includes('REDIS_URL=')) {
                envContent = envContent.replace(/REDIS_URL=.*/, 'REDIS_URL=redis://localhost:6379');
            }
            else {
                envContent += '\nREDIS_URL=redis://localhost:6379\n';
            }
            fs.writeFileSync(serverEnvPath, envContent);
            console.log(chalk.green('✓ Updated REDIS_URL in .env file'));
        }
        console.log(chalk.blue('\nRedis Information:'));
        console.log(chalk.blue('Host: localhost'));
        console.log(chalk.blue('Port: 6379'));
        console.log(chalk.blue('Connection URL: redis://localhost:6379'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to setup Redis: ${error}`));
    }
}
/**
 * Install dependencies
 */
async function installDependencies(rootDir: string): Promise<void> {
    const spinner = ora('Installing dependencies...').start();
    try {
        // Install root dependencies
        spinner.text = 'Installing root dependencies...';
        shell.cd(rootDir);
        shell.exec('npm install', { silent: true });
        // Install server dependencies
        spinner.text = 'Installing server dependencies...';
        shell.cd(path.join(rootDir, 'server'));
        shell.exec('npm install', { silent: true });
        // Install client dependencies
        spinner.text = 'Installing client dependencies...';
        shell.cd(path.join(rootDir, 'client'));
        shell.exec('npm install', { silent: true });
        spinner.succeed(chalk.green('Dependencies installed successfully'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to install dependencies: ${error}`));
    }
}
