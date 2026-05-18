import express from 'express';
import { connectDB } from '../config/database.js';
import Device from '../models/Device.js';

const router = express.Router();

// Helper function to check if device exists (single device enforcement)
async function checkIfDeviceExists() {
  await connectDB();
  const count = await Device.countDocuments();
  return count > 0;
}

// GET - Get the single device data (no device_id needed)
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    // Get the single device (first and only one)
    const device = await Device.findOne().sort({ created_at: -1 });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "No device found. Please create one device first."
      });
    }
    
    const { limit = 50, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;
    
    // Get all readings of the single device with pagination
    const data = await Device.find({ device_id: device.device_id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Device.countDocuments({ device_id: device.device_id });
    
    res.status(200).json({
      success: true,
      device_info: {
        device_id: device.device_id,
        total_readings: total
      },
      data,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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

// GET - Get latest reading of the single device
router.get('/latest', async (req, res) => {
  try {
    await connectDB();
    
    const device = await Device.findOne().sort({ created_at: -1 });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "No device found. Please create a device first."
      });
    }
    
    res.status(200).json({
      success: true,
      data: device
    });
  } catch (err) {
    console.error("GET /api/device/latest error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// POST - Create the ONE AND ONLY device or update existing
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

    // Check if a device already exists
    const existingDevices = await Device.find();
    
    if (existingDevices.length === 0) {
      // No device exists - CREATE the first and only device
      const device = await Device.create({
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
        status,
        last_seen: new Date()
      });
      
      return res.status(201).json({
        success: true,
        message: "✅ Device created successfully. This is the ONLY device allowed in the system.",
        data: device
      });
    } 
    
    // Device already exists - UPDATE the existing device
    // Check if trying to create a DIFFERENT device
    if (existingDevices[0].device_id !== device_id) {
      return res.status(403).json({
        success: false,
        error: "❌ Only ONE device is allowed in this system. A device already exists with ID: " + existingDevices[0].device_id,
        existing_device_id: existingDevices[0].device_id
      });
    }
    
    // Update the existing device
    const updatedDevice = await Device.findOneAndUpdate(
      { device_id },
      {
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
        status,
        last_seen: new Date()
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: "✅ Device data updated successfully",
      data: updatedDevice
    });
    
  } catch (err) {
    console.error("POST /api/device error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// PUT - Update the single device
router.put('/', async (req, res) => {
  try {
    await connectDB();
    
    const device = await Device.findOne();
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "No device found. Please create a device first using POST."
      });
    }
    
    const updateData = req.body;
    delete updateData.device_id; // Prevent changing device_id
    
    const updatedDevice = await Device.findOneAndUpdate(
      { device_id: device.device_id },
      { ...updateData, last_seen: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: "✅ Device updated successfully",
      data: updatedDevice
    });
    
  } catch (err) {
    console.error("PUT /api/device error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

// DELETE - Delete the only device (with confirmation)
router.delete('/', async (req, res) => {
  try {
    await connectDB();
    
    const { confirm } = req.query;
    
    if (confirm !== 'yes') {
      return res.status(400).json({
        success: false,
        error: "To delete the only device, please add ?confirm=yes to your request"
      });
    }
    
    const device = await Device.findOneAndDelete();
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "No device found to delete"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "✅ Device deleted successfully. You can now create a new device.",
      deleted_device: device
    });
    
  } catch (err) {
    console.error("DELETE /api/device error:", err);
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
    
    const device = await Device.findOne();
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: "No device found"
      });
    }
    
    const totalReadings = await Device.countDocuments({ device_id: device.device_id });
    
    const stats = await Device.aggregate([
      { $match: { device_id: device.device_id } },
      {
        $group: {
          _id: null,
          avg_temperature: { $avg: "$temperature" },
          avg_humidity: { $avg: "$relative_humidity" },
          avg_co2: { $avg: "$co2" },
          avg_pm2_5: { $avg: "$pm_2_5" },
          max_temperature: { $max: "$temperature" },
          min_temperature: { $min: "$temperature" },
          total_readings: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      device_info: {
        device_id: device.device_id,
        created_at: device.created_at,
        last_seen: device.last_seen,
        status: device.status
      },
      statistics: stats[0] || {},
      total_readings: totalReadings
    });
    
  } catch (err) {
    console.error("GET /api/device/stats error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Server error" 
    });
  }
});

export default router;