'use client';

export default function ProjectTimeline() {
  const milestones = [
    { name: 'Land Control', status: 'complete', date: 'Apr 2025' },
    { name: 'Vendor Agreements', status: 'complete', date: 'Jul 2025' },
    { name: 'Injection Study', status: 'active', date: 'Dec 2025' },
    { name: 'Geotech', status: 'upcoming', date: 'Jan 2026' },
    { name: 'Engineering', status: 'upcoming', date: 'Q1 2026' },
    { name: 'Interconnection Filing', status: 'upcoming', date: 'Q2 2026' },
    { name: 'Signed IA / NTP', status: 'upcoming', date: 'Q1 2027' },
    { name: 'Exit', status: 'upcoming', date: 'Q2 2027' },
  ];

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span className="timeline-title">PROJECT TIMELINE</span>
      </div>
      <div className="timeline-track">
        {milestones.map((milestone, index) => (
          <div key={index} className={`timeline-item ${milestone.status}`}>
            <div className="timeline-dot"></div>
            {index < milestones.length - 1 && <div className="timeline-line"></div>}
            <div className="timeline-content">
              <span className="timeline-name">{milestone.name}</span>
              <span className="timeline-date">{milestone.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}