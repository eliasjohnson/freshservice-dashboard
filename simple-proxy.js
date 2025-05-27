const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Proxy endpoint for Freshservice API
app.use('/api', async (req, res) => {
  try {
    console.log(`🔄 Proxying: ${req.method} ${req.url}`);
    
    const targetUrl = `https://patterntickets.freshservice.com${req.url}`;
    console.log(`🎯 Target URL: ${targetUrl}`);
    
    const config = {
      method: req.method,
      url: targetUrl,
      headers: {
        'Authorization': 'Basic OUNSaXJCaW5SSVJwVG9ubTJYOlg=',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params: req.query,
      data: req.body
    };
    
    console.log(`🔐 Auth header: ${config.headers.Authorization}`);
    
    const response = await axios(config);
    
    console.log(`✅ Response: ${response.status}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error(`❌ Proxy error:`, error.message);
    
    if (error.response) {
      console.error(`❌ Error status: ${error.response.status}`);
      console.error(`❌ Error data:`, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Proxy Error', 
        message: error.message 
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Simple CORS Proxy Server is running',
    target: 'https://patterntickets.freshservice.com',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying API requests to: https://patterntickets.freshservice.com`);
  console.log(`🔐 Using API Key: 9CRirBinRIRpTonm2X`);
  console.log(`🌐 Frontend URL: http://localhost:3000`);
  console.log(`💡 Test with: curl http://localhost:${PORT}/api/v2/tickets?page=1&per_page=1`);
}); 