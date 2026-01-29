import { Server } from 'socket.io';
import { DatabaseService, PingRecord } from './database';
import { logger } from '../utils/logger';

interface AnomalyData {
  timestamp: string;
  type: 'response_time' | 'status_code' | 'error_rate';
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  message: string;
  recordId?: number;
}

interface RollingStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

const DEFAULT_ANALYSIS_INTERVAL = 10 * 60 * 1000; // 10 minutes
const DEFAULT_Z_SCORE_THRESHOLD = 2.5; // Standard deviations from mean
const DEFAULT_RESPONSE_TIME_THRESHOLD = 5000; // 5 seconds

const readNumberEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class AnomalyDetectionService {
  private interval: NodeJS.Timeout | null = null;
  private readonly ANALYSIS_INTERVAL: number;
  private readonly Z_SCORE_THRESHOLD: number;
  private readonly RESPONSE_TIME_THRESHOLD: number;

  constructor(
    private databaseService: DatabaseService,
    private io: Server
  ) {
    this.ANALYSIS_INTERVAL = readNumberEnv('ANALYSIS_INTERVAL', DEFAULT_ANALYSIS_INTERVAL);
    this.Z_SCORE_THRESHOLD = readNumberEnv('Z_SCORE_THRESHOLD', DEFAULT_Z_SCORE_THRESHOLD);
    this.RESPONSE_TIME_THRESHOLD = readNumberEnv('RESPONSE_TIME_THRESHOLD', DEFAULT_RESPONSE_TIME_THRESHOLD);
  }

  start(): void {
    logger.info('Starting anomaly detection service');
    
    // Run analysis immediately on start
    this.performAnalysis();
    
    // Set up periodic analysis
    this.interval = setInterval(() => {
      this.performAnalysis();
    }, this.ANALYSIS_INTERVAL);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Anomaly detection service stopped');
    }
  }

  private async performAnalysis(): Promise<void> {
    try {
      logger.info('Performing anomaly analysis');
      
      // Get recent records for analysis (last 24 hours)
      const recentRecords = await this.databaseService.getRecentRecords(24 * 60);
      
      if (recentRecords.length < 10) {
        logger.info('Insufficient data for anomaly analysis');
        return;
      }

      // Analyze response times
      await this.analyzeResponseTimes(recentRecords);
      
      // Analyze status codes
      await this.analyzeStatusCodes(recentRecords);
      
      // Analyze error rates
      await this.analyzeErrorRates(recentRecords);
      
      logger.info('Anomaly analysis completed');
      
    } catch (error) {
      logger.error('Error during anomaly analysis:', error);
    }
  }

  private async analyzeResponseTimes(records: PingRecord[]): Promise<void> {
    const responseTimes = records.map(r => r.responseTime);
    const stats = this.calculateRollingStats(responseTimes);
    
    // Check for outliers using z-score
    for (const record of records) {
      const zScore = Math.abs((record.responseTime - stats.mean) / stats.stdDev);
      
      if (zScore > this.Z_SCORE_THRESHOLD && record.responseTime > this.RESPONSE_TIME_THRESHOLD) {
        const anomaly: AnomalyData = {
          timestamp: record.timestamp,
          type: 'response_time',
          severity: zScore > 3.5 ? 'high' : zScore > 3.0 ? 'medium' : 'low',
          value: record.responseTime,
          threshold: stats.mean + (this.Z_SCORE_THRESHOLD * stats.stdDev),
          message: `Response time ${record.responseTime}ms is ${zScore.toFixed(2)} standard deviations above mean (${stats.mean.toFixed(0)}ms)`,
          recordId: record.id
        };
        
        await this.broadcastAnomaly(anomaly);
      }
    }
  }

  private async analyzeStatusCodes(records: PingRecord[]): Promise<void> {
    const recentRecords = records.slice(-20); // Last 20 records
    const errorCodes = recentRecords.filter(r => r.statusCode >= 400);
    
    // If we have multiple error codes in recent requests
    if (errorCodes.length >= 3) {
      const errorRate = (errorCodes.length / recentRecords.length) * 100;
      
      const anomaly: AnomalyData = {
        timestamp: new Date().toISOString(),
        type: 'status_code',
        severity: errorRate >= 50 ? 'high' : errorRate >= 25 ? 'medium' : 'low',
        value: errorRate,
        threshold: 20, // 20% error rate threshold
        message: `High error rate detected: ${errorCodes.length}/${recentRecords.length} requests failed (${errorRate.toFixed(1)}%)`
      };
      
      await this.broadcastAnomaly(anomaly);
    }
  }

  private async analyzeErrorRates(records: PingRecord[]): Promise<void> {
    // Group records by hour to analyze error rate trends
    const hourlyData = this.groupByHour(records);
    
    for (const [hour, hourRecords] of Object.entries(hourlyData)) {
      const errorCount = hourRecords.filter(r => r.statusCode >= 400).length;
      const errorRate = (errorCount / hourRecords.length) * 100;
      
      // If error rate for any hour is unusually high
      if (errorRate > 30 && hourRecords.length >= 5) {
        const anomaly: AnomalyData = {
          timestamp: hour,
          type: 'error_rate',
          severity: errorRate >= 50 ? 'high' : 'medium',
          value: errorRate,
          threshold: 30,
          message: `Elevated error rate in ${hour}: ${errorCount}/${hourRecords.length} requests failed (${errorRate.toFixed(1)}%)`
        };
        
        await this.broadcastAnomaly(anomaly);
      }
    }
  }

  private calculateRollingStats(values: number[]): RollingStats {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  private groupByHour(records: PingRecord[]): Record<string, PingRecord[]> {
    const grouped: Record<string, PingRecord[]> = {};
    
    for (const record of records) {
      const hour = record.timestamp.substring(0, 13); // YYYY-MM-DDTHH
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(record);
    }
    
    return grouped;
  }

  private async broadcastAnomaly(anomaly: AnomalyData): Promise<void> {
    logger.warn(`Anomaly detected: ${anomaly.message}`);
    
    // Broadcast to all connected clients
    this.io.emit('anomaly', anomaly);
    
    // Store anomaly in database (optional - could add a separate anomalies table)
    // For now, we'll just broadcast and log
  }

  // Manual analysis trigger for testing
  async analyzeOnce(): Promise<void> {
    await this.performAnalysis();
  }

  // Get current statistics for API endpoint
  async getCurrentStats(): Promise<{
    responseTimeStats: RollingStats;
    errorRate: number;
    totalRequests: number;
  }> {
    const recentRecords = await this.databaseService.getRecentRecords(60); // Last hour
    const responseTimes = recentRecords.map(r => r.responseTime);
    const errorCount = recentRecords.filter(r => r.statusCode >= 400).length;
    
    return {
      responseTimeStats: this.calculateRollingStats(responseTimes),
      errorRate: recentRecords.length > 0 ? (errorCount / recentRecords.length) * 100 : 0,
      totalRequests: recentRecords.length
    };
  }
}
