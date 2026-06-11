import express from 'express';
import { connectDB } from '../config/database.js';
import Device from '../models/Device.js';

const router = express.Router();

// GET - Get sensor readings with filtering
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    const { 
      device_id, 
      limit = 50,        // Default to 50 entries
      hours,             // Get readings from last X hours
      from,              // Specific from date
      to                 // Specific to date
    } = req.query;
    
    const limitNum = parseInt(limit);
    
    // Build query
    const query = {};
    
    // Add device_id filter if provided
    if (device_id) {
      query.device_id = device_id;
    }
    
    // Add time filter if hours parameter is provided
    if (hours) {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));
      query.created_at = { $gte: hoursAgo };
    }
    
    // Add specific date range if provided
    if (from || to) {
      query.created_at = {};
      if (from) {
        query.created_at.$gte = new Date(from);
      }
      if (to) {
        query.created_at.$lte = new Date(to);
      }
    }
    
    // Get data with sorting (newest first) and limit
    const data = await Device.find(query)
      .sort({ created_at: -1 })
      .limit(limitNum);
    
    // Get total count for pagination info
    const totalCount = await Device.countDocuments(query);
    
    // Get unique device IDs for info
    const deviceIds = await Device.distinct('device_id');
    
    res.status(200).json({
      success: true,
      data: data,
      device_info: {
        total_devices: deviceIds.length,
        device_ids: deviceIds,
        total_readings: totalCount
      },
      pagination: {
        limit: limitNum,
        returned: data.length,
        total: totalCount,
        hasMore: totalCount > limitNum
      },
      filters: {
        device_id: device_id || null,
        hours: hours || null,
        from: from || null,
        to: to || null
      }
    });
    
  } catch (err) {
    console.error("GET /api/device error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// GET - Get latest reading only
router.get('/latest', async (req, res) => {
  try {
    await connectDB();
    
    const { device_id } = req.query;
    const query = device_id ? { device_id } : {};
    
    const latestReading = await Device.findOne(query)
      .sort({ created_at: -1 });
    
    if (!latestReading) {
      return res.status(404).json({
        success: false,
        error: "No readings found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: latestReading
    });
    
  } catch (err) {
    console.error("GET /api/device/latest error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// POST - Create a new sensor reading (always adds new entry)
router.post('/', async (req, res) => {
  try {
    await connectDB();

    const {
      device_id,
      temperature,
      relative_humidity,
      tvoc,
      air_velocity,
      pm_2_5,
      pm_10,
      co2,
      lux,
      noise_av,
      noise_peak,
      status
    } = req.body;

    if (!device_id) {
      return res.status(400).json({ 
        success: false,
        error: "device_id is required" 
      });
    }

    // Create new reading (always add, don't update existing)
    const newReading = await Device.create({
      device_id,
      temperature,
      relative_humidity,
      tvoc,
      air_velocity,
      pm_2_5,
      pm_10,
      co2,
      lux,
      noise_av,
      noise_peak,
      status: status || 'active',
      last_seen: new Date()
    });

    res.status(201).json({
      success: true,
      message: "✅ Sensor reading added successfully",
      data: newReading
    });
    
  } catch (err) {
    console.error("POST /api/device error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// GET device statistics
router.get('/stats', async (req, res) => {
  try {
    await connectDB();
    
    const { device_id, hours } = req.query;
    
    // Build query for time range
    const query = {};
    if (device_id) query.device_id = device_id;
    if (hours) {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));
      query.created_at = { $gte: hoursAgo };
    }
    
    const stats = await Device.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$device_id",
          avg_temperature: { $avg: "$temperature" },
          avg_humidity: { $avg: "$relative_humidity" },
          avg_co2: { $avg: "$co2" },
          avg_pm2_5: { $avg: "$pm_2_5" },
          max_temperature: { $max: "$temperature" },
          min_temperature: { $min: "$temperature" },
          total_readings: { $sum: 1 },
          first_reading: { $min: "$created_at" },
          last_reading: { $max: "$created_at" }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      statistics: stats,
      filters: {
        device_id: device_id || null,
        hours: hours || null
      }
    });
    
  } catch (err) {
    console.error("GET /api/device/stats error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// DELETE - Delete old readings (optional cleanup)
router.delete('/cleanup', async (req, res) => {
  try {
    await connectDB();
    
    const { older_than_days = 30, device_id } = req.query;
    
    const query = {
      created_at: { 
        $lt: new Date(Date.now() - parseInt(older_than_days) * 24 * 60 * 60 * 1000)
      }
    };
    
    if (device_id) query.device_id = device_id;
    
    const result = await Device.deleteMany(query);
    
    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old readings`,
      deleted_count: result.deletedCount
    });
    
  } catch (err) {
    console.error("DELETE /api/device/cleanup error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

export default router;