\# LLVM Pass Analyzer Dashboard



A full-stack, split-screen web application designed to visually display and analyze transformations of LLVM Internal Representation (IR) code across various optimization passes.



\## Tech Stack

\* React (v19) \& Vite (v8)

\* Python, FastAPI, \& Uvicorn

\* difflib (Python standard library)



\## Local Setup Instructions



\### 1. Backend Server Setup

cd backend

python -m venv venv

.\\venv\\Scripts\\Activate.ps1

pip install fastapi uvicorn

uvicorn main:app --reload



\### 2. Frontend Dashboard Setup

cd my-dashboard

npm install

npm run dev

