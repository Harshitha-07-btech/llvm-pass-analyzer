import React, { useState } from 'react';

export default function LiveEditor({ code, setCode }) {
    const [isCompiling, setIsCompiling] = useState(false);
    const [message, setMessage] = useState(null);

    const handleCompile = async () => {
        setIsCompiling(true);
        setMessage({ type: 'info', text: 'Sending C++ payload directly to FastAPI backend compiler...' });

        try {
            const response = await fetch('http://127.0.0.1:8000/api/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_code: code })
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP Error ${response.status}`);
            }

            const data = await response.json();
            setMessage({ type: 'success', text: 'Compilation absolutely successful! The frontend dashboard logs should automatically populate shortly.' });
        } catch (err) {
            setMessage({ type: 'error', text: `Compilation fatally failed: ${err.message}` });
        } finally {
            setIsCompiling(false);
        }
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0B0F19', padding: '24px' }}>
            <h2 style={{ color: '#E2E8F0', marginBottom: '16px', fontSize: '1.2rem', fontFamily: 'Inter' }}>Live C++ Workspace Editor</h2>

            {/* Alert banner for rendering native network request states */}
            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '6px',
                    backgroundColor: message.type === 'error' ? '#450A0A' : (message.type === 'success' ? '#064E3B' : '#1e293b'),
                    color: message.type === 'error' ? '#FECACA' : (message.type === 'success' ? '#34D399' : '#38bdf8'),
                    fontSize: '0.95rem'
                }}>
                    {message.text}
                </div>
            )}

            {/* The core interactive text zone */}
            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck="false"
                style={{
                    flex: 1,
                    backgroundColor: '#131A2A',
                    color: '#34D399',
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    fontSize: '1.05rem',
                    padding: '24px',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: '1.6'
                }}
            />

            {/* Call to Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                    onClick={handleCompile}
                    disabled={isCompiling}
                    style={{
                        backgroundColor: isCompiling ? '#475569' : '#8B5CF6',
                        color: '#fff',
                        border: 'none',
                        padding: '14px 28px',
                        borderRadius: '6px',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        cursor: isCompiling ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {isCompiling ? 'Generating Intermediary Representation ...' : 'Run Compile & Analyze Action'}
                </button>
            </div>
        </div>
    );
}
