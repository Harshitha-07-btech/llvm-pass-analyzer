import React, { useState } from 'react';

export default function CodeViewer({ originalCode, modifiedCode }) {
    const [explanation, setExplanation] = useState(null);
    const [isExplaining, setIsExplaining] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const fetchAIExplanation = async () => {
        setIsExplaining(true);
        setExplanation(null);
        setErrorMsg(null);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_code: originalCode,
                    modified_code: modifiedCode
                })
            });

            if (!response.ok) {
                let backendErrorMsg = `HTTP Request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    // FastAPI typically natively throws errors wrapped inside a 'detail' field
                    if (errorData && errorData.detail) {
                        backendErrorMsg = errorData.detail;
                    } else if (errorData && errorData.message) {
                        backendErrorMsg = errorData.message;
                    }
                } catch (parseErr) {
                    // If the backend crashed violently and did not return valid JSON
                    backendErrorMsg = "Failed to fetch AI explanation: Server did not return a valid JSON error payload.";
                }
                throw new Error(backendErrorMsg);
            }

            const data = await response.json();
            setExplanation(data.explanation);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsExplaining(false);
        }
    };

    return (
        <div className="code-viewer-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            {/* Header Toolbar containing explicit Gemini AI Logic */}
            <div style={{ padding: '12px 18px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8' }}>✨ Gemini Explainer Module</span>
                <button
                    disabled={isExplaining}
                    onClick={fetchAIExplanation}
                    className="nav-btn"
                    style={{
                        backgroundColor: isExplaining ? '#475569' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        cursor: isExplaining ? 'not-allowed' : 'pointer'
                    }}>
                    {isExplaining ? 'Analyzing Compilation Data...' : 'Generate Optimization Insight'}
                </button>
            </div>

            {/* Pop-up Modals triggered specifically over the code viewer on Success/Fail states */}
            {explanation && (
                <div style={{ margin: '16px', padding: '20px', backgroundColor: '#064E3B', color: '#A7F3D0', borderRadius: '8px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px', color: '#10B981' }}>Gemini 2.5 Insights:</strong>
                    <p style={{ lineHeight: 1.6, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{explanation}</p>
                </div>
            )}

            {errorMsg && (
                <div style={{ margin: '16px', padding: '20px', backgroundColor: '#450A0A', color: '#FECACA', borderRadius: '8px' }}>
                    <strong>GenAI Fatal Error: </strong> {errorMsg}
                </div>
            )}

            {/* Explicitly split side-by-side using inline row flex */}
            <div className="split-screen-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minWidth: 0 }}>
                <div className="code-pane left">
                    <div className="code-header">Original IR (Before Target Pass)</div>
                    <div className="code-content">
                        {originalCode.map((line, idx) => (
                            <span key={idx} className={`code-line ${line.status === 'removed' ? 'removed' : ''}`}>
                                {line.text}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="code-pane right">
                    <div className="code-header">Modified IR (After Target Pass)</div>
                    <div className="code-content">
                        {modifiedCode.map((line, idx) => (
                            <span key={idx} className={`code-line ${line.status === 'added' ? 'added' : ''}`}>
                                {line.text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
