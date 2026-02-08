# AI Voice Chatbot - Quick Setup

## 🚀 Quick Start (5 Minutes)

### 1. Backend Setup

```bash
cd voice-chatbot-backend
pip install -r requirements.txt
cp .env.example .env
```

**Edit `.env`:**
- Add `SARVAM_API_KEY` from https://sarvam.ai
- Add `GEMINI_API_KEY` from https://aistudio.google.com/app/apikey

```bash
python app.py
```

### 2. Frontend Setup

```bash
cd client
npm install axios
echo "VITE_VOICE_CHATBOT_API=http://localhost:5001" >> .env
npm run dev
```

### 3. Test

1. Open http://localhost:5173
2. Click floating mic button (bottom-right)
3. Say: "How is the team performing?"
4. Listen to AI response!

## 📋 Example Queries

- "What is Aryan working on?"
- "How is the team performing?"
- "Are we on track for the deadline?"
- "Show me Ritwik's contributions"
- "Any blockers?"

## 🎯 Features

- 🇮🇳 Indian voices (Hindi/English)
- 🧠 AI business insights from MongoDB
- 🎙️ Voice recording & playback
- 💬 Chat history
- 🎨 Beautiful UI

## 📚 Full Documentation

See [`walkthrough.md`](file:///Users/aryansanganti/.gemini/antigravity/brain/011b31a0-165a-437b-bd90-034d7e1b589d/walkthrough.md) for complete guide.
