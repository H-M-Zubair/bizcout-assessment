import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface HeaderProps {
  isConnected: boolean;
  onManualPing: () => void;
}

export function Header({ isConnected, onManualPing }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                HTTPBin Monitor
              </h1>
              <p className="text-sm text-gray-500">
                Real-time monitoring dashboard
              </p>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Connected
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">
                    Disconnected
                  </span>
                </>
              )}
            </div>

            {/* Manual Ping Button */}
            <button
              onClick={onManualPing}
              className="btn btn-primary flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Manual Ping</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
