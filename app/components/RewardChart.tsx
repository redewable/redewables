'use client';

interface HistoryItem {
  month: string;
  amount: number;
  active?: boolean;
  year?: number;
  monthIndex?: number;
}

interface RewardChartProps {
  history: HistoryItem[];
  total: number;
}

export default function RewardChart({ history, total }: RewardChartProps) {
  const maxAmount = Math.max(...history.map(r => r.amount), 1); // Min 1 to avoid division by zero

  return (
    <div className="reward-chart">
      <div className="reward-chart-header">
        <span className="reward-chart-title">REWARD HISTORY</span>
        <span className="reward-chart-total">{total.toLocaleString()} $RDW earned</span>
      </div>
      <div className="reward-chart-bars">
        {history.map((item, index) => {
          const isActive = item.active !== false;
          const isCurrentMonth = index === history.length - 1;
          
          return (
            <div key={index} className="reward-bar-container">
              <div className="reward-bar-wrapper">
                {isActive ? (
                  <div 
                    className={`reward-bar ${isCurrentMonth ? 'current' : ''}`}
                    style={{ 
                      height: item.amount > 0 ? `${(item.amount / maxAmount) * 100}%` : '4px',
                      opacity: item.amount > 0 ? 1 : 0.3
                    }}
                  >
                    {item.amount > 0 && <span className="reward-bar-value">{item.amount}</span>}
                  </div>
                ) : (
                  <div 
                    className="reward-bar inactive"
                    style={{ height: '4px' }}
                  />
                )}
              </div>
              <span className={`reward-bar-label ${!isActive ? 'inactive' : ''} ${isCurrentMonth ? 'current' : ''}`}>
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}