import os
import subprocess
import requests
import sys

def main():
    cpp_file = "test_program.cpp"
    
    # 1. Automatically create a dummy C++ file if it doesn't exist natively.
    if not os.path.exists(cpp_file):
        print(f"Creating dummy C++ program: {cpp_file}...")
        with open(cpp_file, "w") as f:
            f.write("""#include <iostream>

int main() {
    int a = 5;
    int b = 10;
    int c = a + b * 2;
    std::cout << "Optimization Target Result: " << c << std::endl;
    return 0;
}
""")

    print(f"Running clang++ optimization passes on {cpp_file}...")
    
    # 2. Run the clang++ compiler ensuring LLVM dumps all optimization passes
    cmd = [r"C:\Program Files\LLVM\bin\clang++.exe", "-O2", "-mllvm", "-print-after-all", cpp_file]
    
    try:
        # LLVM natively pipes -print-after-all optimization logs straight to stderr
        result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        logs = result.stderr
        
        if not logs:
            print("No output was captured from the compiler's stderr. Ensure clang++ is correctly utilized.")
            sys.exit(1)
            
        print(f"Successfully captured {len(logs)} characters of compiler logs. Uploading to backend API...")
        
        # 3. Form payload and dispatch via POST
        url = "http://127.0.0.1:8000/api/upload-logs"
        payload = {"logs": logs}
        
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            print("Successfully uploaded the LLVM logs to your dashboard backend!")
        else:
            print(f"Failed to upload logs. HTTP Status {response.status_code}: {response.text}")
            
    except FileNotFoundError:
        print("Error: The 'clang++' compiler was not found. Please verify it is successfully installed and available on your PATH.")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to your FastAPI backend: {e}")
        # Hint: make sure the backend uvicorn server is running locally on port 8000
        sys.exit(1)

if __name__ == "__main__":
    main()
