import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { PingRecord, FilterOptions } from '@/types';
import { clsx } from 'clsx';

interface DataTableProps {
  records: PingRecord[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

type SortField = 'timestamp' | 'statusCode' | 'responseTime';
type SortDirection = 'asc' | 'desc';

export function DataTable({ records, filters, onFilterChange }: DataTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  // Sync localFilters with filters prop when it changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'timestamp') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [records, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const applyFilters = () => {
    // Reset offset to 0 when applying new filters, but preserve limit
    // Remove undefined values to avoid sending them to the backend
    const filtersToApply: FilterOptions = {
      limit: localFilters.limit || filters.limit || 50,
      offset: 0, // Always reset to first page when applying filters
    };
    
    // Only include filter criteria if they have values
    if (localFilters.statusCode !== undefined && localFilters.statusCode !== null) {
      filtersToApply.statusCode = localFilters.statusCode;
    }
    if (localFilters.minResponseTime !== undefined && localFilters.minResponseTime !== null) {
      filtersToApply.minResponseTime = localFilters.minResponseTime;
    }
    if (localFilters.maxResponseTime !== undefined && localFilters.maxResponseTime !== null) {
      filtersToApply.maxResponseTime = localFilters.maxResponseTime;
    }
    if (localFilters.startTime) {
      filtersToApply.startTime = localFilters.startTime;
    }
    if (localFilters.endTime) {
      filtersToApply.endTime = localFilters.endTime;
    }
    
    onFilterChange(filtersToApply);
    setShowFilters(false);
  };

  const resetFilters = () => {
    // Reset to default filters, clearing all filter criteria
    const defaultFilters: FilterOptions = { 
      limit: filters.limit || 50, 
      offset: 0 
    };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
    setShowFilters(false);
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-50';
    if (statusCode >= 300 && statusCode < 400) return 'text-yellow-600 bg-yellow-50';
    if (statusCode >= 400 && statusCode < 500) return 'text-orange-600 bg-orange-50';
    if (statusCode >= 500) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const totalRecords = filters.total ?? records.length;
  const totalPages = Math.ceil(totalRecords / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Request History
          </h2>
          
          <div className="flex items-center space-x-3">
            {filters.statusCode !== undefined || 
             filters.minResponseTime !== undefined || 
             filters.maxResponseTime !== undefined || 
             filters.startTime !== undefined || 
             filters.endTime !== undefined ? (
              <span className="text-sm text-gray-600">
                Filters active
              </span>
            ) : null}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "btn btn-secondary flex items-center space-x-2",
                (filters.statusCode !== undefined || 
                 filters.minResponseTime !== undefined || 
                 filters.maxResponseTime !== undefined || 
                 filters.startTime !== undefined || 
                 filters.endTime !== undefined) && "ring-2 ring-blue-500"
              )}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Code
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 200"
                  value={localFilters.statusCode ?? ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    statusCode: e.target.value && e.target.value !== '' ? parseInt(e.target.value) : undefined
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Response Time (ms)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 100"
                  value={localFilters.minResponseTime ?? ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    minResponseTime: e.target.value && e.target.value !== '' ? parseInt(e.target.value) : undefined
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Response Time (ms)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g., 1000"
                  value={localFilters.maxResponseTime ?? ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    maxResponseTime: e.target.value && e.target.value !== '' ? parseInt(e.target.value) : undefined
                  })}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={resetFilters}
                className="btn btn-secondary"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('timestamp')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>Timestamp</span>
                  {sortField === 'timestamp' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('statusCode')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortField === 'statusCode' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('responseTime')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>Response Time</span>
                  {sortField === 'responseTime' && (
                    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTimestamp(record.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={clsx(
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    getStatusColor(record.statusCode)
                  )}>
                    {record.statusCode}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.responseTime}ms
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={clsx(
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    record.requestType === 'manual' 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 bg-gray-50'
                  )}>
                    {record.requestType === 'manual' ? 'Manual' : 'Auto'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.contentType || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.contentLength ? `${record.contentLength} bytes` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalRecords)} of{' '}
              {totalRecords} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onFilterChange({
                  ...filters,
                  offset: Math.max(0, filters.offset - filters.limit)
                })}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => onFilterChange({
                  ...filters,
                  offset: Math.min(filters.offset + filters.limit, totalRecords - filters.limit)
                })}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
