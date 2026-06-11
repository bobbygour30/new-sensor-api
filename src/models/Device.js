import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema(
  {
    device_id: {
      type: String,
      required: true,
      // unique: true,
      index: true,
      trim: true
    },
    temperature: {
      type: Number,
      required: false,
      min: -100,
      max: 100
    },
    relative_humidity: {
      type: Number,
      required: false,
      min: 0,
      max: 100
    },
    tvoc: {
      type: Number,
      required: false,
      min: 0
    },
    air_velocity: {
      type: Number,
      required: false,
      min: 0
    },
    pm_2_5: {
      type: Number,
      required: false,
      min: 0
    },
    pm_10: {
      type: Number,
      required: false,
      min: 0
    },
    co2: {
      type: Number,
      required: false,
      min: 0
    },
    lux: {
      type: Number,
      required: false,
      min: 0
    },
    noise_av: {
      type: Number,
      required: false,
      min: 0
    },
    noise_peak: {
      type: Number,
      required: false,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active'
    },
    last_seen: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Add compound index for better query performance
DeviceSchema.index({ device_id: 1, created_at: -1 });
DeviceSchema.index({ status: 1 });
DeviceSchema.index({ last_seen: -1 });

// Update last_seen on any update
DeviceSchema.pre('findOneAndUpdate', function(next) {
  this.set({ last_seen: new Date() });
  next();
});

export default mongoose.models.Device || mongoose.model("Device", DeviceSchema);