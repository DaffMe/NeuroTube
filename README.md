<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

# NeuroTube: YouTube Comment Sentiment Analyzer

![NeuroTube Banner](https://img.shields.io/badge/NeuroTube-Sentiment_Analyzer-FF69B4?style=for-the-badge&logo=youtube&logoColor=white)

**A full-stack application to analyze YouTube comment sentiments at scale.**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

</div>

---

> [!NOTE]
> **Developer's Note:** This is my **first-ever project**! It was built entirely with the assistance of **Google Antigravity AI Agent**. Because this is my very first attempt at building a complex application, the code and architecture might not be 100% perfect. There might still be bugs or areas for optimization, but it's a huge learning milestone for me. Feedback and contributions are always welcome!

---

## Overview

NeuroTube is a web application that takes a YouTube video URL and analyzes the sentiments of its comments. It fetches comments directly from YouTube, processes them using Hugging Face Transformer models to determine their sentiment (Positive, Neutral, Negative), and visualizes the results on an interactive dashboard.

The project uses a microservices architecture to separate the fast data ingestion from the heavier machine learning tasks.

---

## Features

- **Tugas Besar Edition (Fully Documented)**: Seluruh basis kode aplikasi (Golang, Python, dan React) telah dilengkapi dengan anotasi komentar *line-by-line* dan penjelasan fungsi `import` dalam **Bahasa Indonesia** yang sangat komprehensif. Didesain khusus untuk mempermudah proses belajar dan presentasi akademik.
- **Concurrent Data Fetching**: Uses a Go backend to rapidly fetch thousands of YouTube comments and their replies.
- **Sentiment Analysis Engine**: A Python FastAPI backend that runs a Dual-Engine Hugging Face Transformers setup (XLM-RoBERTa & Indo-RoBERTa) for highly accurate, multilingual sentiment classification. Dilengkapi juga dengan Regex Spammer Filter untuk menghemat resource GPU.
- **Interactive Dashboard**: A modern, responsive frontend built with React 19 and Tailwind CSS v4, featuring:
  - **Sentiment Timeline**: A chart showing how sentiments change over time.
  - **Keyword Cloud**: A dynamic visual representation of the most common topics.
  - **Deep-Thread Comments Filtering**: Filter through thousands of comments based on their sentiment score.
- **Containerized**: Fully dockerized setup for easy local deployment.

---

## Architecture

The app is split into three main services:

1. **Frontend (React + Vite)**: Handles the user interface and data visualization.
2. **Fetcher Service (Go)**: Directly communicates with the YouTube Data API v3 to fetch comments as fast as possible and pushes them to Redis.
3. **ML Service (Python + FastAPI)**: Pulls comments from Redis, calculates sentiment scores using Transformer models, and stores the results in PostgreSQL.

```mermaid
graph TD
    User((User)) -->|YouTube URL| Frontend[React + Vite]
    Frontend -->|POST /api/analyze| Fetcher[Go Fetcher Service]
    Fetcher -->|Parallel Page Fetch| YT_API[YouTube Data API v3]
    Fetcher -->|Push Job Task| Redis[(Redis Broker)]
    Redis -->|Worker Pull| MLEngine[Python Worker]
    MLEngine -->|Transformer Scoring| DB[(PostgreSQL)]
    Frontend -->|Poll Results| MLEngine
    MLEngine -->|History & Summaries| Frontend
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Shadcn UI, Framer Motion, Recharts.
- **Backend Fetcher**: Go 1.24, Redis.
- **Backend ML**: Python 3.13, FastAPI, SQLModel, PostgreSQL, Hugging Face Transformers, PyTorch, Langdetect, Gemini API (for AI summary).
- **Infrastructure**: Docker & Docker Compose.

---

## UI Showcase

### Landing Page

![Home Page](assets/ui_home.png)

### Dashboard

![Dashboard](assets/ui_dashboard.png)

---

## Quick Start (Docker)

To run this project locally, you need Docker installed and a YouTube API Key.

1. **Clone the repository**

   ```bash
   git clone https://github.com/DaffMe/NeuroTube.git
   cd NeuroTube
   ```

2. **Configure Environment Variables**

   ```bash
   cp .env.example .env
   ```

   Open the `.env` file and insert your `YOUTUBE_API_KEY`.

3. **Run with Docker Compose**

   ```bash
   docker compose up --build -d
   ```

4. **Access the Application**
   - **Frontend UI**: `http://localhost:5173`
   - **Python API Docs**: `http://localhost:8000/docs`

---

## Local Development (Without Docker)

If you prefer to run the services directly on your host machine:

### ML Backend (Python)

```bash
cd backend-ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Fetcher Backend (Go)

```bash
cd backend-fetcher
go mod download
go run cmd/main.go
```

### Frontend (React with Bun)

Disarankan menggunakan **Bun** untuk instalasi Node modules yang lebih cepat.

```bash
cd frontend
bun install
bun run dev
```

---

## Acknowledgments

- Built collaboratively with **Google Antigravity AI Agent**.
- Inspired by [youtube-comment-sentiment-analyzer](https://github.com/00200200/youtube-comment-sentiment-analyzer).

---

<div align="center">
  <b>Developed by <a href="https://github.com/DaffMe">DaffMe</a></b>
</div>
