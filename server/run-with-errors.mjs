console.log('🚀 Starting server with error handling...');

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  console.log('📁 Importing server...');
  await import('./dist/index.mjs');
  console.log('✅ Server imported successfully');
} catch (error) {
  console.error('❌ Error importing server:', error);
  process.exit(1);
}
