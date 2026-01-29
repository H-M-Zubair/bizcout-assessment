import { useEffect, useState, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { PingRecord, AnomalyData } from '@/types';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [newRecords, setNewRecords] = useState<PingRecord[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);

  const handleNewRecord = useCallback((record: PingRecord) => {
    setNewRecords(prev => [record, ...prev.slice(0, 9)]); // Keep last 10 records
    
    // Show toast for new record
    if (record.statusCode >= 400) {
      toast.error(`New error: ${record.statusCode} - ${record.responseTime}ms`);
    } else {
      toast.success(`New record: ${record.statusCode} - ${record.responseTime}ms`);
    }
  }, []);

  const handleAnomaly = useCallback((anomaly: AnomalyData) => {
    setAnomalies(prev => [anomaly, ...prev.slice(0, 4)]); // Keep last 5 anomalies
    
    // Show toast for anomaly
    const severityColors = {
      low: '🟡',
      medium: '🟠',
      high: '🔴'
    };
    
    toast(`${severityColors[anomaly.severity]} ${anomaly.message}`, {
      duration: anomaly.severity === 'high' ? 8000 : 5000,
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        await socketService.connect();
        if (!mounted) return;
        
        setIsConnected(true);
        socketService.onNewPingRecord(handleNewRecord);
        socketService.onAnomaly(handleAnomaly);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        if (mounted) {
          setIsConnected(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      socketService.removeListener('newPingRecord', handleNewRecord);
      socketService.removeListener('anomaly', handleAnomaly);
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [handleNewRecord, handleAnomaly]);

  const clearNewRecords = useCallback(() => {
    setNewRecords([]);
  }, []);

  const clearAnomalies = useCallback(() => {
    setAnomalies([]);
  }, []);

  return {
    isConnected,
    newRecords,
    anomalies,
    clearNewRecords,
    clearAnomalies,
  };
}
