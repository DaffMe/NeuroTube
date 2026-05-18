# <img src="assets/favicon.png" width="32" height="32" valign="middle" /> NeuroTube: High-Performance YouTube Sentiment Engine

<div align="center">

![NeuroTube Banner](https://img.shields.io/badge/NeuroTube-Sentiment_Analyzer-FF69B4?style=for-the-badge&logo=youtube&logoColor=white)

**Distributed microservices architecture for massive-scale YouTube comment analysis**  
*Powered by Google Antigravity AI*

[![GitHub Stars](https://img.shields.io/github/stars/DaffMe/NeuroTube?style=for-the-badge&color=blue&logo=github)](https://github.com/DaffMe/NeuroTube)
[![GitHub Forks](https://img.shields.io/github/forks/DaffMe/NeuroTube?style=for-the-badge&color=purple&logo=github)](https://github.com/DaffMe/NeuroTube)

<p align="center">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</p>

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

**NeuroTube** is a sophisticated sentiment intelligence platform engineered to analyze high-volume audience engagement on YouTube. By leveraging a distributed microservices architecture, the system maintains high availability while processing complex NLP tasks at scale.

The pipeline integrates a high-performance **Go** service for concurrent data ingestion and a **Python-based FastAPI** engine for deep sentiment scoring. This ensures that even videos with tens of thousands of comments are analyzed with minimal latency and high accuracy.

---

## ✨ Key Features

- **🚀 Scalable Microservices Architecture** - Orchestrated decoupling of high-speed data ingestion (Go) and compute-intensive NLP processing (Python).
- **💬 Deep-Thread Ingestion** - Advanced pagination logic to ensure comprehensive retrieval of nested replies, bypassing standard endpoint limitations for full-context analysis.
- **🧠 Domain-Specific NLP Engine** - A calibrated sentiment processor engineered for high-accuracy interpretation of digital subcultures:
  - **Platform Vernacular**: Native recognition of emerging internet idioms and status-driven discourse.
  - **Contextual Sentiment**: Differentiates high-arousal engagement (Gaming/Horror) and emotional resonance (Artistic/Music) from traditional negative polarity.
  - **Multilingual Support**: Specialized processing for informal Indonesian dialects and regional intensifiers.
- **📊 Dynamic Analytics Dashboard** - Real-time telemetry and data visualization for sentiment distribution and audience engagement metrics.
- **🕒 Stateful Analysis History** - Persistent server-side storage via PostgreSQL, enabling longitudinal tracking and historical data management.
- **🐳 Containerized Orchestration** - Streamlined deployment via Docker Compose, ensuring environment consistency and zero-config initialization.

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
├── 🐳 docker-compose.yml           # Distributed service orchestration
├── 🔧 .env.example                 # Environment configuration template
├── 🌐 frontend/                    # React (TS) + Tailwind v4 Dashboard
│   ├── 🐳 Dockerfile               # Production-optimized container
│   ├── 📦 package.json             # Bun/NPM dependencies
│   └── 📁 src/
│       ├── 🎨 components/          # Reusable UI architecture
│       │   ├── ui/                 # Shadcn/UI primitive components
│       │   ├── VideoDetails.tsx    # Metadata & 'Read More' logic
│       │   ├── CommentCharts.tsx   # Recharts visualization layer
│       │   └── CommentSection.tsx  # Deep-thread sentiment filtering
│       ├── 🚦 routes/              # Client-side routing logic
│       ├── 🔗 services/            # Axios API integration layer
│       └── 📝 types/               # Global TypeScript definitions
├── 🐹 backend-fetcher/             # High-Speed Go Data Ingestor
│   ├── 🐳 Dockerfile               # Multi-stage Go build config
│   ├── 📁 cmd/                     # Application entry points
│   └── 📁 internal/
│       ├── 🎥 youtube/             # Parallel comment retrieval logic
│       ├── 📨 queue/               # Redis producer (Job Dispatcher)
│       └── 📡 handler/             # HTTP router & middleware
├── 🐍 backend-ml/                  # Python FastAPI Intelligence Service
│   ├── 🐳 Dockerfile               # Python runtime & ML dependencies
│   ├── 📁 app/
│   │   ├── 🚀 main.py              # FastAPI application gateway
│   │   ├── 🌐 api/routes/          # Analysis & History endpoints
│   │   ├── ⚙️ core/sentiment/       # VADER v2.0 Engine & Lexicons
│   │   ├── 📊 models/              # SQLModel (Pydantic + SQLAlchemy)
│   │   └── 🛠️ workers/             # Async Redis consumer (Analysis logic)
│   └── 📋 requirements.txt         # Intelligence stack dependencies
└── 🗄️ postgres_data/               # Persistent relational storage volume
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

### 📈 Case Study: "solo meme - Shachimu"
Validated against high-volume cultural content (10,000+ comments), NeuroTube demonstrates a sophisticated understanding of audience engagement patterns, achieving a realistic sentiment distribution:
- **Positive (~37%)**: Captures high-intensity appreciation for artistic quality and animation.
- **Neutral (~60%)**: Accurately classifies historical context, descriptive remarks, and timestamped discussions that standard models often misinterpret as emotional.
- **Negative (~3%)**: Effectively isolates genuine toxicity, while recognizing that "false negatives" often stem from expressive phrases like *"The only bad thing is it ends"* (high-arousal praise).

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
