import { AlertTriangle, X } from 'lucide-react';
import { AnomalyData } from '@/types';
import { clsx } from 'clsx';

interface AnomalyAlertsProps {
  anomalies: AnomalyData[];
}

export function AnomalyAlerts({ anomalies }: AnomalyAlertsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-orange-600',
      low: 'text-yellow-600'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (anomalies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Recent Anomalies ({anomalies.length})
        </h3>
      </div>
      
      <div className="space-y-2">
        {anomalies.map((anomaly, index) => (
          <div
            key={index}
            className={clsx(
              'border rounded-lg p-4 flex items-start space-x-3',
              getSeverityColor(anomaly.severity)
            )}
          >
            <AlertTriangle className={clsx('w-5 h-5 mt-0.5', getSeverityIcon(anomaly.severity))} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium capitalize">
                  {anomaly.type.replace('_', ' ')} - {anomaly.severity}
                </p>
                <span className="text-xs opacity-75">
                  {formatTimestamp(anomaly.timestamp)}
                </span>
              </div>
              
              <p className="text-sm mt-1">
                {anomaly.message}
              </p>
              
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <span>
                  Value: <strong>{anomaly.value}</strong>
                </span>
                <span>
                  Threshold: <strong>{anomaly.threshold}</strong>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
