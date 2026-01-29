import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { Statistics } from '@/types';

interface StatsCardsProps {
  stats: Statistics;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests.toLocaleString(),
      icon: Activity,
      color: 'primary',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Avg Response Time',
      value: `${stats.averageResponseTime}ms`,
      icon: Clock,
      color: 'warning',
      change: '-8%',
      changeType: 'positive' as const
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: CheckCircle,
      color: 'success',
      change: '+2%',
      changeType: 'positive' as const
    },
    {
      title: 'Error Rate',
      value: `${100 - stats.successRate}%`,
      icon: AlertTriangle,
      color: 'error',
      change: '-2%',
      changeType: 'positive' as const
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      primary: {
        bg: 'bg-primary-50',
        icon: 'text-primary-600',
        text: 'text-primary-900'
      },
      success: {
        bg: 'bg-success-50',
        icon: 'text-success-600',
        text: 'text-success-900'
      },
      warning: {
        bg: 'bg-warning-50',
        icon: 'text-warning-600',
        text: 'text-warning-900'
      },
      error: {
        bg: 'bg-error-50',
        icon: 'text-error-600',
        text: 'text-error-900'
      }
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const colors = getColorClasses(card.color);
        const Icon = card.icon;
        
        return (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${colors.text} mt-1`}>
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-sm font-medium ${
                      card.changeType === 'positive' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}
                  >
                    {card.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    from last period
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${colors.bg}`}>
                <Icon className={`w-6 h-6 ${colors.icon}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
