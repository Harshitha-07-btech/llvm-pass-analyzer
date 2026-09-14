import React, { useMemo } from 'react';

const extractBasicBlocks = (codeLines) => {
    if (!codeLines || codeLines.length === 0) return [];

    try {
        const blocks = [];
        let currentBlock = null;

        codeLines.forEach((lineObj) => {
            if (!lineObj || !lineObj.text) return;
            const text = lineObj.text.trim();
            if (!text) return;

            const labelMatch = text.match(/^([\w.-]+):/);
            const commentLabelMatch = text.match(/^;\s*<label>:([\w.-]+)/);
            const isLabel = labelMatch || commentLabelMatch;

            if (isLabel) {
                if (currentBlock && currentBlock.instructions.length > 0) {
                    blocks.push(currentBlock);
                }
                const labelName = labelMatch ? labelMatch[1] : commentLabelMatch[1];
                currentBlock = { id: labelName, label: labelName, instructions: [], successors: [], predecessors: '' };
            } else {
                if (text.startsWith('; Function') || text.startsWith('; ModuleID') || text.startsWith('source_filename')) return;

                if (!currentBlock) {
                    currentBlock = { id: 'entry', label: 'entry_block', instructions: [], successors: [], predecessors: '' };
                }
                currentBlock.instructions.push(lineObj);
            }
        });

        if (currentBlock && currentBlock.instructions.length > 0) blocks.push(currentBlock);

        blocks.forEach(block => {
            const lastLine = block.instructions[block.instructions.length - 1]?.text?.trim() || '';
            if (lastLine.startsWith('br ') || lastLine.startsWith('switch ') || lastLine.startsWith('invoke ')) {
                const matches = [...lastLine.matchAll(/label %([a-zA-Z0-9_.-]+)/g)];
                block.successors = matches.map(m => m[1]);
            } else if (lastLine.startsWith('ret ')) {
                block.successors = ['Return_Block'];
            }
        });

        return blocks;
    } catch (e) {
        console.error("Syntax parser actively failed:", e);
        return [];
    }
};

const BlockCard = ({ block, isModified }) => {
    const borderColor = isModified ? '#3B82F6' : '#94A3B8';
    return (
        <div style={{
            backgroundColor: '#1E293B',
            color: '#E2E8F0',
            border: `2px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
            fontFamily: 'monospace',
            fontSize: '13px',
            width: '100%',
        }}>
            <div style={{
                fontWeight: 800,
                color: borderColor,
                marginBottom: '10px',
                borderBottom: `1px solid ${borderColor}`,
                paddingBottom: '8px',
                fontSize: '14px'
            }}>
                {isModified ? 'AFTER:' : 'BEFORE:'} {block.label}
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                {block.instructions && block.instructions.map((inst, i) => (
                    <div key={i} style={{
                        color: inst.status === 'added' ? '#34D399' : inst.status === 'removed' ? '#F87171' : '#E2E8F0',
                        textDecoration: inst.status === 'removed' ? 'line-through' : 'none',
                        whiteSpace: 'pre-wrap',
                        padding: '3px 4px',
                        backgroundColor: inst.status === 'added' ? 'rgba(52, 211, 153, 0.1)' : inst.status === 'removed' ? 'rgba(248, 113, 113, 0.1)' : 'transparent'
                    }}>
                        {inst.text}
                    </div>
                ))}
            </div>
            {block.successors && block.successors.length > 0 && (
                <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #334155',
                    color: '#94A3B8',
                    fontSize: '12px'
                }}>
                    <strong>Branches to:</strong> {block.successors.join(', ')}
                </div>
            )}
        </div>
    );
};

export default function ControlFlowGraph({ originalCode = [], modifiedCode = [] }) {
    const originalBlocks = useMemo(() => extractBasicBlocks(originalCode), [originalCode]);
    const modifiedBlocks = useMemo(() => extractBasicBlocks(modifiedCode), [modifiedCode]);

    return (
        <div style={{
            width: '100%',
            height: '700px',
            backgroundColor: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                height: '100%',
                padding: '24px',
                overflow: 'hidden'
            }}>
                {/* Original Blocks Column */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <h3 style={{ color: '#94A3B8', marginBottom: '16px', letterSpacing: '1px', fontSize: '14px', textTransform: 'uppercase' }}>Original Control Flow Graph</h3>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                        {originalBlocks.length > 0 ? (
                            originalBlocks.map((block, idx) => (
                                <BlockCard key={`orig-${idx}`} block={block} isModified={false} />
                            ))
                        ) : (
                            <div style={{ color: '#64748B', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                                No valid basic blocks detected.
                            </div>
                        )}
                    </div>
                </div>

                {/* Modified Blocks Column */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <h3 style={{ color: '#3B82F6', marginBottom: '16px', letterSpacing: '1px', fontSize: '14px', textTransform: 'uppercase' }}>Modified Control Flow Graph</h3>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                        {modifiedBlocks.length > 0 ? (
                            modifiedBlocks.map((block, idx) => (
                                <BlockCard key={`mod-${idx}`} block={block} isModified={true} />
                            ))
                        ) : (
                            <div style={{ color: '#64748B', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                                No valid basic blocks detected.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
