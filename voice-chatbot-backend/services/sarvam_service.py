"""
Sarvam AI Service - TTS and STT Integration
Handles Text-to-Speech and Speech-to-Text using Sarvam AI API
"""

import requests
import os
import base64
from typing import Optional, Dict, Any

class SarvamService:
    def __init__(self):
        self.api_key = os.getenv('SARVAM_API_KEY')
        self.base_url = 'https://api.sarvam.ai'
        
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY not found in environment variables")
        
        # Sarvam AI uses 'api-subscription-key' header
        self.headers = {
            'api-subscription-key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    def text_to_speech(
        self, 
        text: str, 
        language: str = 'hi-IN',  # Hindi by default
        speaker: str = 'rahul',    # Fast male Indian voice
        pitch: float = 0,
        pace: float = 1.3,  # Faster speech (1.3x speed)
        loudness: float = 1.0
    ) -> Optional[bytes]:
        """
        Convert text to speech using Sarvam AI Bulbul TTS
        
        Args:
            text: Text to convert to speech
            language: Language code (hi-IN for Hindi, en-IN for Indian English)
            speaker: Voice name (meera, arvind, etc.)
            pitch: Voice pitch adjustment (-10 to 10)
            pace: Speech speed (0.5 to 2.0)
            loudness: Volume level (0.5 to 2.0)
        
        Returns:
            Audio bytes in WAV format
        """
        try:
            # Use bulbul:v3 model (latest version)
            model = 'bulbul:v3'
            
            payload = {
                'inputs': [text],
                'target_language_code': language,
                'speaker': speaker,
                'pace': pace,
                'speech_sample_rate': 8000,
                'enable_preprocessing': True,
                'model': model
            }
            
            response = requests.post(
                f'{self.base_url}/text-to-speech',
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                # Sarvam returns base64 encoded audio
                if 'audios' in result and len(result['audios']) > 0:
                    audio_base64 = result['audios'][0]
                    audio_bytes = base64.b64decode(audio_base64)
                    return audio_bytes
                else:
                    print(f"No audio in response: {result}")
                    return None
            else:
                print(f"TTS Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"TTS Exception: {str(e)}")
            return None
    
    def speech_to_text(
        self, 
        audio_data: bytes,
        language: str = 'hi-IN'
    ) -> Optional[str]:
        """
        Convert speech to text using Sarvam AI Saarika STT
        
        Args:
            audio_data: Audio bytes (WAV format)
            language: Language code (hi-IN for Hindi, en-IN for English)
        
        Returns:
            Transcribed text
        """
        try:
            # Sarvam AI STT requires multipart/form-data with file upload
            files = {
                'file': ('audio.wav', audio_data, 'audio/wav')
            }
            
            # Remove Content-Type from headers for multipart
            headers = {
                'api-subscription-key': self.api_key
            }
            
            data = {
                'language_code': language,
                'model': 'saarika:v2.5'  # Updated to v2.5
            }
            
            response = requests.post(
                f'{self.base_url}/speech-to-text',
                headers=headers,
                files=files,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'transcript' in result:
                    return result['transcript']
                else:
                    print(f"No transcript in response: {result}")
                    return None
            else:
                print(f"STT Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"STT Exception: {str(e)}")
            return None
    
    def get_introduction_audio(self, language: str = 'hi-IN') -> Optional[bytes]:
        """
        Generate introduction message audio
        
        Returns:
            Audio bytes for introduction
        """
        if language.startswith('hi'):
            intro_text = """
            नमस्ते! मैं आपकी AI बिज़नेस इनसाइट्स असिस्टेंट हूं। 
            मैं आपकी टीम के Jira टिकट्स, GitHub commits, और प्रोजेक्ट स्टेटस के बारे में जानकारी दे सकती हूं।
            आप मुझसे कुछ भी पूछ सकते हैं जैसे कि टीम का परफॉर्मेंस, किसी का स्टेटस, या प्रोजेक्ट की हेल्थ।
            """
        else:
            intro_text = """
            Hello! I'm your AI Business Insights Assistant. 
            I can provide information about your team's Jira tickets, GitHub commits, and project status.
            You can ask me anything like team performance, individual status, or project health.
            How can I help you today?
            """
        
        return self.text_to_speech(intro_text, language=language)


# Test function
if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    
    service = SarvamService()
    
    # Test TTS
    print("Testing Text-to-Speech...")
    audio = service.text_to_speech(
        "Hello, this is a test of Sarvam AI voice synthesis.",
        language='en-IN'
    )
    
    if audio:
        print(f"✅ TTS Success! Generated {len(audio)} bytes of audio")
        # Save to file for testing
        with open('test_output.wav', 'wb') as f:
            f.write(audio)
        print("Saved to test_output.wav")
    else:
        print("❌ TTS Failed")
    
    # Test introduction
    print("\nTesting Introduction...")
    intro_audio = service.get_introduction_audio('en-IN')
    if intro_audio:
        print(f"✅ Introduction Success! Generated {len(intro_audio)} bytes")
    else:
        print("❌ Introduction Failed")
