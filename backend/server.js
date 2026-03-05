const express = require('express');
const cors = require('cors');
require('dotenv').config();
const routes = require('./routes');
const { healthCheck } = require('./controllers/healthController');
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/api/health', healthCheck);

// API routes
app.use('/api', routes);

// Global error middleware
app.use(errorHandler);

// 404 middleware
app.use(notFoundHandler);

app.listen(PORT, () => {
  console.log(`Pharmacy backend running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});
