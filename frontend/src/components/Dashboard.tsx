import { useState, useEffect } from 'react';
import { Header } from './Header';
import { StatsCards } from './StatsCards';
import { DataTable } from './DataTable';
import { AnomalyAlerts } from './AnomalyAlerts';
import { ResponseTimeChart } from './ResponseTimeChart';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiClient } from '@/lib/api';
import { PingRecord, Statistics, FilterOptions } from '@/types';
import { LoadingSpinner } from './LoadingSpinner';

interface DashboardProps {
  initialData: {
    records: PingRecord[];
    stats: Statistics;
  } | null;
}

export function Dashboard({ initialData }: DashboardProps) {
  const [records, setRecords] = useState<PingRecord[]>(initialData?.records || []);
  const [stats, setStats] = useState<Statistics>(initialData?.stats || {
    totalRequests: 0,
    averageResponseTime: 0,
    successRate: 0,
    statusCodeDistribution: {}
  });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    limit: 50,
    offset: 0,
    total: initialData?.records?.length || 0
  });
  const [lastProcessedRecordId, setLastProcessedRecordId] = useState<number | null>(
    initialData?.records?.[0]?.id || null
  );
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const { isConnected, newRecords, anomalies } = useWebSocket();

  // Check if filters are active
  useEffect(() => {
    const active = !!(
      filters.statusCode !== undefined ||
      filters.minResponseTime !== undefined ||
      filters.maxResponseTime !== undefined ||
      filters.startTime !== undefined ||
      filters.endTime !== undefined
    );
    setHasActiveFilters(active);
  }, [filters]);

  // Update records and stats when new ones come in via WebSocket
  // Only add WebSocket records if no filters are active
  useEffect(() => {
    if (newRecords.length > 0 && !hasActiveFilters) {
      // Process only new records that haven't been processed yet
      const unprocessedRecords = newRecords.filter(
        r => !lastProcessedRecordId || r.id > lastProcessedRecordId
      );
      
      if (unprocessedRecords.length > 0) {
        setRecords(prev => {
          // Merge new records, avoiding duplicates
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewRecords = unprocessedRecords.filter(r => !existingIds.has(r.id));
          const updated = [...uniqueNewRecords, ...prev].slice(0, 100);
          
          // Update last processed ID
          if (uniqueNewRecords.length > 0) {
            const maxId = Math.max(...uniqueNewRecords.map(r => r.id));
            setLastProcessedRecordId(prevId => prevId === null ? maxId : Math.max(prevId, maxId));
          }
          
          return updated;
        });
        
        // Update stats immediately when new records arrive
        const updateStats = async () => {
          try {
            const newStats = await apiClient.getStatistics(24);
            setStats(newStats);
          } catch (error) {
            console.error('Failed to refresh stats:', error);
          }
        };
        updateStats();
      }
    }
  }, [newRecords, lastProcessedRecordId, hasActiveFilters]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newStats = await apiClient.getStatistics(24);
        setStats(newStats);
      } catch (error) {
        console.error('Failed to refresh stats:', error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = async (newFilters: FilterOptions) => {
    setLoading(true);
    try {
      const result = await apiClient.getPingRecords(newFilters);
      setRecords(result.records);
      setFilters({
        ...newFilters,
        total: result.pagination?.total ?? result.records.length
      });
    } catch (error) {
      console.error('Failed to fetch filtered records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPing = async () => {
    setLoading(true);
    try {
      // Trigger the ping - WebSocket will handle the update
      await apiClient.triggerManualPing();
      
      // Wait a bit for WebSocket event to arrive, then refresh to ensure sync
      // This ensures the UI is updated even if WebSocket is slow or fails
      setTimeout(async () => {
        try {
          const [result, newStats] = await Promise.all([
            apiClient.getPingRecords(filters),
            apiClient.getStatistics(24)
          ]);
          
          // Merge with existing records, avoiding duplicates
          setRecords(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const uniqueNewRecords = result.records.filter(r => !existingIds.has(r.id));
            const updated = [...uniqueNewRecords, ...prev].slice(0, 100);
            
            // Update last processed ID
            if (result.records.length > 0) {
              const maxId = Math.max(...result.records.map(r => r.id));
              setLastProcessedRecordId(prevId => prevId === null ? maxId : Math.max(prevId || 0, maxId));
            }
            
            return updated;
          });
          
          setStats(newStats);
          setFilters(prev => ({
            ...prev,
            total: result.pagination?.total ?? result.records.length
          }));
        } catch (error) {
          console.error('Failed to refresh after manual ping:', error);
        } finally {
          setLoading(false);
        }
      }, 800); // Wait 800ms for WebSocket event and database write
    } catch (error) {
      console.error('Failed to trigger manual ping:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        isConnected={isConnected}
        onManualPing={handleManualPing}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <StatsCards stats={stats} />
        
        {/* Anomaly Alerts */}
        {anomalies.length > 0 && (
          <div className="mt-6">
            <AnomalyAlerts anomalies={anomalies} />
          </div>
        )}
        
        {/* Charts and Table */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Chart */}
          <div className="lg:col-span-2">
            <ResponseTimeChart records={records.slice(0, 50)} />
          </div>
          
          {/* Data Table */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <DataTable 
                records={records}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
