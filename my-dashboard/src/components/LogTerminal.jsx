import React from 'react';

export default function LogTerminal({ logs, onClearLogs }) {
    // Gracefully default to an empty array just in case
    const safeLogs = logs || [];

    return (
        <div className="log-terminal">
            <div className="terminal-header">
                <span>Compiler Output Logs</span>
                <span style={{ cursor: 'pointer' }} onClick={onClearLogs}>Clear</span>
            </div>
            <div className="terminal-content">
                {safeLogs.map((log, i) => (
                    <div key={i} className={`log-line ${log.type}`}>
                        {log.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}
