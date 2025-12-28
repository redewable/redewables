'use client';

import { useState, useEffect } from 'react';

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 32, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) {
          days = 0;
          hours = 0;
          minutes = 0;
          seconds = 0;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="countdown-widget">
      <div className="countdown-header">
        <span className="countdown-title">NEXT ATTESTATION PERIOD</span>
      </div>
      <div className="countdown-timer">
        <div className="countdown-block">
          <span className="countdown-value">{timeLeft.days}</span>
          <span className="countdown-label">DAYS</span>
        </div>
        <span className="countdown-separator">:</span>
        <div className="countdown-block">
          <span className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="countdown-label">HRS</span>
        </div>
        <span className="countdown-separator">:</span>
        <div className="countdown-block">
          <span className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="countdown-label">MIN</span>
        </div>
        <span className="countdown-separator">:</span>
        <div className="countdown-block">
          <span className="countdown-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="countdown-label">SEC</span>
        </div>
      </div>
    </div>
  );
}