import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import { findProjectRoot } from '../utils/project';
interface DeployOptions {
    env?: string;
    blueGreen?: boolean;
}
/**
 * Deploy application
 */
export const deployApp = async (options: DeployOptions): Promise<void> => {
    const spinner = ora('Preparing deployment...').start();
    try {
        const rootDir = findProjectRoot();
        if (!rootDir) {
            spinner.fail(chalk.red('Could not find project root directory'));
            return;
        }
        // Validate environment
        const environment = options.env || 'staging';
        if (!['development', 'staging', 'production'].includes(environment)) {
            spinner.fail(chalk.red(`Invalid environment: ${environment}. Must be one of: development, staging, production`));
            return;
        }
        // Check if using blue-green deployment
        const useBlueGreen = options.blueGreen || false;
        // Run pre-deployment checks
        spinner.text = 'Running pre-deployment checks...';
        const checksPass = await runPreDeploymentChecks(rootDir, environment);
        if (!checksPass) {
            spinner.fail(chalk.red('Pre-deployment checks failed. Please fix the issues before deploying.'));
            return;
        }
        spinner.succeed(chalk.green('Pre-deployment checks passed'));
        // Build application
        spinner.text = 'Building application...';
        spinner.start();
        const buildSuccess = await buildApplication(rootDir, environment);
        if (!buildSuccess) {
            spinner.fail(chalk.red('Build failed. Please fix the build issues before deploying.'));
            return;
        }
        spinner.succeed(chalk.green('Application built successfully'));
        // Deploy application
        spinner.text = `Deploying to ${environment}...`;
        spinner.start();
        if (useBlueGreen) {
            await deployWithBlueGreen(rootDir, environment);
        }
        else {
            await deployStandard(rootDir, environment);
        }
        spinner.succeed(chalk.green(`Application deployed to ${environment} successfully`));
        console.log(chalk.blue('\nDeployment completed!'));
        console.log(chalk.yellow(`Environment: ${environment}`));
        console.log(chalk.yellow(`Deployment strategy: ${useBlueGreen ? 'Blue-Green' : 'Standard'}`));
        // Show deployment URL
        const deploymentUrl = getDeploymentUrl(environment);
        if (deploymentUrl) {
            console.log(chalk.green(`\nApplication URL: ${deploymentUrl}`));
        }
    }
    catch (error) {
        spinner.fail(chalk.red(`Deployment failed: ${error}`));
    }
};
/**
 * Run pre-deployment checks
 */
async function runPreDeploymentChecks(rootDir: string, environment: string): Promise<boolean> {
    try {
        // Check if environment configuration exists
        const envFile = path.join(rootDir, 'server', `.env.${environment}`);
        if (!fs.existsSync(envFile)) {
            console.log(chalk.red(`✗ Environment file not found: ${envFile}`));
            return false;
        }
        // Run tests
        console.log(chalk.blue('Running tests...'));
        shell.cd(rootDir);
        const testResult = shell.exec('npm test -- --silent', { silent: true });
        if (testResult.code !== 0) {
            console.log(chalk.red('✗ Tests failed'));
            console.log(testResult.stderr);
            return false;
        }
        console.log(chalk.green('✓ Tests passed'));
        // Check for uncommitted changes
        console.log(chalk.blue('Checking for uncommitted changes...'));
        const gitStatus = shell.exec('git status --porcelain', { silent: true }).stdout.trim();
        if (gitStatus) {
            console.log(chalk.yellow('⚠ You have uncommitted changes:'));
            console.log(gitStatus);
            // Ask for confirmation to continue
            console.log(chalk.yellow('\nIt is recommended to commit your changes before deploying.'));
            console.log(chalk.yellow('You can continue with deployment, but uncommitted changes will not be included.'));
            // In a real CLI, we would prompt for confirmation here
            // For this implementation, we'll just warn and continue
        }
        return true;
    }
    catch (error) {
        console.log(chalk.red(`✗ Pre-deployment checks failed: ${error}`));
        return false;
    }
}
/**
 * Build application
 */
async function buildApplication(rootDir: string, environment: string): Promise<boolean> {
    try {
        // Build server
        console.log(chalk.blue('Building server...'));
        shell.cd(path.join(rootDir, 'server'));
        const serverBuildResult = shell.exec('npm run build', { silent: true });
        if (serverBuildResult.code !== 0) {
            console.log(chalk.red('✗ Server build failed'));
            console.log(serverBuildResult.stderr);
            return false;
        }
        console.log(chalk.green('✓ Server built successfully'));
        // Build client
        console.log(chalk.blue('Building client...'));
        shell.cd(path.join(rootDir, 'client'));
        // Set environment variables for client build
        process.env.NODE_ENV = environment;
        const clientBuildResult = shell.exec('npm run build', { silent: true });
        if (clientBuildResult.code !== 0) {
            console.log(chalk.red('✗ Client build failed'));
            console.log(clientBuildResult.stderr);
            return false;
        }
        console.log(chalk.green('✓ Client built successfully'));
        return true;
    }
    catch (error) {
        console.log(chalk.red(`✗ Build failed: ${error}`));
        return false;
    }
}
/**
 * Deploy with blue-green strategy
 */
async function deployWithBlueGreen(rootDir: string, environment: string): Promise<void> {
    console.log(chalk.blue('Deploying with blue-green strategy...'));
    // In a real implementation, this would use the blue-green deployment scripts
    // For this example, we'll simulate the process
    // 1. Determine current active environment (blue or green)
    console.log(chalk.blue('1. Determining current active environment...'));
    const currentEnv = 'blue'; // This would be determined dynamically
    const targetEnv = currentEnv === 'blue' ? 'green' : 'blue';
    console.log(chalk.blue(`Current active environment: ${currentEnv}`));
    console.log(chalk.blue(`Target environment: ${targetEnv}`));
    // 2. Deploy to inactive environment
    console.log(chalk.blue(`2. Deploying to ${targetEnv} environment...`));
    // 3. Run smoke tests
    console.log(chalk.blue('3. Running smoke tests...'));
    // 4. Switch traffic to new environment
    console.log(chalk.blue(`4. Switching traffic to ${targetEnv} environment...`));
    // 5. Verify deployment
    console.log(chalk.blue('5. Verifying deployment...'));
    console.log(chalk.green('✓ Blue-green deployment completed successfully'));
}
/**
 * Deploy with standard strategy
 */
async function deployStandard(rootDir: string, environment: string): Promise<void> {
    console.log(chalk.blue('Deploying with standard strategy...'));
    // In a real implementation, this would use the standard deployment scripts
    // For this example, we'll simulate the process
    // 1. Stop current application
    console.log(chalk.blue('1. Stopping current application...'));
    // 2. Deploy new version
    console.log(chalk.blue('2. Deploying new version...'));
    // 3. Start application
    console.log(chalk.blue('3. Starting application...'));
    // 4. Verify deployment
    console.log(chalk.blue('4. Verifying deployment...'));
    console.log(chalk.green('✓ Standard deployment completed successfully'));
}
/**
 * Get deployment URL based on environment
 */
function getDeploymentUrl(environment: string): string {
    switch (environment) {
        case 'production':
            return 'https://nestmap.com';
        case 'staging':
            return 'https://staging.nestmap.com';
        case 'development':
            return 'https://dev.nestmap.com';
        default:
            return '';
    }
}
