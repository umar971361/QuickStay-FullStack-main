// server/routes/testRoutes.js (create this new file)
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Test database connection route
router.get('/test-db', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Testing MongoDB Connection...');
    console.log('Environment check:');
    console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('- MONGODB_URI format:', process.env.MONGODB_URI?.substring(0, 20) + '...');
    console.log('- Current connection state:', mongoose.connection.readyState);

    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        status: 'error',
        message: 'MongoDB not connected',
        details: {
          connectionState: mongoose.connection.readyState,
          stateDescription: getConnectionState(mongoose.connection.readyState)
        }
      });
    }

    // Test database operations
    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();
    
    const collections = await mongoose.connection.db.listCollections().toArray();

    res.json({
      status: 'success',
      message: 'MongoDB connection is working!',
      details: {
        responseTime: `${Date.now() - startTime}ms`,
        connectionState: mongoose.connection.readyState,
        stateDescription: getConnectionState(mongoose.connection.readyState),
        databaseName: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        collections: collections.map(col => col.name),
        ping: pingResult
      }
    });

  } catch (error) {
    console.error('❌ Database Test Failed:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      details: {
        error: error.message,
        errorType: error.name,
        responseTime: `${Date.now() - startTime}ms`,
        connectionState: mongoose.connection.readyState,
        stateDescription: getConnectionState(mongoose.connection.readyState)
      }
    });
  }
});

function getConnectionState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

module.exports = router;