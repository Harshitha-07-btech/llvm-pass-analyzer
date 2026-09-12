# LLVM IR Pass Transformation Analyzer & Optimizer Dashboard

## 1. Project Overview
This project provides a full-stack, visually rich dashboard engineered to analyze and demystify the complex compiler optimization strategies utilized by LLVM. 

It acts as an interactive bridge between low-level machine code execution and human comprehensibility by featuring live side-by-side IR code diffing, AI-driven compiler pass explanations, and an interactive Control Flow Graph (CFG) basic-block visualization.

## 2. Key Features
* **Interactive Code Diffing:** Side-by-side comparison of LLVM IR before and after specific optimization passes, highlighting exactly which instructions were added (green) or removed (red).
* **✨ AI Optimization Insights:** Deep integration with the lightning-fast `gemini-3.6-flash` model API, acting as a personal compiler engineer to provide plain-English, jargon-free explanations of exactly what each pass accomplished logically.
* **Control Flow Graph (CFG) Visualization:** Parses raw LLVM IR logic into structured, interactive basic-block nodes perfectly mapped with predecessor tags and execution flow direction arrows to trace program control visually.

## 3. Prerequisites
Before attempting to run this local environment, ensure you have the following installed:
* **Python 3.10+** (Required for the FastAPI server and standard machine learning SDKs)
* **Node.js & npm** (Required for spinning up the Vite React frontend)
* *(Optional)* **Clang / LLVM toolchain** installed and mapped globally into your system path if you intend to compile fresh, custom C++ scripts locally.

## 4. Step-by-Step Setup & Running Guide

### Backend Server Setup
1. **Activate your Virtual Environment:**
   Open a terminal in the `backend/` folder and activate your Python `venv`:
   - On Windows: `venv\Scripts\activate`
   - On Mac/Linux: `source venv/bin/activate`

2. **Install Required Packages:**
   Run the following command to grab the core FastAPI and Gemini frameworks:
   ```bash
   pip install fastapi uvicorn google-genai python-dotenv
   ```

3. **Configure the AI Ecosystem:**
   Create a brand new `.env` file directly at the root of the `backend/` directory. Securely paste your official Gemini initialization string inside:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

4. **Start the API Server:**
   Launch the FastAPI framework mapping your logic at `localhost:8000`:
   ```bash
   uvicorn main:app --reload
   ```

### Log Generation (Compiler Automator)
The backend requires targeted optimization logs populated against its local cache before the frontend can render data correctly. 
Open a dedicated terminal pointing to the `backend/` directory and execute:
```bash
python automator.py
```
This forces the dummy `test_program.cpp` script to compile rapidly through `clang++`, aggressively hooking standard stderr to capture optimization trace paths and flawlessly passing them statically into the FastAPI server API endpoint logic!

### Frontend React Setup
1. **Initialize Dependencies:**
   Open a brand new terminal, seamlessly jump into your frontend workspace directory, and instruct npm to download your package tree:
   ```bash
   cd my-dashboard
   npm install
   ```

2. **Start the Vite Server:**
   Launch the ultra-fast Vite development server native instance:
   ```bash
   npm run dev
   ```
   
3. **Explore the App:**
   Open your browser natively to `http://localhost:5173` to interact with your dashboard!

## 5. How to Test the Features
* **Switch passes in the left sidebar:** Instantly observe how the original and modified IR differ as you iterate sequentially through LLVM execution states.
* **Click "Generate Optimization Insight":** Click this dedicated blue button natively while inspecting a pass to observe AI actively parsing your localized layout to give a stunning summary directly within the application!
* **Toggle the "Control Flow Graph (CFG)" tab:** Switch the visual context inside the top navigation panel above the viewer to watch standard monolithic IR strings logically burst apart into cleanly connected Basic Block execution pathways.
