import React from 'react';

export default function StatsPanel({ stats, onStepForward, onStepBackward }) {
    // Add a plus sign manually if the net change is positive
    const formatStat = (num) => (num > 0 ? `+${num}` : num);

    return (
        <div className="stats-panel">
            <div className="stats-group">
                <div className="stat-item">
                    <span className="stat-value removed">-{stats.removed}</span>
                    <span className="stat-label">Lines Removed</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value added">+{stats.added}</span>
                    <span className="stat-label">Lines Added</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value neutral">{formatStat(stats.net)}</span>
                    <span className="stat-label">Net Size Change</span>
                </div>
            </div>

            <div className="nav-buttons">
                <button className="nav-btn" onClick={onStepBackward}>&larr; Step Backward</button>
                <button className="nav-btn" onClick={onStepForward}>Step Forward &rarr;</button>
            </div>
        </div>
    );
}
