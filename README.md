# TransAssist — Minimalist Translator Assistant

TransAssist is a modern, flat, ultra-minimalist web application designed to assist translators in translating novels, documents, and other text-based files line-by-line.

## 🚀 Key Features

* **Segmented Workspace**: Break down text line-by-line or sentence-by-sentence in a split-screen translation editor.
* **Drag-and-Drop Merging & Reordering**: Drag cells together to merge sentences for better contextual translations, or drag rows to reorder them.
* **Machine Translation (MT) Row**: Double-engine suggestions (Google Translate and MyMemory) display instantly on focus.
* **Integrated Glossary**: Highlights terms matching user glossary terms with quick-insert suggestion tags. Supports exporting and importing glossaries.
* **Auto-Save & Local Backups**: Automatically saves draft state to local storage. Export `.transassist` files for offline backups, or `.txt` for completed translation text.

---

## 📂 Project Structure

The project has been split into frontend and backend folders for clean service management and serverless deployment:

```text
TransAssist/
├── backend/                  # FastAPI Application
│   ├── main.py               # API endpoints (segmentation, Google & MyMemory translation)
│   ├── requirements.txt      # Python dependencies
│   └── vercel.json           # Vercel configuration for backend-only deployment
├── frontend/                 # Vue 3 (Vite) Application
│   ├── src/                  # Vue components, stores (Pinia), and styles (Tailwind v4)
│   │   ├── components/       # Workspace, Glossary, FileImport components
│   │   ├── stores/           # Pinia workspace state store
│   │   └── style.css         # Tailwind directives and custom overrides
│   ├── index.html            # Main SPA entrypoint & font setup
│   ├── package.json          # Node dependencies
│   └── vercel.json           # Vercel configuration for frontend-only deployment
├── dev.py                    # Root developer script to run both servers concurrently
├── vercel.json               # Root-level Vercel config for unified deployment
└── README.md                 # Project guide
```

---

## 💻 Local Development

### 1. Prerequisite Packages
Ensure you have Python 3.9+ and Node.js v18+ installed on your system.

### 2. Quick Launch
To run both the backend and frontend development servers concurrently:
```bash
python dev.py
```
This script will:
* Detect and use the virtual environment in `.venv/` (if it exists) to launch the FastAPI server at `http://localhost:8000`.
* Launch the Vite development server for the Vue frontend at `http://localhost:5173`.

Alternatively, you can run them in separate terminals:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Vercel Deployment

TransAssist is ready to deploy on Vercel. You can choose to deploy it in **one unified project** (simplest, avoids CORS configuration) or as **two separate projects** (standard frontend/backend split).

### Option A: Unified Project Deployment (Recommended)
This approach deploys the entire repository to a single Vercel URL. Static files are compiled, and all `/api/*` requests route internally to serverless Python handlers.

1. Install the Vercel CLI or log into [Vercel Dashboard](https://vercel.com).
2. Connect your Git repository (select the root directory `TransAssist`).
3. Vercel will automatically read the root-level [vercel.json](file:///D:/LT/TransAssist/vercel.json).
4. Deploy! The frontend and backend will be hosted on the same domain.

### Option B: Separate Project Deployment
Use this method to host the backend API and Vue frontend under separate domains.

#### 1. Deploy the Backend API
* Point your Vercel project to the `backend` folder as the Root Directory.
* Vercel will build the API using the `@vercel/python` serverless runtime according to the configuration in [backend/vercel.json](file:///D:/LT/TransAssist/backend/vercel.json).
* Note your deployed backend API URL (e.g., `https://transassist-api.vercel.app`).

#### 2. Deploy the Vue Frontend
* Point a second Vercel project to the `frontend` folder as the Root Directory.
* Configure the following Environment Variable in the Vercel Dashboard for the frontend project:
  * **Key**: `VITE_API_URL`
  * **Value**: `https://transassist-api.vercel.app` (your backend's Vercel URL, without a trailing slash)
* Deploy! The frontend will fetch suggestions from your dedicated backend API.
