import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

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

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

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

            {/* Chat Window Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden relative h-[80vh] border border-white/20"
                            role="dialog"
                            aria-modal="true"
                        >
                            {/* Header */}
                            <div className="bg-linear-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/10">
                                        <Mic className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-xl tracking-wide">AI Business Insights</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <p className="text-white/80 text-xs font-medium">Online & Ready</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-200"
                                    aria-label="Close"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
                                <AnimatePresence initial={false}>
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${message.type === 'user'
                                                    ? 'bg-linear-to-br from-violet-600 to-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                    }`}
                                            >
                                                <p className="text-[15px] leading-relaxed">{message.text}</p>
                                                {message.audio && message.type === 'assistant' && (
                                                    <button
                                                        onClick={() => playAudio(message.audio!)}
                                                        className="mt-3 flex items-center gap-2 text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors w-fit border border-purple-100"
                                                    >
                                                        <Volume2 className="w-3.5 h-3.5" />
                                                        Play Response
                                                    </button>
                                                )}
                                                <p className={`text-[10px] mt-2 font-medium ${message.type === 'user' ? 'text-white/50' : 'text-gray-400'}`}>
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {isProcessing && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    className="w-2.5 h-2.5 bg-violet-500 rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                                    className="w-2.5 h-2.5 bg-violet-500 rounded-full"
                                                />
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                                    className="w-2.5 h-2.5 bg-violet-500 rounded-full"
                                                />
                                            </div>
                                            <span className="text-sm text-gray-500 font-medium">Processing...</span>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-white border-t border-gray-100 shrink-0">
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`relative w-full transition-all duration-300 ${isRecording ? 'scale-105' : 'scale-100'}`}>
                                        {isRecording && (
                                            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full animate-pulse"></div>
                                        )}
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            disabled={isProcessing}
                                            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${isRecording
                                                ? 'bg-linear-to-r from-red-500 to-rose-600 text-white border-2 border-transparent'
                                                : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-violet-500 hover:text-violet-600'
                                                } disabled:opacity-70 disabled:cursor-not-allowed`}
                                        >
                                            {isRecording ? (
                                                <>
                                                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                                                    <MicOff className="w-6 h-6 animate-pulse" />
                                                    <span className="tracking-wide">Stop Recording</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-linear-to-r from-violet-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    <Mic className={`w-6 h-6 ${isProcessing ? 'animate-spin' : ''}`} />
                                                    <span className="tracking-wide">{isProcessing ? 'Generating Response...' : 'Tap to Speak'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className={`text-xs font-medium transition-colors duration-300 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                        {isRecording ? 'Listening to your voice...' : 'Press the button to start a conversation'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden audio player */}
            <audio ref={audioRef} className="hidden" />
        </>
    );
};

export default VoiceChatbot;
