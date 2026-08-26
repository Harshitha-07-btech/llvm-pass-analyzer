from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import difflib

app = FastAPI()

# Allow React frontend to fetch data without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock passes catalog
PASSES = [
    {"id": 1, "name": "Mem2Reg: Promote Memory to Register"},
    {"id": 2, "name": "InstCombine: Combine Instructions"}
]

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def read_file_lines(filename: str) -> List[str]:
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File {filename} not found.")
    with open(filepath, 'r') as f:
        # Read lines and strip trailing newlines to make diffing cleaner
        return [line.rstrip('\n') for line in f.readlines()]

def get_diffed_lines(before_lines: List[str], after_lines: List[str]):
    """
    Perform a unified diff and parse the results into structured objects.
    We return two explicitly labeled lists for Original and Modified IR.
    """
    original_ir = []
    modified_ir = []
    
    lines_added = 0
    lines_removed = 0
    
    # We use ndiff because it gives meticulous line-by-line differences
    diff = list(difflib.ndiff(before_lines, after_lines))
    
    for line in diff:
        code = line[:2]
        text = line[2:]
        
        if code == '  ': # Line is identical in both
            original_ir.append({"text": text, "status": "neutral"})
            modified_ir.append({"text": text, "status": "neutral"})
        elif code == '- ': # Line was removed from original
            original_ir.append({"text": text, "status": "removed"})
            lines_removed += 1
        elif code == '+ ': # Line was added to modified
            modified_ir.append({"text": text, "status": "added"})
            lines_added += 1
        elif code == '? ': # Intellisense hint from ndiff, skip it
            continue
            
    return original_ir, modified_ir, lines_added, lines_removed

@app.get("/api/passes")
def get_passes():
    """Endpoint serving the pass list for the Sidebar."""
    return PASSES

@app.get("/api/pass/{pass_id}")
def get_pass_data(pass_id: int):
    """Endpoint computing the diff between before/after IR for the requested pass."""
    # Check if pass exists in our mock data
    pass_info = next((p for p in PASSES if p["id"] == pass_id), None)
    if not pass_info:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    before_file = f"pass_{pass_id}_before.ll"
    after_file  = f"pass_{pass_id}_after.ll"
    
    before_lines = read_file_lines(before_file)
    after_lines = read_file_lines(after_file)
    
    original_code, modified_code, added, removed = get_diffed_lines(before_lines, after_lines)
    
    return {
        "pass_id": pass_id,
        "pass_name": pass_info["name"],
        "lines_added": added,
        "lines_removed": removed,
        "net_change": added - removed,
        "original_code": original_code,
        "modified_code": modified_code
    }
