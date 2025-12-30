'use client';

import { useState, useEffect } from 'react';

interface AttestationsProps {
  onOpenDocument: () => void;
  landControlVerified: boolean;
  wallet: string | null;
  onRewardEarned?: (amount: number) => void;
}

export default function Attestations({ onOpenDocument, landControlVerified, wallet, onRewardEarned }: AttestationsProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Countdown to next Monday 12pm CDT
useEffect(() => {
  const getNextMonday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(12, 0, 0, 0); // 12pm
    
    // If it's Monday but past 12pm, go to next Monday
    if (dayOfWeek === 1 && now.getHours() >= 12) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }
    
    // Adjust for CDT (UTC-5)
    const cdtOffset = 5 * 60 * 60 * 1000;
    return new Date(nextMonday.getTime() + cdtOffset);
  };

  const updateCountdown = () => {
    const now = new Date();
    const target = getNextMonday();
    const difference = target.getTime() - now.getTime();

    if (difference > 0) {
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    }
  };

  updateCountdown();
  const interval = setInterval(updateCountdown, 1000);
  return () => clearInterval(interval);
}, []);

  const tasks = [
    { id: 'site-conditions', name: 'Verify site conditions', status: 'complete', reward: 25 },
    { id: 'weather-data', name: 'Confirm weather data accuracy', status: 'complete', reward: 25 },
    { id: 'interconnection', name: 'Review interconnection status', status: 'complete', reward: 50 },
    { id: 'land-control', name: 'Validate land control documents', status: landControlVerified ? 'complete' : 'pending', reward: 100, hasDocument: true },
    { id: 'engineering', name: 'Confirm engineering milestone', status: 'locked', reward: 150 },
  ];

  const completedCount = tasks.filter(t => t.status === 'complete').length;

  const handleVerify = async (taskId: string, taskType: string, reward: number) => {
    if (!wallet) return;

    try {
      const response = await fetch('/api/attestations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          taskId,
          taskType,
        }),
      });

      const data = await response.json();

      if (data.success && onRewardEarned) {
        onRewardEarned(reward);
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  return (
    <div className="attestation-widget">
      <div className="attestation-header">
        <span className="attestation-title">ATTESTATION TASKS</span>
        <span className="attestation-progress">{completedCount}/{tasks.length}</span>
      </div>

      <div className="attestation-countdown">
        <span className="countdown-label">Next Task Unlocks in: </span>
        <div className="countdown-timer">
          <div className="countdown-unit">
            <span className="countdown-value">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="countdown-label-small">D</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="countdown-label-small">H</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="countdown-label-small">M</span>
          </div>
          <span className="countdown-sep">:</span>
          <div className="countdown-unit">
            <span className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="countdown-label-small">S</span>
          </div>
        </div>
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
                View Doc
              </button>
            )}
            {task.status === 'pending' && !task.hasDocument && (
              <button
                className="attestation-btn"
                onClick={() => handleVerify(task.id, task.id, task.reward)}
              >
                Verify
              </button>
            )}
            {task.status === 'complete' && task.hasDocument && (
              <span className="attestation-verified">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}