'use client';

interface RewardChartProps {
  history: { month: string; amount: number }[];
  total: number;
}

export default function RewardChart({ history, total }: RewardChartProps) {
  const maxAmount = Math.max(...history.map(r => r.amount));

  return (
    <div className="reward-chart">
      <div className="reward-chart-header">
        <span className="reward-chart-title">REWARD HISTORY</span>
        <span className="reward-chart-total">{total.toLocaleString()} $RDW earned</span>
      </div>
      <div className="reward-chart-bars">
        {history.map((item, index) => (
          <div key={index} className="reward-bar-container">
            <div className="reward-bar-wrapper">
              <div 
                className="reward-bar" 
                style={{ height: `${(item.amount / maxAmount) * 100}%` }}
              >
                <span className="reward-bar-value">{item.amount}</span>
              </div>
            </div>
            <span className="reward-bar-label">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}