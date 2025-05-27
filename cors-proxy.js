const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 Incoming request: ${req.method} ${req.url}`);
  console.log(`📥 Headers:`, req.headers);
  next();
});

// Create proxy middleware for Freshservice API
const apiProxy = createProxyMiddleware({
  target: 'https://patterntickets.freshservice.com',
  changeOrigin: true,
  secure: true,
  logLevel: 'debug',
  headers: {
    'Authorization': 'Basic OUNSaXJCaW5SSVJwVG9ubTJYOlg=',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Ensure authentication header
    proxyReq.setHeader('Authorization', 'Basic OUNSaXJCaW5SSVJwVG9ubTJYOlg=');
    proxyReq.setHeader('Accept', 'application/json');
    proxyReq.setHeader('Content-Type', 'application/json');
    
    console.log(`🔄 Proxying: ${req.method} ${req.url}`);
    console.log(`🎯 Target: https://patterntickets.freshservice.com${req.url}`);
    console.log(`🔐 Auth header set: ${proxyReq.getHeader('Authorization')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${req.url}`);
    console.log(`📄 Content-Type: ${proxyRes.headers['content-type']}`);
    
    // Log first few bytes of response for debugging
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      console.log(`📝 Response preview: ${body.substring(0, 200)}...`);
    });
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    console.error('❌ Error details:', err);
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  }
});

// Use the proxy for all /api requests
app.use('/api', apiProxy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CORS Proxy Server is running',
    target: 'https://patterntickets.freshservice.com',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying API requests to: https://patterntickets.freshservice.com`);
  console.log(`🔐 Using API Key: 9CRirBinRIRpTonm2X`);
  console.log(`🌐 Frontend URL: http://localhost:3000`);
  console.log(`💡 Test with: curl http://localhost:${PORT}/api/v2/tickets?page=1&per_page=1`);
}); 