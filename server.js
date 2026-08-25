const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve Static Files (public folder se admin.html, app.js wagera)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes Mounting
const orderRoutes = require('./src/routes/orderRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');

app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/webhooks', webhookRoutes);

// Catch-all route for SPA (admin dashboard)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const orderRoutes = require('./src/routes/orderRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');