// Simple test file to debug NestJS initialization issues
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';

// Create a minimal module
@Module({})
class TestAppModule {}

async function bootstrap() {
  try {
    console.log('Starting test application...');
    const app = await NestFactory.create(TestAppModule);
    console.log('Test application created successfully!');
    
    const port = 3002;
    await app.listen(port);
    console.log(`Test application is running on: http://localhost:${port}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error in test application:');
    console.error(error);
    console.error('Stack trace:', error.stack);
    return { success: false, error };
  }
}

bootstrap()
  .then(result => {
    if (!result.success) {
      console.error('Test application failed to start');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error in bootstrap:', err);
    process.exit(1);
  });
