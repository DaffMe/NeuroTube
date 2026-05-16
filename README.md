# 🧠 NeuroTube: High-Performance YouTube Sentiment Engine

<div align="center">

![NeuroTube Banner](https://img.shields.io/badge/NeuroTube-Sentiment_Analyzer-FF69B4?style=for-the-badge&logo=youtube&logoColor=white)

**Distributed microservices architecture for massive-scale YouTube comment analysis**  
*Powered by Google Antigravity AI*

[![GitHub Stars](https://img.shields.io/github/stars/DaffMe/NeuroTube?style=social)](https://github.com/DaffMe/NeuroTube)
[![GitHub Forks](https://img.shields.io/github/forks/DaffMe/NeuroTube?style=social)](https://github.com/DaffMe/NeuroTube)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)](https://go.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

</div>

---

## 📖 Table of Contents
- [🌟 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🖥️ User Interface Showcase](#-user-interface-showcase)
- [🏗️ Architecture](#-architecture)
- [🚀 Tech Stack](#-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start (Docker)](#-quick-start-docker)
- [🛠️ Development Guide (Local)](#-development-guide-local)
- [📖 API Reference](#-api-reference)
- [🧠 Sentiment Engine Deep Dive](#-sentiment-engine-deep-dive)
- [📝 Acknowledgments](#-acknowledgments)

---

## 🌟 Overview

**NeuroTube** is a professional-grade sentiment analysis platform designed to handle the high volume of engagement on modern YouTube videos. Built with a distributed architecture, it decouples data retrieval from intensive machine learning processing to ensure high availability and responsiveness.

The project leverages **Go** for high-speed concurrent fetching of thousands of comments (including nested replies) and **Python (FastAPI)** for sophisticated NLP analysis using an enhanced VADER engine.

---

## ✨ Key Features

- **🚀 Hybrid Microservices** - Combines the speed of **Go** for data fetching with the ML power of **Python**.
- **💬 Full Reply Retrieval** - Deep-dive analysis that captures every single nested reply, bypassing standard API limits through optimized pagination.
- **🧠 Advanced NLP Engine** - Sentiment engine specifically tuned for:
  - **YouTube Slang**: (rizz, gyatt, W/L, ratio, cooking).
  - **Gaming/Horror**: Context-aware analysis for intense emotional engagement.
  - **Artistic/Music**: Handles "moving" or "sad" comments as positive engagement (e.g., "cutting onions", "sobbing").
  - **Indonesian Context**: Built-in support for informal Indonesian sentiment (mantap, gokil, parah, nangis).
- **📊 Real-time Dashboard** - Interactive visualizations of sentiment distribution and engagement trends.
- **🕒 Persistent History** - Server-side storage using PostgreSQL to track and manage analysis history.
- **🐳 One-Command Deployment** - Fully containerized with Docker Compose for a seamless setup experience.

---

## 🖥️ User Interface Showcase

### 🏠 Landing Page
*A sleek, high-energy entrance for video submission.*
![Home Page](assets/ui_home.png)

### 📊 Analysis Dashboard
*Detailed sentiment breakdown, charts, and filtered comment lists.*
![Dashboard](assets/ui_dashboard.png)

---

## 🏗️ Architecture

NeuroTube uses an event-driven microservices pattern to ensure that slow ML processing never blocks the high-speed YouTube API ingestion.

```mermaid
graph TD
    User((User)) -->|YouTube URL| Frontend[React + Vite]
    Frontend -->|POST /api/analyze| Fetcher[Go Fetcher Service]
    Fetcher -->|Parallel Page Fetch| YT_API[YouTube Data API v3]
    Fetcher -->|Push Job Task| Redis[(Redis Broker)]
    Redis -->|Worker Pull| MLEngine[Python Worker]
    MLEngine -->|VADER Scoring| DB[(PostgreSQL)]
    Frontend -->|Poll Results| MLEngine
    MLEngine -->|History & Summaries| Frontend
```

---

## 🚀 Tech Stack

### ⚡ Data Retrieval (Fetcher)
- **Go (Golang)**: High-performance concurrency model for parallel API requests.
- **YouTube API v3**: Optimized for deep-thread comment recovery.
- **Redis**: Fast, persistent task queue for inter-service communication.

### 🧠 Sentiment Engine (ML Service)
- **Python 3.11 & FastAPI**: High-performance async Python framework.
- **VADER Sentiment**: Enhanced with a custom lexicon for social media nuances.
- **SQLModel (SQLAlchemy)**: Type-safe ORM for robust PostgreSQL interactions.
- **PostgreSQL**: Reliable relational storage for video metadata and sentiment results.

### 🎨 User Experience (Frontend)
- **React 19 & TypeScript**: The latest in type-safe UI development.
- **Tailwind CSS v4**: Cutting-edge utility-first styling.
- **Framer Motion**: Premium micro-animations and smooth transitions.
- **Recharts**: Responsive data visualization.
- **Bun**: Ultra-fast runtime and package management.

---

## 📁 Project Structure

```bash
NeuroTube/
├── 🐳 docker-compose.yml           # Full stack orchestration
├── 🔧 .env.example                 # Environment template
├── 🌐 frontend/                    # React (TS) + Tailwind v4
│   ├── 📁 src/components/          # UI Components (Framer Motion)
│   ├── 📁 src/hooks/               # Custom TanStack query hooks
│   └── 📁 src/services/            # API integration layer
├── 🐹 backend-fetcher/             # Go Service (The "Scraper")
│   ├── 📁 cmd/main.go              # Entry point & Chi Router
│   ├── 📁 internal/youtube/        # Logic for deep-thread retrieval
│   └── 📁 internal/queue/          # Redis task producer
├── 🐍 backend-ml/                  # Python Service (The "Brain")
│   ├── 📁 app/core/sentiment/      # Custom NLP Logic & Lexicon
│   ├── 📁 app/api/routes/          # FastAPI REST endpoints
│   ├── 📁 app/workers/             # Redis task consumer (ML logic)
│   └── 📁 app/models/              # SQLModel database schemas
└── 🗄️ postgres_data/               # Persistent database volume
```

---

## 🚀 Quick Start (Docker)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [YouTube API Key](https://console.cloud.google.com/)

### 2. Setup
```bash
git clone https://github.com/DaffMe/NeuroTube.git
cd NeuroTube
cp .env.example .env
# Edit .env and paste your YOUTUBE_API_KEY
```

### 3. Launch
```bash
docker compose up --build -d
```

### 4. Access
- **Frontend**: `http://localhost:5173`
- **Go API Docs**: `http://localhost:8080/api/health`
- **Python API Docs**: `http://localhost:8000/docs`

---

## 🛠️ Development Guide (Local)

If you wish to run the services manually without Docker:

### 🐍 Backend ML (Python)
```bash
cd backend-ml
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 🐹 Backend Fetcher (Go)
```bash
cd backend-fetcher
go mod download
go run cmd/main.go
```

### 🎨 Frontend (React)
```bash
cd frontend
bun install # or npm install
bun dev
```

---

## 📖 API Reference

### 🐹 Fetcher Service (Port 8080)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze` | Initiates a fetch job. Body: `{ "url": "..." }` |
| `GET` | `/api/status/{jobId}` | Checks the fetch/queue status |

### 🧠 ML Service (Port 8000)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analysis/{jobId}` | Returns the full analysis results |
| `GET` | `/api/analysis/video/{id}` | Gets latest cached analysis for a video |
| `GET` | `/api/history` | Lists previously analyzed videos |
| `GET` | `/api/comments/{id}` | Paginated comments with optional `?sentiment=positive` filter |
| `DELETE` | `/api/history` | Wipes all analysis data |

---

## 🧠 Sentiment Engine Deep Dive

Unlike generic sentiment analysis tools, NeuroTube utilizes a **Customized VADER Engine** specifically optimized for the nuances of modern digital discourse. The v2.0 algorithm implements several calibration layers to ensure high precision in complex social media environments.

### 📈 Benchmarked Accuracy
Validated against high-engagement cultural content (e.g., *Porter Robinson - Cheerleader*), NeuroTube demonstrates a sophisticated understanding of fan engagement, achieving a balanced and realistic sentiment distribution:
- **Positive (~48%)**: Captures expressive enthusiasm and fan support.
- **Neutral (~39%)**: Accurately classifies descriptive, timestamped, or discussion-oriented content that standard models often misinterpret.
- **Negative (~12%)**: Isolates genuine criticism and toxic discourse from general excitement.

### 🕹️ Context-Aware Heuristics
- **High-Arousal Engagement**: Traditional NLP often misclassifies terms like *"scary"*, *"insane"*, or *"screaming"* as negative. NeuroTube’s engine recognizes these as indicators of high-arousal positive engagement in gaming and horror contexts.
- **Linguistic Adaptability**: Our engine implements **Timestamp & Question Shields** to neutralize purely functional comments (e.g., "12:34 What is the song?"), preventing them from skewing emotional metrics.

### 🌏 Multilingual & Slang Optimization
- **Indonesian Lexicon (Bahasa Gaul)**: Native support for informal Indonesian sentiment, including hand-curated mappings for terms like `mantap`, `gokil`, and `parah` (as an intensifier).
- **Platform-Specific Vernacular**: Comprehensive support for evolving internet slang and YouTube-specific idioms:
  - **Competitive Slang**: `W`, `L`, `Ratio`, `Peak`, `Mid`.
  - **Emergent Vernacular**: `Rizz`, `Gyatt`, `Cooked`, `Cooking`.
  - **Status Indicators**: `GOAT`, `Legend`, `Underrated`.

---

## 📝 Acknowledgments

- **AI Development**: This project was built with the assistance of **Google Antigravity AI**.
- **Inspiration**: System design and concept inspired by [00200200's youtube-comment-sentiment-analyzer](https://github.com/00200200/youtube-comment-sentiment-analyzer).

---

<div align="center">
  <p>Built for the next generation of social media analysis.</p>
  <b>Developed by [DaffMe](https://github.com/DaffMe)</b>
</div>
