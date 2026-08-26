import React from 'react';

export default function Sidebar({ passes, activePassId, onSelectPass }) {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                Optimization Pipeline
            </div>
            <ul className="pass-list">
                {passes.map((pass) => (
                    <li
                        key={pass.id}
                        className={`pass-item ${pass.id === activePassId ? 'active' : ''}`}
                        onClick={() => onSelectPass(pass.id)}
                    >
                        {pass.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}
