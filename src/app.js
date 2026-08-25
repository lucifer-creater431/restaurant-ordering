const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const orderRoutes = require('./routes/orderRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Public folder se Static HTML files serve karne ke liye
app.use(express.static(path.join(__dirname, '../public')));

// Root route direct admin dashboard serve karega
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;