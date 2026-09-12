import React from 'react';

// Strict parser dynamically identifying LLVM control flow branch points
const extractBasicBlocks = (codeLines) => {
    if (!codeLines || codeLines.length === 0) return [];

    const blocks = [];
    let currentBlock = null;

    codeLines.forEach((lineObj) => {
        const text = lineObj.text.trim();
        if (!text) return; // Explicitly discard empty or blank lines

        // Accurately capture standard LLVM labels like '1:', 'entry:', or comment metadata like '; <label>:12:'
        const labelMatch = text.match(/^([\w.-]+):/);
        const commentLabelMatch = text.match(/^;\s*<label>:([\w.-]+)/);
        const isLabel = labelMatch || commentLabelMatch;

        if (isLabel) {
            if (currentBlock && currentBlock.instructions.length > 0) {
                blocks.push(currentBlock);
            }

            let labelName = labelMatch ? labelMatch[1] : commentLabelMatch[1];
            let predsString = '';

            if (text.includes('preds = ')) {
                predsString = text.split('preds = ')[1].trim();
            }

            currentBlock = {
                id: labelName,
                label: labelName,
                instructions: [],
                successors: [],
                predecessors: predsString
            };

        } else {
            // Omit pure metadata comments globally floating outside logic blocks (e.g. ; Function Attrs)
            if (text.startsWith('; Function') || text.startsWith('; ModuleID') || text.startsWith('source_filename')) return;

            if (!currentBlock) {
                currentBlock = { id: 'entry', label: 'entry_block', instructions: [], successors: [], predecessors: '' };
            }
            currentBlock.instructions.push(lineObj);
        }
    });

    if (currentBlock && currentBlock.instructions.length > 0) {
        blocks.push(currentBlock);
    }

    // Post-process the successors mapping using the last instruction natively
    blocks.forEach(block => {
        const lastLine = block.instructions[block.instructions.length - 1].text.trim();
        if (lastLine.startsWith('br ') || lastLine.startsWith('switch ') || lastLine.startsWith('invoke ')) {
            const matches = [...lastLine.matchAll(/label %([a-zA-Z0-9_.-]+)/g)];
            block.successors = matches.map(m => m[1]);
        } else if (lastLine.startsWith('ret ')) {
            block.successors = ['Return / Exit Context'];
        }
    });

    return blocks;
};

export default function CFGViewer({ originalCode, modifiedCode }) {
    const originalBlocks = extractBasicBlocks(originalCode);
    const modifiedBlocks = extractBasicBlocks(modifiedCode);

    const renderBlockFlow = (blocks) => {
        return blocks.map((block, idx) => (
            <React.Fragment key={idx}>
                <div className="cfg-node" style={{
                    backgroundColor: '#131A2A',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    width: '95%',
                    maxWidth: '850px',
                    marginBottom: '4px',
                    boxShadow: '0 6px 12px -2px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'auto', // Fix: Allow box to expand vertically naturally
                    minHeight: 'fit-content' // Fix: Ensure it stretches to fit all instructions
                }}>
                    {/* Enhanced Node Title with Predecessor Metadata */}
                    <div className="cfg-node-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#1A2234',
                        padding: '12px 16px',
                        borderBottom: '1px solid #334155',
                        color: '#38bdf8',
                        fontWeight: 700,
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        <div>
                            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>💠</span>
                            Block %{block.label}
                        </div>
                        {block.predecessors && (
                            <div style={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                                Predecessors: {block.predecessors}
                            </div>
                        )}
                    </div>

                    {/* Logic Area strictly enforcing expanding constraints and high visibility */}
                    <div className="cfg-node-content" style={{
                        padding: '16px',
                        fontFamily: "'Fira Code', 'Courier New', monospace",
                        fontSize: '1.05rem',
                        lineHeight: '1.6',
                        color: '#E2E8F0',
                        whiteSpace: 'pre', // Enables horizontal scrolling explicitly on long strings
                        overflowX: 'auto', // Fix: Enable X-Axis scrolling securely inside the block
                        flexGrow: 1
                    }}>
                        {block.instructions.map((line, i) => {
                            // Render explicit line coloring dynamically safely
                            let bgColor = 'transparent';
                            let fWeight = 'normal';
                            let txtColor = '#E2E8F0';
                            if (line.status === 'added') {
                                bgColor = '#064E3B';
                                txtColor = '#34D399';
                                fWeight = '600';
                            } else if (line.status === 'removed') {
                                bgColor = '#450A0A';
                                txtColor = '#F87171';
                                fWeight = '600';
                            } else {
                                // Neutral line, keep default color but softly dim metadata comments
                                if (line.text.trim().startsWith(';')) {
                                    txtColor = '#94A3B8';
                                }
                            }

                            return (
                                <div key={i} style={{ backgroundColor: bgColor, color: txtColor, fontWeight: fWeight, padding: '2px 4px', borderRadius: '4px' }}>
                                    {line.text}
                                </div>
                            );
                        })}
                    </div>

                    {/* New Advanced Control Flow Metadata Footer */}
                    <div className="cfg-node-footer" style={{
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        padding: '12px 16px',
                        borderTop: '1px solid #334155',
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#94A3B8', fontWeight: 600 }}>Branches: </span>
                        {block.successors.length > 0 ? (
                            block.successors.map((succ, i) => (
                                <span key={i} style={{ backgroundColor: '#3B82F6', color: 'white', padding: '4px 10px', borderRadius: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {succ.includes('Return') ? '⏹ ' + succ : `↪ %${succ}`}
                                </span>
                            ))
                        ) : (
                            <span style={{ backgroundColor: '#475569', color: 'white', padding: '4px 10px', borderRadius: '12px', fontFamily: 'monospace', fontWeight: 600 }}>End Focus</span>
                        )}
                    </div>
                </div>

                {/* Draw a distinct SVG directional arrow connecting sequentially down to the next conceptual basic block */}
                {idx < blocks.length - 1 && (
                    <div className="cfg-arrow-connector" style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 0L15 35" stroke="#475569" strokeWidth="4" strokeDasharray="6 4" />
                            <path d="M15 40L7 28H23L15 40Z" fill="#38bdf8" />
                        </svg>
                    </div>
                )}
            </React.Fragment>
        ));
    };

    return (
        <div className="split-screen-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div className="cfg-pane left" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', backgroundColor: '#0B0F19' }}>
                <div className="code-header" style={{ padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.25)', fontSize: '0.85rem', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    Original Connected Flow Subgraphs
                </div>
                <div className="cfg-flow-area" style={{ flex: 1, padding: '32px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    {originalBlocks.length > 0 ? renderBlockFlow(originalBlocks) : <div style={{ padding: 20, color: '#E2E8F0' }}>No code layout detected.</div>}
                </div>
            </div>

            <div className="cfg-pane right" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#0B0F19' }}>
                <div className="code-header" style={{ padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.25)', fontSize: '0.85rem', color: '#94A3B8', borderBottom: '1px solid #334155' }}>
                    Modified Connected Flow Subgraphs
                </div>
                <div className="cfg-flow-area" style={{ flex: 1, padding: '32px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    {modifiedBlocks.length > 0 ? renderBlockFlow(modifiedBlocks) : <div style={{ padding: 20, color: '#E2E8F0' }}>No code layout detected.</div>}
                </div>
            </div>
        </div>
    );
}
