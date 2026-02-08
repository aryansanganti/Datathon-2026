# Voice Chatbot Backend - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd voice-chatbot-backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `SARVAM_API_KEY` - Get from https://sarvam.ai
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/app/apikey
- `MONGODB_URI` - Already configured

### 3. Run Backend

```bash
python app.py
```

Server will start on `http://localhost:5001`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/voice/introduction` - Get intro audio
- `POST /api/voice/transcribe` - Speech to text
- `POST /api/voice/synthesize` - Text to speech
- `POST /api/insights/query` - Business insights
- `POST /api/voice/chat` - Complete voice chat flow

## Frontend Integration

Add to your React app:

```tsx
import { VoiceChatbot } from './components/VoiceChatbot/VoiceChatbot';

function App() {
  return (
    <>
      {/* Your existing app */}
      <VoiceChatbot />
    </>
  );
}
```

Add to `.env`:

```bash
VITE_VOICE_CHATBOT_API=http://localhost:5001
```

## Example Queries

- "What is Aryan working on?"
- "How is the team performing?"
- "Are we on track for the deadline?"
- "Show me Ritwik's contributions"
- "Any blockers?"

## Troubleshooting

**Microphone not working:**
- Enable microphone permissions in browser
- Use HTTPS in production

**Sarvam AI errors:**
- Check API key is valid
- Verify account has credits

**MongoDB connection failed:**
- Check MONGODB_URI is correct
- Verify network access

## Production Deployment

1. Set `FLASK_ENV=production`
2. Use gunicorn: `gunicorn app:app`
3. Setup HTTPS
4. Configure CORS for your domain
