import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { apiRoutes } from '../../routes/api';
import { DatabaseService } from '../../services/database';
import { PingService } from '../../services/ping';

describe('API Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let databaseService: DatabaseService;
  let pingService: PingService;
  let mockIo: Server;

  beforeAll(async () => {
    // Setup test database
    databaseService = new DatabaseService();
    process.env.DB_PATH = ':memory:';
    await databaseService.initialize();

    // Setup mock Socket.IO server
    mockIo = {
      emit: jest.fn(),
      on: jest.fn()
    } as unknown as Server;

    // Setup PingService
    pingService = new PingService(databaseService, mockIo);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api', apiRoutes(databaseService, pingService));
    
    server = createServer(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await databaseService.close();
  });

  beforeEach(async () => {
    // Insert test data
    const testRecords = [
      {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify({ test: 'data1' }),
        responseData: JSON.stringify({ status: 'ok1' }),
        statusCode: 200,
        responseTime: 100,
        contentType: 'application/json',
        contentLength: 50
      },
      {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify({ test: 'data2' }),
        responseData: JSON.stringify({ status: 'error' }),
        statusCode: 500,
        responseTime: 300,
        contentType: 'application/json',
        contentLength: 60
      }
    ];

    await Promise.all(testRecords.map(record => 
      databaseService.insertPingRecord(record)
    ));
  });

  describe('GET /api/pings', () => {
    it('should return paginated ping records', async () => {
      const response = await request(app)
        .get('/api/pings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(100);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter by status code', async () => {
      const response = await request(app)
        .get('/api/pings?statusCode=200')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((record: any) => record.statusCode === 200)).toBe(true);
    });

    it('should filter by response time range', async () => {
      const response = await request(app)
        .get('/api/pings?minResponseTime=200&maxResponseTime=400')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((record: any) => {
        expect(record.responseTime).toBeGreaterThanOrEqual(200);
        expect(record.responseTime).toBeLessThanOrEqual(400);
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/pings?limit=invalid')
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should respect pagination limits', async () => {
      const response = await request(app)
        .get('/api/pings?limit=1&offset=0')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('averageResponseTime');
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data).toHaveProperty('statusCodeDistribution');
      expect(response.body.period).toBe('24 hours');
    });

    it('should accept custom time period', async () => {
      const response = await request(app)
        .get('/api/stats?hours=12')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.period).toBe('12 hours');
    });
  });

  describe('GET /api/recent', () => {
    it('should return recent records', async () => {
      const response = await request(app)
        .get('/api/recent')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.period).toBe('60 minutes');
    });

    it('should accept custom time window', async () => {
      const response = await request(app)
        .get('/api/recent?minutes=30')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.period).toBe('30 minutes');
    });
  });

  describe('POST /api/ping', () => {
    it('should trigger manual ping', async () => {
      const response = await request(app)
        .post('/api/ping')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Manual ping triggered');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/anomaly-stats', () => {
    it('should return anomaly statistics', async () => {
      const response = await request(app)
        .get('/api/anomaly-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('responseTimeStats');
      expect(response.body.data).toHaveProperty('errorRate');
      expect(response.body.data).toHaveProperty('totalRequests');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/ping')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});
