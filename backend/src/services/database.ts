import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';

export interface PingRecord {
  id: number;
  timestamp: string;
  requestPayload: string;
  responseData: string;
  statusCode: number;
  responseTime: number;
  contentType?: string;
  contentLength?: number;
  requestType?: 'manual' | 'auto';
}

export class DatabaseService {
  private db: sqlite3.Database | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(process.env.DB_PATH || './data/monitoring.db', (err) => {
        if (err) {
          logger.error('Error opening database:', err);
          reject(err);
        } else {
          logger.info('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    const createPingRecordsTable = `
      CREATE TABLE IF NOT EXISTS ping_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        request_payload TEXT NOT NULL,
        response_data TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_time INTEGER NOT NULL,
        content_type TEXT,
        content_length INTEGER,
        request_type TEXT DEFAULT 'auto'
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON ping_records(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_status_code ON ping_records(status_code)',
      'CREATE INDEX IF NOT EXISTS idx_response_time ON ping_records(response_time)'
    ];

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(createPingRecordsTable, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Add request_type column if it doesn't exist (migration for existing databases)
        // First check if column exists by querying table info
        this.db!.all(
          `PRAGMA table_info(ping_records)`,
          [],
          (pragmaErr, columns: Array<{ name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>) => {
            if (pragmaErr) {
              logger.warn('Could not check table info for migration:', pragmaErr.message);
              // Continue with index creation even if migration check fails
              this.createIndexes(createIndexes).then(() => resolve()).catch(reject);
              return;
            }

            // Check if request_type column exists
            const hasRequestType = columns.some(col => col.name === 'request_type');
            
            if (!hasRequestType) {
              // Column doesn't exist, add it
              this.db!.run(
                `ALTER TABLE ping_records ADD COLUMN request_type TEXT DEFAULT 'auto'`,
                (alterErr) => {
                  if (alterErr) {
                    logger.error('Failed to add request_type column:', alterErr.message);
                    // Continue anyway - the app should still work
                  } else {
                    logger.info('Successfully added request_type column to existing database');
                  }
                  // Continue with index creation
                  this.createIndexes(createIndexes).then(() => resolve()).catch(reject);
                }
              );
            } else {
              // Column already exists, just create indexes
              logger.info('request_type column already exists, skipping migration');
              this.createIndexes(createIndexes).then(() => resolve()).catch(reject);
            }
          }
        );

      });
    });
  }

  private async createIndexes(indexSqls: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      Promise.all(indexSqls.map(indexSql => 
        new Promise<void>((indexResolve, indexReject) => {
          this.db!.run(indexSql, (indexErr) => {
            if (indexErr) indexReject(indexErr);
            else indexResolve();
          });
        })
      )).then(() => resolve()).catch(reject);
    });
  }

  async insertPingRecord(record: Omit<PingRecord, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const sql = `
        INSERT INTO ping_records 
        (timestamp, request_payload, response_data, status_code, response_time, content_type, content_length, request_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(
        sql,
        [
          record.timestamp,
          record.requestPayload,
          record.responseData,
          record.statusCode,
          record.responseTime,
          record.contentType,
          record.contentLength,
          record.requestType || 'auto'
        ],
        function(err) {
          if (err) {
            logger.error('Error inserting ping record:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async getPingRecords(
    limit: number = 100,
    offset: number = 0,
    filters: {
      statusCode?: number;
      minResponseTime?: number;
      maxResponseTime?: number;
      startTime?: string;
      endTime?: string;
    } = {}
  ): Promise<{ records: PingRecord[], total: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      let whereClause = 'WHERE 1=1';
      const params: (string | number)[] = [];

      if (filters.statusCode) {
        whereClause += ' AND status_code = ?';
        params.push(filters.statusCode);
      }

      if (filters.minResponseTime) {
        whereClause += ' AND response_time >= ?';
        params.push(filters.minResponseTime);
      }

      if (filters.maxResponseTime) {
        whereClause += ' AND response_time <= ?';
        params.push(filters.maxResponseTime);
      }

      if (filters.startTime) {
        whereClause += ' AND timestamp >= ?';
        params.push(filters.startTime);
      }

      if (filters.endTime) {
        whereClause += ' AND timestamp <= ?';
        params.push(filters.endTime);
      }

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM ping_records ${whereClause}`;
      this.db.get(countSql, params, (err, countRow: { total: number }) => {
        if (err) {
          reject(err);
          return;
        }

        // Get records
        const dataSql = `
          SELECT 
            id,
            timestamp,
            request_payload as requestPayload,
            response_data as responseData,
            status_code as statusCode,
            response_time as responseTime,
            content_type as contentType,
            content_length as contentLength,
            request_type as requestType
          FROM ping_records 
          ${whereClause}
          ORDER BY timestamp DESC
          LIMIT ? OFFSET ?
        `;

        if (!this.db) {
  reject(new Error('Database not initialized'));
  return;
}
       this.db.all(dataSql, [...params, limit, offset], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              records: rows as PingRecord[],
              total: countRow.total
            });
          }
        });
      });
    });
  }

  async getRecentRecords(minutes: number = 60): Promise<PingRecord[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const sql = `
        SELECT 
          id,
          timestamp,
          request_payload as requestPayload,
          response_data as responseData,
          status_code as statusCode,
          response_time as responseTime,
          content_type as contentType,
          content_length as contentLength,
          request_type as requestType
        FROM ping_records 
        WHERE timestamp >= datetime('now', '-${minutes} minutes')
        ORDER BY timestamp DESC
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as PingRecord[]);
        }
      });
    });
  }

  async getStatistics(hours: number = 24): Promise<{
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    statusCodeDistribution: Record<number, number>;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const sql = `
        SELECT 
          COUNT(*) as totalRequests,
          AVG(response_time) as averageResponseTime,
          SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successCount,
          status_code
        FROM ping_records 
        WHERE timestamp >= datetime('now', '-${hours} hours')
        GROUP BY status_code
      `;

      this.db.all(sql, [], (err, rows: Array<{ totalRequests: number; averageResponseTime: number; successCount: number; status_code: number }>) => {
        if (err) {
          reject(err);
        } else {
          const totalRequests = rows.reduce((sum, row) => sum + row.totalRequests, 0);
          const successCount = rows.reduce((sum, row) => sum + row.successCount, 0);
          const averageResponseTime = rows.reduce((sum, row) => sum + (row.averageResponseTime * row.totalRequests), 0) / totalRequests;
          
          const statusCodeDistribution: Record<number, number> = {};
          rows.forEach(row => {
            statusCodeDistribution[row.status_code] = row.totalRequests;
          });

          resolve({
            totalRequests,
            averageResponseTime: Math.round(averageResponseTime),
            successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0,
            statusCodeDistribution
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }
}
