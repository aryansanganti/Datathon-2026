import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Send } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_VOICE_CHATBOT_API || 'http://localhost:5001';

interface Message {
    id: string;
    type: 'user' | 'assistant';
    text: string;
    audio?: string;
    timestamp: Date;
}

export const VoiceChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Show text introduction when first opened
    useEffect(() => {
        if (isOpen && !hasPlayedIntro) {
            // Add text-only introduction message
            addMessage(
                'assistant',
                'Hello! I\'m your AI Business Insights Assistant. I can provide information about your team\'s Jira tickets, GitHub commits, and project status. Click "Hold to Speak" and ask me anything!'
            );
            setHasPlayedIntro(true);
        }
    }, [isOpen]);

    const addMessage = (type: 'user' | 'assistant', text: string, audio?: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            type,
            text,
            audio,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                await processVoiceInput(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setAudioChunks(chunks);
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Microphone access denied. Please enable microphone permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const processVoiceInput = async (audioBlob: Blob) => {
        setIsProcessing(true);

        try {
            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('language', 'en-IN');

            // Send to backend for complete processing
            const response = await axios.post(`${API_URL}/api/voice/chat`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { transcript, response_text, response_audio } = response.data;

            // Add user message
            addMessage('user', transcript);

            // Add assistant response
            addMessage('assistant', response_text, response_audio);

            // Play audio response
            if (response_audio && audioRef.current) {
                const audioBlob = base64ToBlob(response_audio, 'audio/wav');
                const audioUrl = URL.createObjectURL(audioBlob);
                audioRef.current.src = audioUrl;
                audioRef.current.play();
            }
        } catch (error) {
            console.error('Voice processing failed:', error);
            addMessage('assistant', 'Sorry, I had trouble processing that. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const base64ToBlob = (base64: string, mimeType: string): Blob => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    const playAudio = (audioBase64: string) => {
        if (audioRef.current) {
            const audioBlob = base64ToBlob(audioBase64, 'audio/wav');
            const audioUrl = URL.createObjectURL(audioBlob);
            audioRef.current.src = audioUrl;
            audioRef.current.play();
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group z-50"
                    aria-label="Open voice chatbot"
                >
                    <Mic className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Mic className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">AI Insights</h3>
                                <p className="text-white/80 text-xs">Business Assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl p-3 ${message.type === 'user'
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                                        : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                                        }`}
                                >
                                    <p className="text-sm">{message.text}</p>
                                    {message.audio && message.type === 'assistant' && (
                                        <button
                                            onClick={() => playAudio(message.audio!)}
                                            className="mt-2 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                                        >
                                            <Volume2 className="w-3 h-3" />
                                            Play Audio
                                        </button>
                                    )}
                                    <p className="text-xs opacity-60 mt-1">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isProcessing}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isRecording ? (
                                    <>
                                        <MicOff className="w-5 h-5" />
                                        Stop Recording
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        {isProcessing ? 'Processing...' : 'Click to Speak'}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            {isRecording ? 'Recording... Click to stop' : 'Click the button and ask your question'}
                        </p>
                    </div>
                </div>
            )}

            {/* Hidden audio player */}
            <audio ref={audioRef} className="hidden" />
        </>
    );
};

export default VoiceChatbot;
