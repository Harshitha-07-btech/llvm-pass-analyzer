import React from 'react';

export default function CodeViewer({ originalCode, modifiedCode }) {
    return (
        <div className="code-viewer-container">
            <div className="code-pane left">
                <div className="code-header">Original IR (Before Pass)</div>
                <div className="code-content">
                    {originalCode.map((line, idx) => (
                        <span key={idx} className={`code-line ${line.status === 'removed' ? 'removed' : ''}`}>
                            {line.text}
                        </span>
                    ))}
                </div>
            </div>
            <div className="code-pane right">
                <div className="code-header">Modified IR (After Pass)</div>
                <div className="code-content">
                    {modifiedCode.map((line, idx) => (
                        <span key={idx} className={`code-line ${line.status === 'added' ? 'added' : ''}`}>
                            {line.text}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
