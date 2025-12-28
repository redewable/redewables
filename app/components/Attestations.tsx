'use client';

export default function Attestations() {
  const tasks = [
    { id: 1, name: 'Verify site conditions', status: 'complete', reward: 25 },
    { id: 2, name: 'Confirm weather data accuracy', status: 'complete', reward: 25 },
    { id: 3, name: 'Review interconnection status', status: 'complete', reward: 50 },
    { id: 4, name: 'Validate land control documents', status: 'pending', reward: 100 },
    { id: 5, name: 'Confirm engineering milestone', status: 'locked', reward: 150 },
  ];

  const completedCount = tasks.filter(t => t.status === 'complete').length;

  return (
    <div className="attestation-widget">
      <div className="attestation-header">
        <span className="attestation-title">ATTESTATION TASKS</span>
        <span className="attestation-progress">{completedCount}/{tasks.length}</span>
      </div>
      <div className="attestation-list">
        {tasks.map(task => (
          <div key={task.id} className={`attestation-item ${task.status}`}>
            <div className="attestation-check">
              {task.status === 'complete' && '✓'}
              {task.status === 'pending' && '○'}
              {task.status === 'locked' && '🔒'}
            </div>
            <div className="attestation-info">
              <span className="attestation-name">{task.name}</span>
              <span className="attestation-reward">+{task.reward} $RDW</span>
            </div>
            {task.status === 'pending' && (
              <button className="attestation-btn">Verify</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}