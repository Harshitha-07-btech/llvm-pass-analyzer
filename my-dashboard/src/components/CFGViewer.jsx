import React from 'react';

// Advanced parser dynamically identifying LLVM control flow branch points inside text segments
const extractBasicBlocks = (codeLines) => {
    const blocks = [];
    let currentBlock = { id: 'entry', label: 'entry_block', instructions: [], successors: [], predecessors: '' };

    const pushBlock = () => {
        if (currentBlock.instructions.length > 0 || currentBlock.label !== 'entry_block') {
            // Intelligently parse the very last terminator instruction to capture control flow hooks
            if (currentBlock.instructions.length > 0) {
                const lastLine = currentBlock.instructions[currentBlock.instructions.length - 1].text.trim();
                if (lastLine.startsWith('br ') || lastLine.startsWith('switch ') || lastLine.startsWith('invoke ')) {
                    const matches = [...lastLine.matchAll(/label %([a-zA-Z0-9_.-]+)/g)];
                    currentBlock.successors = matches.map(m => m[1]);
                } else if (lastLine.startsWith('ret ')) {
                    currentBlock.successors = ['Return / Exit Context'];
                }
            }
            blocks.push(currentBlock);
        }
    };

    codeLines.forEach((lineObj) => {
        const text = lineObj.text.trim();

        // Accurately capture standard LLVM labels like '1:', 'entry:', or comment metadata like '; <label>:12:'
        const labelMatch = text.match(/^([\w.-]+):/);
        const commentLabelMatch = text.match(/^;\s*<label>:([\w.-]+)/);

        if (labelMatch || commentLabelMatch) {
            pushBlock();

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

        } else if (text !== "") {
            currentBlock.instructions.push(lineObj);
        }
    });

    pushBlock();
    return blocks;
};

export default function CFGViewer({ originalCode, modifiedCode }) {
    const originalBlocks = extractBasicBlocks(originalCode);
    const modifiedBlocks = extractBasicBlocks(modifiedCode);

    const renderBlockFlow = (blocks) => {
        return blocks.map((block, idx) => (
            <React.Fragment key={idx}>
                <div className="cfg-node">
                    {/* Enhanced Node Title with Predecessor Metadata */}
                    <div className="cfg-node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                    {/* Logic Area */}
                    <div className="cfg-node-content">
                        {block.instructions.map((line, i) => (
                            <div key={i} className={`cfg-node-line ${line.status}`}>
                                {line.text}
                            </div>
                        ))}
                    </div>

                    {/* New Advanced Control Flow Metadata Footer */}
                    <div className="cfg-node-footer">
                        <span style={{ color: '#94A3B8', fontWeight: 600 }}>Outgoing Control Flow Branches: </span>
                        {block.successors.length > 0 ? (
                            block.successors.map((succ, i) => (
                                <span key={i} className="succ-tag">
                                    {succ.includes('Return') ? '⏹ ' + succ : `↪ %${succ}`}
                                </span>
                            ))
                        ) : (
                            <span className="succ-tag">No Branches / Sequential Fallthrough</span>
                        )}
                    </div>
                </div>

                {/* Draw a distinct SVG directional arrow connecting sequentially down to the next conceptual basic block */}
                {idx < blocks.length - 1 && (
                    <div className="cfg-arrow-connector">
                        <svg width="30" height="50" viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 0L15 45" stroke="#475569" strokeWidth="4" strokeDasharray="6 4" />
                            <path d="M15 50L7 38H23L15 50Z" fill="#38bdf8" />
                        </svg>
                    </div>
                )}
            </React.Fragment>
        ));
    };

    return (
        <div className="split-screen-wrapper">
            <div className="cfg-pane left">
                <div className="code-header">Original Connected Flow Subgraphs</div>
                <div className="cfg-flow-area">
                    {originalBlocks.length > 0 ? renderBlockFlow(originalBlocks) : <div style={{ padding: 20 }}>No code layout detected.</div>}
                </div>
            </div>

            <div className="cfg-pane right">
                <div className="code-header">Modified Connected Flow Subgraphs</div>
                <div className="cfg-flow-area">
                    {modifiedBlocks.length > 0 ? renderBlockFlow(modifiedBlocks) : <div style={{ padding: 20 }}>No code layout detected.</div>}
                </div>
            </div>
        </div>
    );
}
