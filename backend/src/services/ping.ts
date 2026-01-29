import axios, { AxiosResponse } from 'axios';
import { Server } from 'socket.io';
import { DatabaseService, PingRecord } from './database';
import { logger } from '../utils/logger';

const DEFAULT_PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_HTTPBIN_URL = 'https://httpbin.org/anything';

const readNumberEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class PingService {
  private interval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL: number;
  private readonly HTTPBIN_URL: string;

  constructor(
    private databaseService: DatabaseService,
    private io: Server
  ) {
    this.PING_INTERVAL = readNumberEnv('PING_INTERVAL', DEFAULT_PING_INTERVAL);
    this.HTTPBIN_URL = process.env.HTTPBIN_URL || DEFAULT_HTTPBIN_URL;
  }

  start(): void {
    logger.info('Starting ping service');
    
    // Run immediately on start
    this.performPing();
    
    // Set up periodic ping
    this.interval = setInterval(() => {
      this.performPing();
    }, this.PING_INTERVAL);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Ping service stopped');
    }
  }

  private generateRandomPayload(): Record<string, unknown> {
    const adjectives = ['fast', 'slow', 'large', 'small', 'complex', 'simple', 'heavy', 'light'];
    const nouns = ['request', 'payload', 'data', 'package', 'message', 'packet', 'bundle', 'container'];
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'black', 'white'];
    
    const randomChoice = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];
    
    return {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(2, 15),
      metadata: {
        source: 'httpbin-monitor',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      data: {
        type: randomChoice(nouns),
        size: randomChoice(adjectives),
        color: randomChoice(colors),
        random: Math.random(),
        counter: Math.floor(Math.random() * 1000)
      },
      nested: {
        level1: {
          level2: {
            value: Math.random().toString(36),
            timestamp: Date.now()
          }
        }
      }
    };
  }

  private async performPing(requestType: 'manual' | 'auto' = 'auto'): Promise<void> {
    const startTime = Date.now();
    const payload = this.generateRandomPayload();
    
    try {
      logger.info(`Pinging ${this.HTTPBIN_URL}`);
      
      const response: AxiosResponse = await axios.post(
        this.HTTPBIN_URL,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'httpbin-monitor/1.0.0'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const record: Omit<PingRecord, 'id'> = {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify(payload),
        responseData: JSON.stringify(response.data),
        statusCode: response.status,
        responseTime,
        contentType: response.headers['content-type'],
        contentLength: JSON.stringify(response.data).length,
        requestType
      };

      // Store in database
      const recordId = await this.databaseService.insertPingRecord(record);
      
      logger.info(`Ping completed successfully. ID: ${recordId}, Status: ${response.status}, Time: ${responseTime}ms`);

      // Broadcast to connected clients
      this.io.emit('newPingRecord', {
        id: recordId,
        ...record
      });

    } catch (error: unknown) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAxiosError = axios.isAxiosError(error);
      const axiosError = isAxiosError ? error : null;

      logger.error('Ping failed:', errorMessage);

      const record: Omit<PingRecord, 'id'> = {
        timestamp: new Date().toISOString(),
        requestPayload: JSON.stringify(payload),
        responseData: JSON.stringify({
          error: errorMessage,
          code: axiosError?.code || 'UNKNOWN_ERROR',
          config: axiosError?.config ? {
            url: axiosError.config.url,
            method: axiosError.config.method,
            timeout: axiosError.config.timeout
          } : null
        }),
        statusCode: axiosError?.response?.status || 0,
        responseTime,
        contentType: 'application/json',
        contentLength: 0,
        requestType
      };

      try {
        const recordId = await this.databaseService.insertPingRecord(record);
        
        // Broadcast error to clients
        this.io.emit('newPingRecord', {
          id: recordId,
          ...record
        });
      } catch (dbError) {
        logger.error('Failed to store error record:', dbError);
      }
    }
  }

  // Manual ping for testing
  async pingOnce(): Promise<void> {
    await this.performPing('manual');
  }
}
