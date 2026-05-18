import app from './src/app.js';

const PORT = process.env.PORT || 5000;

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`
  ════════════════════════════════════════════════════
  🚀 SINGLE DEVICE API Server is running!
  ════════════════════════════════════════════════════
  📡 Server URL: http://localhost:${PORT}
  🌐 CORS enabled for all networks
  🔒 Mode: SINGLE DEVICE ONLY
  📝 Health check: http://localhost:${PORT}/health
  🔌 API endpoints: http://localhost:${PORT}/api/device
  ════════════════════════════════════════════════════
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

// Export app for Vercel
export default app;