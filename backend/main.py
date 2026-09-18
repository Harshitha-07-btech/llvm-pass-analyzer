from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from google import genai
from dotenv import load_dotenv
import os
import difflib
import re
import subprocess

# Safely load the environment variables from the .env file
load_dotenv()

app = FastAPI()

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
        return [line.rstrip('\n') for line in f.readlines()]

def get_diffed_lines(before_lines: List[str], after_lines: List[str]):
    original_ir = []
    modified_ir = []
    lines_added = 0
    lines_removed = 0
    diff = list(difflib.ndiff(before_lines, after_lines))
    for line in diff:
        code = line[:2]
        text = line[2:]
        if code == '  ':
            original_ir.append({"text": text, "status": "neutral"})
            modified_ir.append({"text": text, "status": "neutral"})
        elif code == '- ':
            original_ir.append({"text": text, "status": "removed"})
            lines_removed += 1
        elif code == '+ ':
            modified_ir.append({"text": text, "status": "added"})
            lines_added += 1
        elif code == '? ':
            continue
    return original_ir, modified_ir, lines_added, lines_removed


def extract_blocks_from_diff(diff_lines: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    blocks = []
    current_block = {"id": "entry", "label": "entry", "instructions": [], "successors": []}
    
    def push_block():
        if current_block["instructions"] or current_block["label"] != "entry":
            if current_block["instructions"]:
                last_line = current_block["instructions"][-1]["text"].strip()
                if last_line.startswith("br ") or last_line.startswith("switch ") or last_line.startswith("invoke "):
                    matches = re.findall(r'label %([a-zA-Z0-9_.-]+)', last_line)
                    current_block["successors"] = matches
                elif last_line.startswith("ret "):
                    current_block["successors"] = ["Return"]
            blocks.append(current_block.copy())

    for line_obj in diff_lines:
        text = line_obj["text"].strip()
        if (text.endswith(':') and '=' not in text) or re.match(r'^[-a-zA-Z0-9_\.]+:$', text) or text.startswith('; <label>:'):
            push_block()
            clean_id = text.replace(':', '')
            current_block = {"id": clean_id, "label": text, "instructions": [], "successors": []}
        elif text != "":
            current_block["instructions"].append(line_obj)
            
    push_block()
    return blocks


@app.get("/api/passes")
def get_passes():
    return PASSES


@app.get("/api/pass/{pass_id}")
def get_pass_data(pass_id: int):
    pass_info = next((p for p in PASSES if p["id"] == pass_id), None)
    if not pass_info:
        raise HTTPException(status_code=404, detail="Pass not found")
        
    if "code_block" in pass_info:
        prev_info = next((p for p in PASSES if p["id"] == pass_id - 1), None)
        before_lines = prev_info["code_block"].split('\n') if prev_info else []
        after_lines = pass_info["code_block"].split('\n')
    else:
        before_file = f"pass_{pass_id}_before.ll"
        after_file  = f"pass_{pass_id}_after.ll"
        before_lines = read_file_lines(before_file)
        after_lines = read_file_lines(after_file)
        
    original_code, modified_code, added, removed = get_diffed_lines(before_lines, after_lines)
    
    original_blocks = extract_blocks_from_diff(original_code)
    modified_blocks = extract_blocks_from_diff(modified_code)
    
    return {
        "pass_id": pass_id,
        "pass_name": pass_info["name"],
        "lines_added": added,
        "lines_removed": removed,
        "net_change": added - removed,
        "original_code": original_code,
        "modified_code": modified_code,
        "cfg_data": {
             "original_blocks": original_blocks,
             "modified_blocks": modified_blocks
        }
    }


# ============================================================== #
# === NEW LOGIC: SCOREBOARD PIPELINE SUMMARY TARGET          === #
# ============================================================== #
@app.get("/api/optimization-summary")
def get_optimization_summary():
    summary_passes = []
    total_added = 0
    total_removed = 0
    total_net = 0
    
    for pass_info in PASSES:
        # Explicitly skip the foundational raw initialization dump map gracefully 
        if pass_info["id"] == 1 or pass_info["pass_name"] == "Raw Output":
            continue
            
        pass_id = pass_info["id"]
        
        # Grab immediately prior payload to diff exactly natively 
        prev_info = next((p for p in PASSES if p["id"] == pass_id - 1), None)
        before_lines = prev_info["code_block"].split('\n') if prev_info else []
        after_lines = pass_info["code_block"].split('\n')
        
        # Tap into existing diff processing module
        _, _, added, removed = get_diffed_lines(before_lines, after_lines)
        net = added - removed
        
        # Exclusively map optimization passes that actually mutated underlying compilation trees logically 
        if added > 0 or removed > 0:
            summary_passes.append({
                "id": pass_id,
                "passName": pass_info["pass_name"],
                "target": pass_info["target_function"],
                "added": added,
                "removed": removed,
                "net": net
            })
            total_added += added
            total_removed += removed
            total_net += net
            
    return {
        "passes": summary_passes,
        "totals": {
            "added": total_added,
            "removed": total_removed,
            "net": total_net
        }
    }


class LogPayload(BaseModel):
    logs: str = None
    raw_logs: str = None

@app.post("/api/upload-logs")
def upload_logs(payload: LogPayload):
    global PASSES
    content = payload.raw_logs if payload.raw_logs else payload.logs
    content_length = len(content) if content else 0
    
    if content:
        pattern = r"\*\*\* IR Dump After (.*?)\s*\*\*\*"
        parts = re.split(pattern, content)
        new_passes = []
        if len(parts) == 1:
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
    
    return {
        "status": "success",
        "message": f"Successfully received {content_length} characters and cached {len(PASSES)} passes."
    }

class CompilePayload(BaseModel):
    source_code: str

@app.post("/api/compile")
def compile_live_code(payload: CompilePayload):
    global PASSES
    
    script_path = os.path.join(os.path.dirname(__file__), 'live_test.cpp')
    with open(script_path, 'w') as f:
        f.write(payload.source_code)
        
    clang_path = "clang++" if os.name != "nt" else r"C:\Program Files\LLVM\bin\clang++.exe"
    
    try:
        process = subprocess.run(
            [clang_path, "-O3", "-mllvm", "-print-after-all", script_path, "-c"],
            capture_output=True,
            text=True,
            check=False
        )
        
        content = process.stderr
        
        if not content:
            raise HTTPException(status_code=500, detail="Compilation successfully executed, but LLVM completely failed to natively pipe expected tracking traces into STDERR! Verify compiler flags natively!")
            
        pattern = r"\*\*\* IR Dump After (.*?)\s*\*\*\*"
        parts = re.split(pattern, content)
        new_passes = []
        
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
        
        return {
            "status": "success", 
            "message": f"Natively compiled React code completely! Populated {len(PASSES)} targeted passes into the dashboard cache successfully."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Native compiler subprocess explicitly failed logic check. Verify Clang location exactly: {e}")


# ============================================================== #
# === NEW AI INTEGRATION LOGIC: EXPERT EXPLAINER ENDPOINT    === #
# ============================================================== #
class ExplainPayload(BaseModel):
    original_ir: str
    modified_ir: str

@app.post("/api/explain")
def explain_optimization(payload: ExplainPayload):
    try:
        client = genai.Client()
        
        prompt = f"""
You are a compiler expert. Look at this before and after LLVM IR code. Explain exactly what optimization the compiler performed here. Keep the explanation in very simple English, avoid heavy jargon, and use bullet points for clarity.

Before Optimization (Original IR):
{payload.original_ir}

After Optimization (Modified IR):
{payload.modified_ir}
"""
        
        # Access the universally available native standard model alias explicitly avoiding v1beta access drops
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        return {"explanation": response.text}
        
    except Exception as e:
        # Heavily expanded python-level exception wrapper explicitly filtering context hooks 
        error_str = str(e)
        if "API_KEY_INVALID" in error_str or "API key not valid" in error_str:
            detail_msg = "Invalid or Missing Google Gemini API Key. Please verify your .env file natively."
        else:
            detail_msg = f"Gemini AI SDK Execution failed: {error_str}"
            
        print(f"Gemini Exception Thrown: {detail_msg}")
        raise HTTPException(status_code=500, detail=detail_msg)
