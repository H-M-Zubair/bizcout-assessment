import { DatabaseService } from '../../services/database';
import { logger } from '../../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  const testDbPath = './test_monitoring.db';

  beforeEach(async () => {
    databaseService = new DatabaseService();
    // Use a test database
    process.env.DB_PATH = testDbPath;
    await databaseService.initialize();
  });

  afterEach(async () => {
    await databaseService.close();
    // Clean up test database file
    const fs = require('fs');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('initialize', () => {
    it('should initialize the database and create tables', async () => {
      expect(databaseService).toBeDefined();
      // Should not throw any errors during initialization
      await expect(databaseService.initialize()).resolves.not.toThrow();
    });
  });

  describe('insertPingRecord', () => {
    it('should insert a ping record successfully', async () => {
      const record = {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify({ test: 'data' }),
        responseData: JSON.stringify({ status: 'ok' }),
        statusCode: 200,
        responseTime: 150,
        contentType: 'application/json',
        contentLength: 50
      };

      const recordId = await databaseService.insertPingRecord(record);
      expect(recordId).toBeDefined();
      expect(typeof recordId).toBe('number');
      expect(recordId).toBeGreaterThan(0);
    });

    it('should insert multiple records successfully', async () => {
      const records = [
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
          responseData: JSON.stringify({ status: 'ok2' }),
          statusCode: 201,
          responseTime: 200,
          contentType: 'application/json',
          contentLength: 60
        }
      ];

      const recordIds = await Promise.all(records.map(record => 
        databaseService.insertPingRecord(record)
      ));

      expect(recordIds).toHaveLength(2);
      recordIds.forEach(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
      });
    });
  });

  describe('getPingRecords', () => {
    beforeEach(async () => {
      // Insert test data
      const testRecords = [
        {
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          requestPayload: JSON.stringify({ test: 'old' }),
          responseData: JSON.stringify({ status: 'old' }),
          statusCode: 200,
          responseTime: 100,
          contentType: 'application/json',
          contentLength: 50
        },
        {
          timestamp: new Date().toISOString(),
          requestPayload: JSON.stringify({ test: 'new' }),
          responseData: JSON.stringify({ status: 'new' }),
          statusCode: 404,
          responseTime: 200,
          contentType: 'application/json',
          contentLength: 60
        }
      ];

      await Promise.all(testRecords.map(record => 
        databaseService.insertPingRecord(record)
      ));
    });

    it('should return paginated records', async () => {
      const result = await databaseService.getPingRecords(1, 0);
      expect(result.records).toHaveLength(1);
      expect(result.total).toBeGreaterThan(0);
      expect(result.records[0]).toHaveProperty('id');
      expect(result.records[0]).toHaveProperty('timestamp');
      expect(result.records[0]).toHaveProperty('statusCode');
    });

    it('should filter by status code', async () => {
      const result = await databaseService.getPingRecords(10, 0, { statusCode: 404 });
      expect(result.records).toHaveLength(1);
      expect(result.records[0].statusCode).toBe(404);
    });

    it('should filter by response time range', async () => {
      const result = await databaseService.getPingRecords(10, 0, { 
        minResponseTime: 150,
        maxResponseTime: 250
      });
      expect(result.records).toHaveLength(1);
      expect(result.records[0].responseTime).toBe(200);
    });

    it('should return records sorted by timestamp descending', async () => {
      const result = await databaseService.getPingRecords(10, 0);
      expect(result.records).toHaveLength(2);
      const firstRecord = result.records[0];
      const secondRecord = result.records[1];
      expect(new Date(firstRecord.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(secondRecord.timestamp).getTime()
      );
    });
  });

  describe('getStatistics', () => {
    beforeEach(async () => {
      // Insert test data with known values
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
          responseData: JSON.stringify({ status: 'ok2' }),
          statusCode: 200,
          responseTime: 200,
          contentType: 'application/json',
          contentLength: 60
        },
        {
          timestamp: new Date().toISOString(),
          requestPayload: JSON.stringify({ test: 'data3' }),
          responseData: JSON.stringify({ status: 'error' }),
          statusCode: 500,
          responseTime: 300,
          contentType: 'application/json',
          contentLength: 70
        }
      ];

      await Promise.all(testRecords.map(record => 
        databaseService.insertPingRecord(record)
      ));
    });

    it('should calculate correct statistics', async () => {
      const stats = await databaseService.getStatistics(24);
      expect(stats.totalRequests).toBe(3);
      expect(stats.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
      expect(stats.successRate).toBe(67); // 2 out of 3 successful requests
      expect(stats.statusCodeDistribution).toEqual({
        200: 2,
        500: 1
      });
    });
  });

  describe('getRecentRecords', () => {
    it('should return records within the specified time window', async () => {
      // Insert a recent record
      const recentRecord = {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify({ test: 'recent' }),
        responseData: JSON.stringify({ status: 'recent' }),
        statusCode: 200,
        responseTime: 150,
        contentType: 'application/json',
        contentLength: 50
      };

      await databaseService.insertPingRecord(recentRecord);

      const recentRecords = await databaseService.getRecentRecords(60); // Last 60 minutes
      expect(recentRecords.length).toBeGreaterThan(0);
      
      const foundRecord = recentRecords.find(r => r.responseTime === 150);
      expect(foundRecord).toBeDefined();
    });
  });
});
