import subprocess
import sys
import os
import time

def run_dev():
    print("==================================================")
    print("Starting TransAssist Development Environment...")
    print("==================================================")
    
    # Determine the project root directory
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Detect virtual environment python
    venv_python = os.path.join(root_dir, ".venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        # Fallback to system python if venv python doesn't exist
        venv_python = sys.executable
        print(f"[*] Virtual environment python not found at {venv_python}. Using system python: {sys.executable}")
    else:
        print(f"[*] Detected virtual environment python: {venv_python}")
        
    # 2. Start backend server (FastAPI on Port 8000)
    backend_cmd = [venv_python, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    backend_dir = os.path.join(root_dir, "backend")
    print(f"[*] Launching Backend: {' '.join(backend_cmd)} in {backend_dir}")
    backend_proc = subprocess.Popen(backend_cmd, cwd=backend_dir)
    
    # 3. Start frontend server (Vite on Port 5173)
    npm_cmd = "npm.cmd" if os.name == 'nt' else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_dir = os.path.join(root_dir, "frontend")
    print(f"[*] Launching Frontend: {' '.join(frontend_cmd)} in {frontend_dir}")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)
    
    print("\n[+] TransAssist is spinning up!")
    print("    - Backend API will be available at: http://localhost:8000")
    print("    - Frontend App will be available at: http://localhost:5173")
    print("    - Press Ctrl+C to terminate both servers.\n")
    
    try:
        # Keep main thread alive and monitor child processes
        while True:
            time.sleep(1)
            # If any process dies, stop the dev session
            if backend_proc.poll() is not None:
                print("[!] Backend server stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[!] Frontend server stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n[+] KeyboardInterrupt detected. Terminating development servers...")
    finally:
        # Gracefully terminate both processes
        backend_proc.terminate()
        frontend_proc.terminate()
        # Wait for processes to exit
        backend_proc.wait()
        frontend_proc.wait()
        print("[+] Development servers stopped. Goodbye!")

if __name__ == "__main__":
    run_dev()
