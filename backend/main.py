from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import difflib
import re

app = FastAPI()

# Allow React frontend to fetch data without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic passes catalog cache
PASSES = []

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
    pass_info = next((p for p in PASSES if p["id"] == pass_id), None)
    if not pass_info:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    if "code_block" in pass_info:
        # Dynamically determine 'before' lines based on the previous pass memory
        prev_info = next((p for p in PASSES if p["id"] == pass_id - 1), None)
        before_lines = prev_info["code_block"].split('\n') if prev_info else []
        after_lines = pass_info["code_block"].split('\n')
    else:
        # Fallback to the hardcoded text files for mock data
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

class LogPayload(BaseModel):
    # Support 'raw_logs' or 'logs' depending on frontend execution preferences
    logs: str = None
    raw_logs: str = None

@app.post("/api/upload-logs")
def upload_logs(payload: LogPayload):
    global PASSES
    content = payload.raw_logs if payload.raw_logs else payload.logs
    content_length = len(content) if content else 0
    
    # Standard output explicitly confirming to standard UI flow
    print(f"\n[SERVER] Successfully received LLVM log payload! Total characters: {content_length}")
    
    if content:
        # More flexible match pattern parsing all available pass headers
        pattern = r"\*\*\* IR Dump After (.*?)\s*\*\*\*"
        parts = re.split(pattern, content)
        
        new_passes = []
        
        if len(parts) == 1:
            # Fallback for unformatted raw dumps
            new_passes.append({
                "id": 1,
                "name": "Raw LLVM Dump (Unparsed)",
                "pass_name": "Raw Output",
                "target_function": "Unknown",
                "code_block": content.strip()
            })
        else:
            pass_id_counter = 1
            for i in range(1, len(parts), 2):
                if i + 1 < len(parts):
                    full_pass_desc = parts[i].strip()
                    code_block = parts[i+1].strip()
                    
                    if " on " in full_pass_desc:
                        p_name, t_func = full_pass_desc.split(" on ", 1)
                    else:
                        p_name = full_pass_desc
                        t_func = "module"
                        
                    new_passes.append({
                        "id": pass_id_counter,
                        "name": full_pass_desc,
                        "pass_name": p_name.strip(),
                        "target_function": t_func.strip(),
                        "code_block": code_block
                    })
                    pass_id_counter += 1
                
        PASSES = new_passes
        print(f"[SERVER] Regex mapped {len(PASSES)} individual passes into structured JSON.")
    
    return {
        "status": "success",
        "message": f"Successfully received {content_length} characters and cached {len(PASSES)} passes."
    }
