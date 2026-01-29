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

export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationInfo;
  error?: string;
  message?: string;
}

export interface AnomalyData {
  timestamp: string;
  type: 'response_time' | 'status_code' | 'error_rate';
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  message: string;
  recordId?: number;
}

export interface Statistics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  statusCodeDistribution: Record<number, number>;
}

export interface FilterOptions {
  limit: number;
  offset: number;
  total?: number;
  statusCode?: number;
  minResponseTime?: number;
  maxResponseTime?: number;
  startTime?: string;
  endTime?: string;
}
