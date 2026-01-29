import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { DatabaseService } from '../services/database';
import { PingService } from '../services/ping';
import { logger } from '../utils/logger';

const pingQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  statusCode: Joi.number().integer().min(100).max(599).optional(),
  minResponseTime: Joi.number().integer().min(0).optional(),
  maxResponseTime: Joi.number().integer().min(0).optional(),
  startTime: Joi.string().isoDate().optional(),
  endTime: Joi.string().isoDate().optional()
});

export function apiRoutes(
  databaseService: DatabaseService,
  pingService: PingService
): Router {
  const router = Router();

  // Get ping records with pagination and filtering
  router.get('/pings', async (req: Request, res: Response) => {
    try {
      const { error, value } = pingQuerySchema.validate(req.query);
      
      if (error) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.details.map(d => d.message)
        });
      }

      const result = await databaseService.getPingRecords(
        value.limit,
        value.offset,
        {
          statusCode: value.statusCode,
          minResponseTime: value.minResponseTime,
          maxResponseTime: value.maxResponseTime,
          startTime: value.startTime,
          endTime: value.endTime
        }
      );

      res.json({
        success: true,
        data: result.records,
        pagination: {
          limit: value.limit,
          offset: value.offset,
          total: result.total,
          hasMore: value.offset + value.limit < result.total
        }
      });
    } catch (error) {
      logger.error('Error fetching ping records:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch ping records'
      });
    }
  });

  // Get statistics
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const stats = await databaseService.getStatistics(hours);
      
      res.json({
        success: true,
        data: stats,
        period: `${hours} hours`
      });
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch statistics'
      });
    }
  });

  // Get recent records for real-time dashboard
  router.get('/recent', async (req: Request, res: Response) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 60;
      const records = await databaseService.getRecentRecords(minutes);
      
      res.json({
        success: true,
        data: records,
        period: `${minutes} minutes`
      });
    } catch (error) {
      logger.error('Error fetching recent records:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch recent records'
      });
    }
  });

  // Manual ping trigger (for testing)
  router.post('/ping', async (req: Request, res: Response) => {
    try {
      await pingService.pingOnce();
      res.json({
        success: true,
        message: 'Manual ping triggered',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error triggering manual ping:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to trigger manual ping'
      });
    }
  });

  // Get anomaly detection statistics
  router.get('/anomaly-stats', async (req: Request, res: Response) => {
    try {
      // This would require access to the anomaly detection service
      // For now, return placeholder data
      res.json({
        success: true,
        data: {
          responseTimeStats: {
            mean: 0,
            stdDev: 0,
            min: 0,
            max: 0,
            count: 0
          },
          errorRate: 0,
          totalRequests: 0
        }
      });
    } catch (error) {
      logger.error('Error fetching anomaly stats:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch anomaly statistics'
      });
    }
  });

  return router;
}
