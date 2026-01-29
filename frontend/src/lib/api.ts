import axios from "axios";
import { PingRecord, ApiResponse, Statistics, FilterOptions } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;
console.log("API_BASE_URL IS ............",API_BASE_URL);
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  },
);

export const apiClient = {
  // Get ping records with pagination and filtering
  async getPingRecords(
    filters: FilterOptions,
  ): Promise<{ records: PingRecord[]; pagination: any }> {
    const response = await api.get<ApiResponse<PingRecord[]>>("/api/pings", {
      params: filters,
    });
    return {
      records: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Get statistics
  async getStatistics(hours: number = 24): Promise<Statistics> {
    const response = await api.get<ApiResponse<Statistics>>("/api/stats", {
      params: { hours },
    });
    return response.data.data;
  },

  // Get recent records
  async getRecentRecords(minutes: number = 60): Promise<PingRecord[]> {
    const response = await api.get<ApiResponse<PingRecord[]>>("/api/recent", {
      params: { minutes },
    });
    return response.data.data;
  },

  // Trigger manual ping
  async triggerManualPing(): Promise<{ message: string; timestamp: string }> {
    const response =
      await api.post<ApiResponse<{ message: string; timestamp: string }>>(
        "/api/ping",
      );
    return response.data.data;
  },

  // Get anomaly statistics
  async getAnomalyStats(): Promise<any> {
    const response = await api.get<ApiResponse<any>>("/api/anomaly-stats");
    return response.data.data;
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get<{ status: string; timestamp: string }>(
      "/health",
    );
    return response.data;
  },
};
