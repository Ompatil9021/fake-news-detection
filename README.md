# Fake-news-detaction-using--AI-Tools
Fake News Detector - An AI-powered tool to analyze and classify news articles for authenticity.  This project is a Software Engineering endeavor that uses Natural Language Processing (NLP) and Machine Learning to help users identify potentially fake news.

## Run locally (Windows PowerShell)

Follow these steps to clone, set up, and run both the backend (Flask) and frontend (static server) on Windows PowerShell. These commands are copy/paste-ready.

Prerequisites:
- Git installed and on PATH
- Python 3.10+ installed and on PATH
- (Optional) Chrome browser
- (Optional) Gemini API key for full AI functionality

1) Clone repository

```powershell
git clone https://github.com/Ompatil9021/Fake-news-detaction-using--AI-Tools.git
cd Fake-news-detaction-using--AI-Tools\gemini-detector
```

2) Backend (Flask) setup and run

Open a new PowerShell window and run:

```powershell
cd .\backend

# Create and activate virtual environment (one-time)
python -m venv venv
.\venv\Scripts\Activate.ps1

# If activation is blocked, run this for the current session only:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Optional env vars (for this session only):
$env:GEMINI_API_KEY = 'your_gemini_api_key_here'     # optional
$env:GEMINI_MODEL = 'models/gemini-2.5-flash'        # optional override
$env:FLASK_APP = 'app.py'
$env:FLASK_ENV = 'development'

# Start Flask backend
python -m flask run
```

Default backend address:
- http://127.0.0.1:5000

3) Frontend (static files) run

Open another PowerShell window and run:

```powershell
cd ..\frontend
python -m http.server 8000
```

Frontend URL (login page):
- http://localhost:8000/login.html

4) Quick workflow summary
- Terminal A (backend): activate venv → `python -m flask run`
- Terminal B (frontend): `python -m http.server 8000`
- Open `http://localhost:8000/login.html` in Chrome or your browser

5) Notes and troubleshooting
- If you see `Error: Failed to get analysis from Gemini API`, make sure `GEMINI_API_KEY` is set and valid. Check Flask console for available model messages.
- Dataset/model inference requires the local model files under `backend/ml_model/saved_model/`. These large binaries are not included in the GitHub upload due to size limits. Keep them locally if you want dataset inference to work.
- If you need to store large model files in the repo, use Git LFS (not configured by default).
- The database uses SQLite and will be created automatically on first run.

6) Start Chrome from PowerShell (optional)

```powershell
Start-Process "chrome" "http://localhost:8000/login.html"
```

---

If you want, I can add a small PowerShell script to start both servers, or help configure Git LFS for your model files. Tell me which you prefer and I'll add it.
