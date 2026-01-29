import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PingRecord } from '@/types';

interface ResponseTimeChartProps {
  records: PingRecord[];
}

export function ResponseTimeChart({ records }: ResponseTimeChartProps) {
  const chartData = useMemo(() => {
    return records
      .slice()
      .reverse()
      .map((record) => ({
        timestamp: new Date(record.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        responseTime: record.responseTime,
        statusCode: record.statusCode,
        fullTimestamp: record.timestamp
      }));
  }, [records]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {data.fullTimestamp}
          </p>
          <p className="text-sm text-gray-600">
            Response Time: <span className="font-medium">{data.responseTime}ms</span>
          </p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium">{data.statusCode}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Response Time Trend
      </h2>
      
      {records.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="responseTime"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
