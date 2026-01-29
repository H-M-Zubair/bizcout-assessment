import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { DatabaseService } from './services/database';
import { PingService } from './services/ping';
import { AnomalyDetectionService } from './services/anomalyDetection';
import { apiRoutes } from './routes/api';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8001;
console.log("PORT IS ............",PORT);
// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const databaseService = new DatabaseService();
const pingService = new PingService(databaseService, io);
const anomalyService = new AnomalyDetectionService(databaseService, io);

// Routes
app.use('/api', apiRoutes(databaseService, pingService));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start server
async function startServer() {
  try {
    await databaseService.initialize();
    logger.info('Database initialized successfully');
    
    // Start ping service
    pingService.start();
    logger.info('Ping service started');
    
    // Start anomaly detection
    anomalyService.start();
    logger.info('Anomaly detection service started');
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pingService.stop();
  anomalyService.stop();
  await databaseService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  pingService.stop();
  anomalyService.stop();
  await databaseService.close();
  process.exit(0);
});

startServer();
