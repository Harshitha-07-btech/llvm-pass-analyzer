import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';

import CodeViewer from './components/CodeViewer';
import CFGViewer from './components/CFGViewer'; // Our powerful new visualization block!
import LogTerminal from './components/LogTerminal';

export default function App() {
  const [passes, setPasses] = useState([]);
  const [activePassId, setActivePassId] = useState(null);
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([{ type: 'info', msg: '[INFO] Initializing dashboard...' }]);

  // Implicitly handle toggle states routing views organically
  const [viewMode, setViewMode] = useState('diff'); // default 'diff', switches to 'cfg'

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { type, msg }]);
  };

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/passes')
      .then(res => res.json())
      .then(data => {
        setPasses(data);
        if (data.length > 0) {
          setActivePassId(data[0].id);
        }
        addLog(`[SUCCESS] Loaded ${data.length} passes from Backend.`);
      })
      .catch(err => {
        console.error(err);
        addLog('[ERROR] Failed to fetch passes.', 'error');
      });
  }, []);

  useEffect(() => {
    if (!activePassId) return;
    setLoading(true);
    addLog(`[INFO] Pulling data for Pass #${activePassId}...`);

    fetch(`http://127.0.0.1:8000/api/pass/${activePassId}`)
      .then(res => res.json())
      .then(data => {
        setPassData(data);
        setLoading(false);
        addLog(`[SUCCESS] Loaded Pass #${activePassId}`);
      })
      .catch(err => {
        console.error(err);
        addLog(`[ERROR] Failed to load Pass #${activePassId}`, 'error');
        setLoading(false);
      });
  }, [activePassId]);

  const handleStepForward = () => {
    if (!passes.length) return;
    const currentIndex = passes.findIndex(p => p.id === activePassId);
    if (currentIndex >= 0 && currentIndex < passes.length - 1) {
      setActivePassId(passes[currentIndex + 1].id);
    }
  };

  const handleStepBackward = () => {
    if (!passes.length) return;
    const currentIndex = passes.findIndex(p => p.id === activePassId);
    if (currentIndex > 0) {
      setActivePassId(passes[currentIndex - 1].id);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="dashboard-container">
      <Sidebar
        passes={passes}
        activePassId={activePassId}
        onSelectPass={setActivePassId}
      />

      <div className="main-area" style={{ minWidth: 0 }}>
        {loading || !passData ? (
          <div style={{ padding: 20 }}>Loading Data from Python...</div>
        ) : (
          <>
            <StatsPanel
              stats={{
                removed: passData.lines_removed,
                added: passData.lines_added,
                net: passData.net_change
              }}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
            />

            {/* View Mode Toggle Header Layer */}
            <div style={{ backgroundColor: '#1A2234', padding: '10px 16px', display: 'flex', gap: '16px', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, alignSelf: 'center', letterSpacing: '1px' }}>WORKSPACE VISUALIZATION:</span>
              <button
                onClick={() => setViewMode('diff')}
                className="nav-btn"
                style={{ backgroundColor: viewMode === 'diff' ? '#3B82F6' : 'transparent', color: '#fff', fontSize: '0.85rem' }}>
                Standard Code Diff
              </button>
              <button
                onClick={() => setViewMode('cfg')}
                className="nav-btn"
                style={{ backgroundColor: viewMode === 'cfg' ? '#10B981' : 'transparent', color: '#fff', fontSize: '0.85rem' }}>
                Control Flow Graph (CFG)
              </button>
            </div>

            {/* Dynamic Rendering depending exclusively on user's mode variable setting */}
            {viewMode === 'diff' ? (
              <CodeViewer
                originalCode={passData.original_code}
                modifiedCode={passData.modified_code}
              />
            ) : (
              <CFGViewer
                originalCode={passData.original_code}
                modifiedCode={passData.modified_code}
              />
            )}

          </>
        )}
        <LogTerminal logs={logs} onClearLogs={clearLogs} />
      </div>
    </div>
  );
}
