import React, { useState, useEffect } from 'react';

export default function OptimizationScoreboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // Securely pull the live backend telemetry directly mapping dynamic compiler analysis arrays
    useEffect(() => {
        setLoading(true);
        fetch('http://127.0.0.1:8000/api/optimization-summary')
            .then(res => {
                if (!res.ok) throw new Error(`Server returned status ${res.status}`);
                return res.json();
            })
            .then(data => {
                setSummary(data);
                setErrorMsg(null);
            })
            .catch(err => {
                console.error("Scoreboard fetch error:", err);
                setErrorMsg(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Resilient conditional renders gracefully bypassing layout destruction globally
    if (loading) {
        return (
            <div style={{ padding: '40px', color: '#38BDF8', textAlign: 'center', fontSize: '1.1rem', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#1E293B', padding: '16px 32px', borderRadius: '8px', border: '1px solid #334155' }}>
                    Aggregating compiler passes...
                </span>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div style={{ padding: '40px', color: '#F87171', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ marginBottom: '12px' }}>Failed to load scoreboard data.</h3>
                <p style={{ color: '#FCA5A5' }}>{errorMsg}</p>
            </div>
        );
    }

    if (!summary || !summary.passes || summary.passes.length === 0) {
        return (
            <div style={{ padding: '40px', color: '#94A3B8', textAlign: 'center', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#1E293B', padding: '16px 32px', borderRadius: '8px', border: '1px solid #334155' }}>
                    No code modifications detected across passes.
                </span>
            </div>
        );
    }

    const { passes, totals } = summary;

    return (
        <div style={{ padding: '24px', backgroundColor: '#0B0F19', color: '#E2E8F0', flex: 1, overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '24px', color: '#38bdf8', fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                📊 Optimization Scoreboard
            </h2>

            {/* Highly constrained Native HTML Data Table overriding global DOM styles exclusively containing real data */}
            <div style={{ backgroundColor: '#131A2A', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <tr>
                            <th style={{ padding: '16px', borderBottom: '1px solid #334155' }}>Pass Name</th>
                            <th style={{ padding: '16px', borderBottom: '1px solid #334155' }}>Target Function</th>
                            <th style={{ padding: '16px', borderBottom: '1px solid #334155', textAlign: 'center' }}>Lines Added (+)</th>
                            <th style={{ padding: '16px', borderBottom: '1px solid #334155', textAlign: 'center' }}>Lines Removed (-)</th>
                            <th style={{ padding: '16px', borderBottom: '1px solid #334155', textAlign: 'center' }}>Net Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {passes.map((row, idx) => (
                            <tr key={row.id} style={{ backgroundColor: idx % 2 === 0 ? '#0F172A' : '#131A2A', borderBottom: '1px solid #1E293B', transition: 'background-color 0.2s', cursor: 'default' }}>
                                <td style={{ padding: '16px', fontWeight: 500 }}>{row.passName}</td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', color: '#8B5CF6' }}>{row.target}</td>

                                {/* Dynamic Native Value Styling natively handling positive/neutral/negative UI rendering maps */}
                                <td style={{ padding: '16px', textAlign: 'center', color: row.added > 0 ? '#34D399' : '#64748B', fontWeight: 600 }}>
                                    {row.added > 0 ? `+${row.added}` : row.added}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: row.removed > 0 ? '#F87171' : '#64748B', fontWeight: 600 }}>
                                    {row.removed > 0 ? `-${row.removed}` : row.removed}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center', color: row.net > 0 ? '#34D399' : row.net < 0 ? '#F87171' : '#E2E8F0', fontWeight: 700 }}>
                                    {row.net > 0 ? `+${row.net}` : row.net}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#0f172a', fontWeight: 'bold', borderTop: '2px solid #334155' }}>
                            <td colSpan="2" style={{ padding: '16px', textAlign: 'right', color: '#94A3B8' }}>TOTAL PIPELINE IMPACT:</td>
                            <td style={{ padding: '16px', textAlign: 'center', color: totals.added > 0 ? '#34D399' : '#64748B' }}>
                                {totals.added > 0 ? `+${totals.added}` : totals.added}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', color: totals.removed > 0 ? '#F87171' : '#64748B' }}>
                                {totals.removed > 0 ? `-${totals.removed}` : totals.removed}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', color: totals.net > 0 ? '#34D399' : totals.net < 0 ? '#F87171' : '#E2E8F0', fontWeight: 900 }}>
                                {totals.net > 0 ? `+${totals.net}` : totals.net}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
