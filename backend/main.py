from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from google import genai
from dotenv import load_dotenv
import os
import difflib
import re

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


# ============================================================== #
# === NATIVE CFG BASIC BLOCK PARSER LOGIC FOR THE ENDPOINT   === #
# ============================================================== #
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
        # Identify standard LLVM label markers mapped cleanly against diff outputs
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
    """Endpoint serving the cached dynamic pass list for the UI Sidebar."""
    return PASSES


@app.get("/api/pass/{pass_id}")
def get_pass_data(pass_id: int):
    """Endpoint isolating the correct code payload for the requested pass."""
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
    
    # Parse native blocks dynamically and securely on the backend server engine!
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


class LogPayload(BaseModel):
    logs: str = None
    raw_logs: str = None

@app.post("/api/upload-logs")
def upload_logs(payload: LogPayload):
    global PASSES
    content = payload.raw_logs if payload.raw_logs else payload.logs
    content_length = len(content) if content else 0
    print(f"\n[SERVER] Received target LLVM log payload! Total characters: {content_length}")
    
    if content:
        # More flexible match pattern parsing all available pass headers
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
        print(f"[SERVER] Regex mapped {len(PASSES)} individual passes into structured JSON.")
    
    return {
        "status": "success",
        "message": f"Successfully received {content_length} characters and cached {len(PASSES)} passes."
    }

# ============================================================== #
# === NEW AI INTEGRATION LOGIC: EXPERT EXPLAINER ENDPOINT ===    #
# ============================================================== #
class ExplainPayload(BaseModel):
    original_code: List[Dict[str, Any]]
    modified_code: List[Dict[str, Any]]

@app.post("/api/explain")
def explain_optimization(payload: ExplainPayload):
    try:
        # Natively reads the GEMINI_API_KEY from os environment 
        client = genai.Client()
        
        # Safely scrape only the targeted logic to keep formatting perfect 
        removed_lines = [line['text'] for line in payload.original_code if line.get('status') == 'removed']
        added_lines = [line['text'] for line in payload.modified_code if line.get('status') == 'added']
        
        prompt = f"""
        You are an elite C++ compiler engineer instructing a student analyzing LLVM optimization passes.
        
        Here are the exact Intermediate Representation (IR) instructions REMOVED:
        {chr(10).join(removed_lines) if removed_lines else "None"}
        
        Here are the exact IR instructions ADDED:
        {chr(10).join(added_lines) if added_lines else "None"}
        
        Please explain exactly what this specific compiler optimization pass did based on these code modifications. Respond in extremely simple, practical, and heavily jargon-free English so a junior beginner understands immediately. Keep it beautifully concise.
        """
        
        # Access the ultra-fast flash model via prompt injection
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
        )
        return {"explanation": response.text}
        
    except Exception as e:
        print(f"Gemini Exception Thrown: {e}")
        # Return generic 500 error passing standard python exception
        raise HTTPException(status_code=500, detail=str(e))
