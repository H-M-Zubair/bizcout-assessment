import { PingService } from '../../services/ping';
import { DatabaseService } from '../../services/database';
import { Server } from 'socket.io';
import axios, { AxiosError } from 'axios';

// Mock dependencies - create mock function that can be accessed
const mockAxiosPost = jest.fn();

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockAxios = {
    ...actualAxios.default,
    post: mockAxiosPost,
    isAxiosError: actualAxios.default.isAxiosError
  };
  return {
    ...actualAxios,
    __esModule: true,
    default: mockAxios
  };
});
jest.mock('../../services/database');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock socket.io Server
const mockEmit = jest.fn();
const mockIo = {
  emit: mockEmit
} as unknown as Server;

describe('PingService', () => {
  let pingService: PingService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockAxiosPost.mockClear();
    
    // Create mock database service
    mockDatabaseService = {
      insertPingRecord: jest.fn().mockResolvedValue(1)
    } as any;

    // Create ping service with mocked dependencies
    pingService = new PingService(mockDatabaseService, mockIo);
  });

  afterEach(() => {
    pingService.stop();
  });

  describe('generateRandomPayload', () => {
    it('should generate a valid random payload', () => {
      // Access private method through type assertion for testing
      const payload = (pingService as any).generateRandomPayload();
      
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('requestId');
      expect(payload).toHaveProperty('metadata');
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('nested');
      
      expect(payload.metadata).toHaveProperty('source', 'httpbin-monitor');
      expect(payload.metadata).toHaveProperty('version', '1.0.0');
      expect(payload.nested).toHaveProperty('level1');
      expect(payload.nested.level1).toHaveProperty('level2');
    });

    it('should generate different payloads on multiple calls', () => {
      const payload1 = (pingService as any).generateRandomPayload();
      // Add small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Wait for at least 1ms
      }
      const payload2 = (pingService as any).generateRandomPayload();
      
      expect(payload1.requestId).not.toBe(payload2.requestId);
      // Timestamps might be the same if called in the same millisecond, so check requestId instead
      expect(payload1.data.counter).not.toBe(payload2.data.counter);
    });
  });

  describe('performPing', () => {
    it('should handle successful ping response', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'content-type': 'application/json'
        },
        data: {
          args: {},
          data: '{"test": "data"}',
          files: {},
          form: {},
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'httpbin-monitor/1.0.0'
          },
          json: { test: 'data' },
          method: 'POST',
          origin: '127.0.0.1',
          url: 'https://httpbin.org/anything'
        }
      };

      mockAxiosPost.mockResolvedValueOnce(mockResponse);

      // Perform the ping
      await (pingService as any).performPing();

      // Verify axios was called correctly
      expect(mockAxiosPost).toHaveBeenCalledWith(
        'https://httpbin.org/anything',
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'httpbin-monitor/1.0.0'
          },
          timeout: 30000
        })
      );

      // Verify database insert was called
      expect(mockDatabaseService.insertPingRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
          responseTime: expect.any(Number),
          contentType: 'application/json',
          contentLength: expect.any(Number)
        })
      );

      // Verify WebSocket emit was called
      expect(mockEmit).toHaveBeenCalledWith('newPingRecord', expect.objectContaining({
        statusCode: 200
      }));
    });

    it('should handle network error', async () => {
      const networkError = new Error('ECONNREFUSED');
      mockAxiosPost.mockRejectedValueOnce(networkError);

      await (pingService as any).performPing();

      // Verify database insert was called with error data
      expect(mockDatabaseService.insertPingRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 0,
          responseData: expect.stringContaining('ECONNREFUSED')
        })
      );

      // Verify WebSocket emit was called with error data
      expect(mockEmit).toHaveBeenCalledWith('newPingRecord', expect.objectContaining({
        statusCode: 0
      }));
    });

    it('should handle HTTP error response', async () => {
      const httpError = new AxiosError('Request failed');
      httpError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Internal Server Error' },
        headers: {},
        config: {} as any
      };
      httpError.config = {} as any;
      httpError.isAxiosError = true;
      mockAxiosPost.mockRejectedValueOnce(httpError);

      await (pingService as any).performPing();

      // Verify database insert was called with error status
      expect(mockDatabaseService.insertPingRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500
        })
      );
    });

    it('should handle timeout error', async () => {
      const timeoutError = new Error('ECONNABORTED');
      mockAxiosPost.mockRejectedValueOnce(timeoutError);

      await (pingService as any).performPing();

      // Verify database insert was called
      expect(mockDatabaseService.insertPingRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 0,
          responseData: expect.stringContaining('ECONNABORTED')
        })
      );
    });
  });

  describe('start and stop', () => {
    it('should start the ping service', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      pingService.start();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );
      
      setIntervalSpy.mockRestore();
    });

    it('should stop the ping service', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      pingService.start();
      pingService.stop();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });

  describe('pingOnce', () => {
    it('should perform a single ping', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { success: true }
      };

      mockAxiosPost.mockResolvedValueOnce(mockResponse);

      await pingService.pingOnce();

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(mockDatabaseService.insertPingRecord).toHaveBeenCalledTimes(1);
    });
  });
});
