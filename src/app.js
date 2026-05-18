import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware, corsOptions, corsMiddlewarePackage } from './middleware/cors.js';
import deviceRoutes from './routes/device.js';

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration - Enable all networks
app.use(corsMiddleware); // Custom CORS middleware
// Alternative using cors package (uncomment if you prefer)
// app.use(corsMiddlewarePackage);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Device API is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Device Monitoring API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      devices: 'GET /api/device',
      deviceById: 'GET /api/device/:device_id',
      createDevice: 'POST /api/device',
      updateDevice: 'PUT /api/device/:device_id',
      deleteDevice: 'DELETE /api/device/:device_id',
      latestReading: 'GET /api/device/latest/:device_id'
    }
  });
});

// Mount routes
app.use('/api/device', deviceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

export default app;