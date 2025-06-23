#!/usr/bin/env node
/**
 * Cross-platform application runner
 * Works on Windows, macOS, and Linux environments consistently
 */
// Import required dependencies
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
// Load environment variables from .env file if it exists
try {
    if (fs.existsSync('.env')) {
        require('dotenv').config();
    }
}
catch (error) {
    console.log('Could not load .env file, continuing with process.env');
}
// Get command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'dev';
// Set environment variables
const env = { ...process.env };
env.NODE_ENV = mode === 'prod' || mode === 'production' ? 'production' : 'development';
// Determine command to run
let command;
let commandArgs;
if (mode === 'dev' || mode === 'development') {
    command = 'npm';
    commandArgs = ['run', 'dev'];
    console.log('Starting NestMap in development mode...');
}
else if (mode === 'prod' || mode === 'production') {
    command = 'npm';
    commandArgs = ['start'];
    console.log('Starting NestMap in production mode...');
}
else if (mode === 'db:push') {
    command = 'npm';
    commandArgs = ['run', 'db:push'];
    console.log('Running database schema push...');
}
else if (mode === 'build') {
    command = 'npm';
    commandArgs = ['run', 'build'];
    console.log('Building NestMap for production...');
}
else {
    console.error(`Unknown command: ${mode}`);
    console.log('Available commands: dev, prod, db:push, build');
    process.exit(1);
}
// Spawn process with environment variables
const proc = spawn(command, commandArgs, {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32' // Use shell on Windows
});
// Handle process events
proc.on('error', (err) => {
    console.error(`Failed to start process: ${err}`);
    process.exit(1);
});
proc.on('close', (code) => {
    if (code !== 0) {
        console.error(`Process exited with code ${code}`);
        process.exit(code);
    }
});
