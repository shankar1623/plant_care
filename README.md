# 🌾 PlantCare
## 📑 Table of Contents
1. [Features Overview](#-features-overview)
2. [Folder Structure & File Details](#-folder-structure--file-details)
3. [Required API Keys & Configuration](#-required-api-keys--configuration)
4. [How to Download / Clone the Repository](#-how-to-download--clone-the-repository)
5. [How to Install and Run](#-how-to-install-and-run)
   - [Backend Setup](#1-backend-setup-fastapi)
   - [Frontend Setup](#2-frontend-setup-react--vite)
6. [Core Feature Breakdown](#-core-feature-breakdown)
7. [API Documentation](#-api-documentation)

## 🌟 Features Overview

- 🌿 **Instant Leaf Disease Diagnosis**: Pre-trained deep learning CNN (`model.h5`) classifies 38 plant and disease conditions.
- 🔬 **OpenCV Tissue Damage Area Segmentation**: Automatically isolates diseased leaf tissue from healthy green areas and calculates exact damage percentage (`0% - 100%`).
- 🔁 **Dynamic Multi-Day Treatment Loop (3-Day Cycle)**: Tracks recovery stages (Day 0 → Day 3 → Day 6 → Day 9...). Automatically tests medicine response and dynamically switches to alternative sprays if the pathogen is tolerant, or alerts the farmer if damage increases.
- 🏥 **Nearest Agricultural Clinic Directory**: Built-in directory of verified Krishi Vigyan Kendras (KVKs), ADA offices, and plant pathologists filtered within a strict 30 km radius with real-time GPS distance calculation, direct phone calling, and Google Maps navigation.
- 📡 **30 km Community Outbreak Radar**: Geospatial clustering engine that monitors diseases across local farms. When 3 or more farms report the same pathogen within 30 km in a 7-day rolling window, a high-priority outbreak alert is broadcasted with preventive spray recommendations.
- 🤖 **Multilingual AI Doctor Chatbot**: Powered by Groq LLM and grounded in an agricultural treatment database. Supports 8 Indian languages (English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी, বাংলা) with high-quality natural female voice text-to-speech.
- 📚 **Case History & Healing Archives**: Searchable farm archive of all past diagnoses, completed treatment loops, and multi-stage healing photographs.
- 📱 **Fully Responsive Design**: Adaptive layout optimized for smartphones, tablets, laptops, and desktop computers.

---

## 📂 Folder Structure & File Details

```
plant_care/
├── .gitignore                   # Prevents committing API keys, caches, venv, and node_modules
├── README.md                    # Comprehensive documentation and setup guide
│
├── backend/                     # FastAPI Backend Server & Machine Learning Engine
│   ├── .env                     # Private environment variables (API keys & DB URL)
│   ├── .env.example             # Template file showing required environment variables
│   ├── requirements.txt         # Python dependencies list
│   ├── clear_database.py        # Utility script to safely wipe test database records
│   ├── migrate_db.py            # Database schema migration script
│   │
│   ├── app/                     # Backend Application Source Code
│   │   ├── auth.py              # Clerk authentication verification & development user support
│   │   ├── config.py            # Application settings & environment variable loaders
│   │   ├── database.py          # SQLAlchemy database engine and session configuration
│   │   ├── main.py              # FastAPI app initialization, CORS, routers & startup warmup
│   │   │
│   │   ├── data/                # Agricultural & Model Knowledge Databases
│   │   │   ├── class_names.json # List of 38 plant and disease classes corresponding to model.h5
│   │   │   └── medicines.json   # Curated dosages, spray intervals, precautions, and alternates
│   │   │
│   │   ├── models/              # SQLAlchemy Database Tables
│   │   │   └── __init__.py      # Schema definitions (User, Diagnosis, TreatmentPlan, Checkin, OutbreakAlert)
│   │   │
│   │   ├── routers/             # FastAPI REST Endpoints
│   │   │   ├── chat.py          # /api/chat - AI Crop Doctor multilingual chat endpoint
│   │   │   ├── dashboard.py     # /api/dashboard - Metrics, recent loops & GPS location updates
│   │   │   ├── detect.py        # /api/detect - Leaf image upload, CNN inference & damage segmentation
│   │   │   ├── outbreak.py      # /api/outbreak - 30 km geospatial outbreak cluster radar
│   │   │   └── treatment.py     # /api/treatment - Day 0 start, 3-day check-ins, medicine switching
│   │   │
│   │   ├── schemas/             # Pydantic Request & Response Validation Schemas
│   │   │   └── __init__.py      # Input/output data models for all API routes
│   │   │
│   │   └── services/            # Business Logic & Core Algorithms
│   │       ├── compare.py       # Compares day-to-day check-in damage and determines medicine reaction
│   │       ├── damage.py        # OpenCV HSV color-space segmentation for leaf damage % calculation
│   │       ├── llm.py           # Groq LLM integration with agricultural prompt grounding
│   │       ├── outbreak_rules.py# Haversine 30 km radius clustering algorithm (3 farms / 7 days)
│   │       ├── plant_validator.py# Verifies uploaded image contains actual plant/leaf foliage
│   │       ├── predictor.py     # Keras CNN model loader and pre-processing pipeline
│   │       └── weather.py       # Reverse geocoding & farm location name resolution
│   │
│   ├── ml/                      # Machine Learning Model Storage
│   │   └── model.h5             # Pre-trained CNN weights for 38 leaf disease classes
│   │
│   └── uploads/                 # Storage for user-uploaded leaf check-in photos
│
└── frontend/                    # React 18 + Vite + Tailwind CSS Single Page Application
    ├── .env                     # Frontend environment variables
    ├── .env.example             # Frontend environment variables template
    ├── index.html               # Main HTML entry file with responsive viewport configurations
    ├── package.json             # Frontend dependencies & npm run scripts
    ├── postcss.config.js        # PostCSS configuration for Tailwind CSS
    ├── tailwind.config.js       # Tailwind theme colors (forest, cream, surface) & breakpoints
    ├── vite.config.js           # Vite dev server and build bundler configuration
    │
    └── src/                     # Frontend Application Source Code
        ├── App.jsx              # Main React component, routing state & Clerk authentication
        ├── main.jsx             # React DOM mounting entry point
        ├── index.css            # Global CSS styles, themes (forest/cream), and mobile adaptations
        │
        ├── api/                 # API Communication Layer
        │   └── client.js        # Axios instance with auth token interceptors & API helpers
        │
        ├── components/          # Reusable UI Components
        │   ├── BottomNav.jsx    # Thumb-friendly bottom navigation bar for mobile devices
        │   ├── DamageBar.jsx    # Visual animated progress bar for leaf damage percentages
        │   ├── MedicineCard.jsx # Formatted card displaying medicine dosages, intervals & precautions
        │   └── Navbar.jsx       # Adaptive navigation bar with notifications and user profile
        │
        ├── i18n/                # Internationalization
        │   └── translations.js  # Multilingual UI labels (English, Hindi, Tamil, Telugu, Kannada)
        │
        ├── pages/               # Application View Pages
        │   ├── Chat.jsx         # AI Doctor chat page with 8 languages and female voice TTS
        │   ├── Dashboard.jsx    # Overview dashboard, outbreak alerts, stats & quick actions
        │   ├── History.jsx      # Case history archives of past scans and treatment loops
        │   ├── Landing.jsx      # Public welcome landing page with feature cards
        │   ├── Outbreak.jsx     # Outbreak radar page showing active regional disease clusters
        │   ├── Scan.jsx         # Leaf scanning, live camera capture, and instant diagnosis view
        │   └── TreatmentLoop.jsx# Multi-day recovery tracker, check-ins, and Nearest Clinic directory
        │
        └── services/            # Client-Side Utilities
            └── location.js      # Browser GPS coordinate detection and reverse-geocoding sync
```

---

## 🔑 Required API Keys & Configuration

PlantCare uses a few cloud services for full functionality. **All of them offer 100% free developer tiers.**

| Service | Key Name | Purpose | Where to Get (Free) |
| :--- | :--- | :--- | :--- |
| **Groq Cloud** | `GROQ_API_KEY` | Powers the AI Doctor Chatbot with fast inference | [console.groq.com/keys](https://console.groq.com/keys) |
| **Clerk Auth** | `VITE_CLERK_PUBLISHABLE_KEY`<br>`CLERK_SECRET_KEY` | User sign-in, account isolation & authentication | [dashboard.clerk.com](https://dashboard.clerk.com) |
| **Neon PostgreSQL** | `DATABASE_URL` | Persistent cloud database for farms & treatment loops | [neon.tech](https://neon.tech) |
| **OpenWeatherMap** | `OPENWEATHER_API_KEY` | (Optional) Precise reverse-geocoded farm location name | [openweathermap.org/api](https://openweathermap.org/api) |

> 💡 **Note on Database:** If you leave `DATABASE_URL` empty or commented out, the backend automatically falls back to a local SQLite database (`plantcare.db`), allowing you to test offline without needing a cloud database!

---

## 📥 How to Download / Clone the Repository

### Option A: Using Git (Recommended)
Open your terminal or command prompt and clone the repository:
```bash
git clone https://github.com/your-username/plantcare.git
cd plantcare
```

### Option B: Download as ZIP
1. Click the green **Code** button on GitHub.
2. Select **Download ZIP**.
3. Extract the downloaded folder to your computer (e.g., `D:\plant_care`).
4. Open the folder in **VS Code** or your preferred IDE.

---

## 🚀 How to Install and Run

### Prerequisites
Before running, make sure you have the following installed on your computer:
* **Python 3.10 or 3.11** — [Download Python](https://www.python.org/downloads/)
* **Node.js 18 or higher & npm** — [Download Node.js](https://nodejs.org/)
* **Git** — [Download Git](https://git-scm.com/)

---

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. (Recommended) Create and activate a Python virtual environment:
   ```bash
   # On Windows (PowerShell / Command Prompt)
   python -m venv venv
   .\venv\Scripts\activate

   # On macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration file:
   ```bash
   # Copy the example template
   cp .env.example .env
   ```
   Open `backend/.env` in your editor and insert your keys:
   ```env
   # PostgreSQL URL (or leave empty to use local SQLite)
   DATABASE_URL=postgresql://user:password@ep-your-db.aws.neon.tech/neondb?sslmode=require

   # Groq API Key (Required for AI Chatbot)
   GROQ_API_KEY=gsk_your_groq_api_key_here

   # Clerk Authentication Keys (Optional if running in local dev mode)
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
   CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

   # OpenWeatherMap Key (Optional)
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```

5. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

   * The backend will start at: **`http://localhost:8000`**
   * Live Swagger API documentation: **`http://localhost:8000/docs`**
   * Health check endpoint: **`http://localhost:8000/api/health`**

---

### 2. Frontend Setup (React + Vite)

1. Open a **new terminal tab** and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install JavaScript dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file:
   ```bash
   # Copy the example template
   cp .env.example .env
   ```
   Open `frontend/.env` in your editor:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
   VITE_API_URL=http://localhost:8000
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

   * The web application will launch at: **`http://localhost:5173`**
   * Open **`http://localhost:5173`** in your browser.

---

## 🌿 Core Feature Breakdown

### 1. Leaf Disease Scan (`/scan`)
- Upload an existing photo or capture a live photo directly with your device's camera.
- The CNN deep learning model (`model.h5`) predicts the plant species and specific disease condition across 38 classes.
- OpenCV calculates the percentage of affected leaf tissue.
- Instantly presents the diagnosed disease, neural network confidence, humanized farm precautions, and medicine prescriptions.
- Tap **"Start Treatment (Day 0)"** to begin a monitored recovery loop.

### 2. Treatment Loop Tracker (`/treatment`)
- Operates on a standard **3-day agricultural cycle** (Day 0, Day 3, Day 6, Day 9...).
- At each stage, the farmer uploads a new photo of the recovering leaf:
  - **Damage Decreased**: Confirms the medicine is working and advises continuing the spray schedule.
  - **Damage Unchanged (Tolerance)**: Automatically alerts that the pathogen is not reacting and switches to an alternative medicine.
  - **Damage Increased**: Flags aggressive pathogen spread, halts foliar spraying, and triggers the **Nearest Clinic** emergency button.
  - **0% Damage**: Celebrates full crop recovery, archives the record, and concludes the loop.

### 3. Nearest Clinic Directory
- Located inside the Treatment Loop emergency view.
- Automatically calculates real-time distance using Haversine GPS mathematics.
- Lists government Krishi Vigyan Kendras, Assistant Directors of Agriculture, and plant pathology clinics within 30 km.
- Provides direct **"Call Doctor"** phone dialer buttons and **"Directions"** via Google Maps.

### 4. 30 km Outbreak Radar (`/outbreak`)
- Monitors reports within a 30 km radius of the farm's live coordinates.
- If 3 separate farms report the same disease within a 7-day rolling window, the system flags a disease cluster.
- Displays the closest reporting farm distance and recommends preventive sprays before spores reach neighboring crops.

### 5. Multilingual AI Crop Doctor (`/chat`)
- Chat interface connected to Groq LLM.
- Grounded in vetted agricultural dosage rates, spray intervals, and safety precautions.
- Supports 8 languages: English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, and Bengali.
- Features a **"Listen (Female Voice)"** button that synthesizes answers into clean spoken regional audio.

### 6. Case History & Archives (`/history`)
- Comprehensive chronological record of all past leaf scans and completed treatment loops.
- Includes quick search by plant name or disease.
- View multi-stage photo progression showing the complete journey from diseased leaf to 0% cured foliage.

---

## 📡 API Documentation

Once the backend is running, open **`http://localhost:8000/docs`** in your browser to explore interactive Swagger documentation:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, database connectivity & model verification |
| `POST` | `/api/detect` | Upload leaf image for disease diagnosis & damage % |
| `GET` | `/api/detect/history` | Retrieve user's historical leaf scan diagnoses |
| `POST` | `/api/treatment/start` | Initialize Day 0 treatment plan for a diagnosis |
| `POST` | `/api/treatment/checkin`| Upload Day 3/6/9 follow-up photo & evaluate response |
| `GET` | `/api/treatment` | Fetch active and archived treatment plans |
| `POST` | `/api/treatment/{id}/done`| Mark a treatment plan as completed and archived |
| `GET` | `/api/outbreak/alerts` | Get 30 km active disease outbreak clusters |
| `POST` | `/api/chat` | Send question to multilingual AI Agri Doctor |
| `POST` | `/api/dashboard/user/location`| Update live farm coordinates and reverse-geocode city |
| `GET` | `/api/dashboard/stats` | Fetch aggregate counts for dashboard summary |

---

## 🛠️ Tech Stack

* **Machine Learning**: TensorFlow, Keras (`model.h5`), OpenCV, NumPy
* **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pydantic, Uvicorn, Groq API
* **Database**: PostgreSQL (Neon Serverless) / SQLite (Local Fallback)
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios
* **Authentication**: Clerk React SDK & Clerk Backend JWT Verification

---
