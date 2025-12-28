'use client';

interface AttestationsProps {
  onOpenDocument: () => void;
  landControlVerified: boolean;
}

export default function Attestations({ onOpenDocument, landControlVerified }: AttestationsProps) {
  const tasks = [
    { id: 1, name: 'Verify site conditions', status: 'complete', reward: 25 },
    { id: 2, name: 'Confirm weather data accuracy', status: 'complete', reward: 25 },
    { id: 3, name: 'Review interconnection status', status: 'complete', reward: 50 },
    { id: 4, name: 'Validate land control documents', status: landControlVerified ? 'complete' : 'pending', reward: 100, hasDocument: true },
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
            {task.status === 'pending' && task.hasDocument && (
              <button className="attestation-doc-btn" onClick={onOpenDocument}>
                View Document
              </button>
            )}
            {task.status === 'pending' && !task.hasDocument && (
              <button className="attestation-btn">Verify</button>
            )}
            {task.status === 'complete' && task.hasDocument && (
              <span className="attestation-verified">✓ Verified</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}