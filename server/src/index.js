import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes.js';
import scheduleRouter from './schedule-routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', router);
app.use('/api', scheduleRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Calendly Clone API is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});
