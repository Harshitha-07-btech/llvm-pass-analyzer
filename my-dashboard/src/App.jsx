import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StatsPanel from './components/StatsPanel';

import CodeViewer from './components/CodeViewer';
import CFGViewer from './components/CFGViewer';
import LiveEditor from './components/LiveEditor'; // Natively mapping the interactive C++ module
import OptimizationScoreboard from './components/OptimizationScoreboard'; // Injection map target explicitly wired!
import LogTerminal from './components/LogTerminal';

export default function App() {
  const [passes, setPasses] = useState([]);
  const [activePassId, setActivePassId] = useState(null);
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([{ type: 'info', msg: '[INFO] Initializing dashboard...' }]);

  // Search query explicitly driven via user prompt constraints mapped against passes array
  const [searchQuery, setSearchQuery] = useState("");

  // Track cleanly through 3 distinct frontend views natively (editor vs logic viewers)
  const [viewMode, setViewMode] = useState('editor'); // Instantly route to the Live Editor securely by default

  // Lifted React State: Preserves C++ payload natively even when switching layout tabs!
  const [editorCode, setEditorCode] = useState(`#include <iostream>\n\nint main() {\n    // Generate 10 iterations securely demonstrating loop unrolling targets\n    for (int i = 0; i < 10; ++i) {\n        std::cout << "Hello LLVM Optimization!" << std::endl;\n    }\n    return 0;\n}`);

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

  // Create resilient dynamic filtered array ensuring case-insensitive evaluations actively map passes!
  const filteredPasses = passes.filter(pass =>
    pass.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStepForward = () => {
    if (!filteredPasses.length) return;
    const currentIndex = filteredPasses.findIndex(p => p.id === activePassId);
    if (currentIndex >= 0 && currentIndex < filteredPasses.length - 1) {
      setActivePassId(filteredPasses[currentIndex + 1].id);
    }
  };

  const handleStepBackward = () => {
    if (!filteredPasses.length) return;
    const currentIndex = filteredPasses.findIndex(p => p.id === activePassId);
    if (currentIndex > 0) {
      setActivePassId(filteredPasses[currentIndex - 1].id);
    }
  };

  const clearLogs = () => setLogs([]);

  // Simple, beautifully isolated render wrapper natively flipping state
  const renderWorkspace = () => {
    if (viewMode === 'editor') {
      return <LiveEditor code={editorCode} setCode={setEditorCode} />;
    }

    // Explicit Scoreboard hijack wrapper bypassing payload data blocks natively
    if (viewMode === 'scoreboard') {
      return <OptimizationScoreboard />;
    }

    if (loading || !passData) {
      return <div style={{ padding: 20 }}>Loading Application Telemetry from Python Backend...</div>;
    }

    if (viewMode === 'diff') {
      return <CodeViewer originalCode={passData.original_code} modifiedCode={passData.modified_code} />;
    }

    if (viewMode === 'cfg') {
      return <CFGViewer originalCode={passData.original_code} modifiedCode={passData.modified_code} />;
    }
  };

  return (
    <div className="dashboard-container">

      {/* Explicitly encapsulating the sidebar layout inside a custom vertical flexbox mapping searching */}
      <div className="left-panel-wrapper" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0B0F19', borderRight: '1px solid #1E293B', overflow: 'hidden' }}>
        <div style={{ padding: '14px', borderBottom: '1px solid #1E293B', backgroundColor: '#131826' }}>
          <input
            type="text"
            placeholder="Search passes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#1E293B',
              color: '#E2E8F0',
              border: '1px solid #334155',
              outline: 'none',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)'
            }}
          />
        </div>
        {/* Pass explicitly filtered arrays logically bypassing master payload caches */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Sidebar
            passes={filteredPasses}
            activePassId={activePassId}
            onSelectPass={setActivePassId}
          />
        </div>
      </div>

      <div className="main-area" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Only statically render the numeric code diff metrics if we are actually viewing active data configurations */}
        {viewMode !== 'editor' && viewMode !== 'scoreboard' && passData && (
          <StatsPanel
            stats={{
              removed: passData.lines_removed,
              added: passData.lines_added,
              net: passData.net_change
            }}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
          />
        )}

        {/* Highly Robust View Mode Navigation Toggle */}
        <div style={{ backgroundColor: '#1A2234', padding: '10px 16px', display: 'flex', gap: '16px', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600, alignSelf: 'center', letterSpacing: '1px' }}>WORKSPACE:</span>

          <button
            onClick={() => setViewMode('editor')}
            className="nav-btn"
            style={{ backgroundColor: viewMode === 'editor' ? '#8B5CF6' : 'transparent', color: '#fff', fontSize: '0.9rem', padding: '6px 14px' }}>
            ✍️ Live IDE Editor
          </button>

          <button
            onClick={() => setViewMode('scoreboard')}
            className="nav-btn"
            style={{ backgroundColor: viewMode === 'scoreboard' ? '#F59E0B' : 'transparent', color: '#fff', fontSize: '0.9rem', padding: '6px 14px' }}>
            📊 Scoreboard
          </button>

          <button
            onClick={() => setViewMode('diff')}
            className="nav-btn"
            style={{ backgroundColor: viewMode === 'diff' ? '#3B82F6' : 'transparent', color: '#fff', fontSize: '0.9rem', padding: '6px 14px' }}>
            Standard Code Diff
          </button>

          <button
            onClick={() => setViewMode('cfg')}
            className="nav-btn"
            style={{ backgroundColor: viewMode === 'cfg' ? '#10B981' : 'transparent', color: '#fff', fontSize: '0.9rem', padding: '6px 14px' }}>
            Control Flow Graph (CFG)
          </button>
        </div>

        {/* Component Injector safely stretching across height securely */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {renderWorkspace()}
        </div>

        <LogTerminal logs={logs} onClearLogs={clearLogs} />
      </div>
    </div>
  );
}
