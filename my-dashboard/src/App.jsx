import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';
import CodeViewer from './components/CodeViewer';
import LogTerminal from './components/LogTerminal';

export default function App() {
  const [passes, setPasses] = useState([]);
  const [activePassId, setActivePassId] = useState(null);
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([{ type: 'info', msg: '[INFO] Initializing dashboard...' }]);

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
            {/* The CodeViewer component properly rendering instead of the old setup */}
            <CodeViewer
              originalCode={passData.original_code}
              modifiedCode={passData.modified_code}
            />
          </>
        )}
        <LogTerminal logs={logs} onClearLogs={clearLogs} />
      </div>
    </div>
  );
}
