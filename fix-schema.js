// Create a file called fix-schema.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixSchema() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Drop the unique index on device_id
    const collection = mongoose.connection.collection('devices');
    await collection.dropIndex('device_id_1').catch(() => {
      console.log('Index might not exist or already dropped');
    });
    
    console.log('✅ Removed unique constraint from device_id');
    
    // Now you can insert multiple readings with same device_id
    console.log('Schema fixed! You can now add multiple readings.');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixSchema();