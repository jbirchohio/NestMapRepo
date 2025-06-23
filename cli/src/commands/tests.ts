import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import shell from 'shelljs';
import { findProjectRoot } from '../utils/project';
interface TestOptions {
    watch?: boolean;
    coverage?: boolean;
    unit?: boolean;
    e2e?: boolean;
}
/**
 * Run tests
 */
export const runTests = async (options: TestOptions): Promise<void> => {
    const spinner = ora('Running tests...').start();
    try {
        const rootDir = findProjectRoot();
        if (!rootDir) {
            spinner.fail(chalk.red('Could not find project root directory'));
            return;
        }
        // Determine test type
        const runUnitTests = options.unit || (!options.unit && !options.e2e);
        const runE2ETests = options.e2e || (!options.unit && !options.e2e);
        // Build test command
        let command = 'npm test';
        if (options.watch) {
            command += ' -- --watch';
        }
        if (options.coverage) {
            command += ' -- --coverage';
        }
        // Run tests
        if (runUnitTests) {
            await runUnitTestSuite(rootDir, command, spinner);
        }
        if (runE2ETests) {
            await runE2ETestSuite(rootDir, command, spinner);
        }
        spinner.succeed(chalk.green('All tests completed'));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to run tests: ${error}`));
    }
};
/**
 * Run unit tests
 */
async function runUnitTestSuite(rootDir: string, baseCommand: string, spinner: ora.Ora): Promise<void> {
    spinner.text = 'Running unit tests...';
    spinner.start();
    // Run server tests
    console.log(chalk.blue('\nRunning server unit tests:'));
    shell.cd(path.join(rootDir, 'server'));
    const serverTestCommand = baseCommand + ' -- --testPathIgnorePatterns=e2e';
    const serverResult = shell.exec(serverTestCommand);
    if (serverResult.code !== 0) {
        console.log(chalk.red('✗ Server unit tests failed'));
    }
    else {
        console.log(chalk.green('✓ Server unit tests passed'));
    }
    // Run client tests
    console.log(chalk.blue('\nRunning client unit tests:'));
    shell.cd(path.join(rootDir, 'client'));
    const clientTestCommand = baseCommand;
    const clientResult = shell.exec(clientTestCommand);
    if (clientResult.code !== 0) {
        console.log(chalk.red('✗ Client unit tests failed'));
    }
    else {
        console.log(chalk.green('✓ Client unit tests passed'));
    }
}
/**
 * Run E2E tests
 */
async function runE2ETestSuite(rootDir: string, baseCommand: string, spinner: ora.Ora): Promise<void> {
    spinner.text = 'Running E2E tests...';
    spinner.start();
    // Run E2E tests
    console.log(chalk.blue('\nRunning E2E tests:'));
    shell.cd(path.join(rootDir, 'server'));
    const e2eTestCommand = baseCommand + ' -- --testPathPattern=e2e';
    const e2eResult = shell.exec(e2eTestCommand);
    if (e2eResult.code !== 0) {
        console.log(chalk.red('✗ E2E tests failed'));
    }
    else {
        console.log(chalk.green('✓ E2E tests passed'));
    }
}
