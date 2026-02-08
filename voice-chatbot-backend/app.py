"""
Main Flask Application - Voice Chatbot Backend
Provides API endpoints for voice-based business insights
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import os
import io
import base64

# Load environment variables
load_dotenv()

# Import services
from services.sarvam_service import SarvamService
from services.mongodb_service import MongoDBService
from services.insights_engine import InsightsEngine

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize services
sarvam_service = SarvamService()
mongodb_service = MongoDBService()
insights_engine = InsightsEngine(mongodb_service)

# ============= API ENDPOINTS =============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'sarvam': 'connected',
            'mongodb': 'connected',
            'insights': 'ready'
        }
    })

@app.route('/api/voice/introduction', methods=['GET'])
def get_introduction():
    """Get introduction audio"""
    try:
        language = request.args.get('language', 'en-IN')
        
        # Generate introduction audio
        audio_bytes = sarvam_service.get_introduction_audio(language)
        
        if audio_bytes:
            # Return audio file
            return send_file(
                io.BytesIO(audio_bytes),
                mimetype='audio/wav',
                as_attachment=False,
                download_name='introduction.wav'
            )
        else:
            return jsonify({'error': 'Failed to generate introduction'}), 500
    
    except Exception as e:
        print(f"Introduction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice/transcribe', methods=['POST'])
def transcribe_audio():
    """Convert speech to text"""
    try:
        # Get audio data from request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        audio_bytes = audio_file.read()
        
        language = request.form.get('language', 'en-IN')
        
        # Transcribe using Sarvam AI
        transcript = sarvam_service.speech_to_text(audio_bytes, language)
        
        if transcript:
            return jsonify({
                'transcript': transcript,
                'language': language
            })
        else:
            return jsonify({'error': 'Transcription failed'}), 500
    
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice/synthesize', methods=['POST'])
def synthesize_speech():
    """Convert text to speech"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        language = data.get('language', 'en-IN')
        speaker = data.get('speaker', 'meera')
        
        # Generate speech using Sarvam AI
        audio_bytes = sarvam_service.text_to_speech(
            text,
            language=language,
            speaker=speaker
        )
        
        if audio_bytes:
            # Return audio file
            return send_file(
                io.BytesIO(audio_bytes),
                mimetype='audio/wav',
                as_attachment=False,
                download_name='response.wav'
            )
        else:
            return jsonify({'error': 'Speech synthesis failed'}), 500
    
    except Exception as e:
        print(f"Synthesis error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/insights/query', methods=['POST'])
def process_query():
    """Process business insights query"""
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400
        
        query = data['query']
        language = data.get('language', 'en')
        return_audio = data.get('return_audio', False)
        
        # Process query through insights engine
        response_text = insights_engine.process_query(query, language)
        
        result = {
            'query': query,
            'response': response_text,
            'language': language
        }
        
        # Optionally generate audio response
        if return_audio:
            audio_bytes = sarvam_service.text_to_speech(
                response_text,
                language=f'{language}-IN'
            )
            if audio_bytes:
                # Encode audio as base64
                audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                result['audio'] = audio_base64
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Query processing error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice/chat', methods=['POST'])
def voice_chat():
    """Complete voice chat flow: STT -> Insights -> TTS"""
    try:
        # Get audio data
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        audio_bytes = audio_file.read()
        
        language = request.form.get('language', 'en-IN')
        lang_code = language.split('-')[0]  # Extract 'en' from 'en-IN'
        
        # Step 1: Transcribe audio
        transcript = sarvam_service.speech_to_text(audio_bytes, language)
        
        if not transcript:
            return jsonify({'error': 'Transcription failed'}), 500
        
        # Step 2: Process query
        response_text = insights_engine.process_query(transcript, lang_code)
        
        # Step 3: Generate speech
        response_audio = sarvam_service.text_to_speech(
            response_text,
            language=language
        )
        
        if not response_audio:
            return jsonify({'error': 'Speech synthesis failed'}), 500
        
        # Return both text and audio
        return jsonify({
            'transcript': transcript,
            'response_text': response_text,
            'response_audio': base64.b64encode(response_audio).decode('utf-8'),
            'language': language
        })
    
    except Exception as e:
        print(f"Voice chat error: {e}")
        return jsonify({'error': str(e)}), 500

# ============= ERROR HANDLERS =============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============= MAIN =============

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║     VOICE CHATBOT BACKEND - STARTING                        ║
╚══════════════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:{port}
🎙️  Sarvam AI: Enabled
🗄️  MongoDB: Connected
🧠 Insights Engine: Ready

API Endpoints:
  GET  /api/health
  GET  /api/voice/introduction
  POST /api/voice/transcribe
  POST /api/voice/synthesize
  POST /api/insights/query
  POST /api/voice/chat

Press CTRL+C to stop
""")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
