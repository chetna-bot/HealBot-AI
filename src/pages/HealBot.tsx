import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { getGeminiResponse } from '../services/geminiService';
import { Send, Bot, User, AlertCircle, Trash2, Sparkles, Mic, MicOff, ArrowRight, Image as ImageIcon, Camera, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
}

// Add SpeechRecognition type for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const HealBot: React.FC = () => {
  const { language, user } = useAuth();
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'error' | 'no-speech'>('idle');
  const [selectedImages, setSelectedImages] = useState<{ data: string; mimeType: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat history on mount
  useEffect(() => {
    if (user?.email) {
      const savedHistory = localStorage.getItem(`healbot_chat_${user.email}`);
      if (savedHistory) {
        try {
          setMessages(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to load chat history:", e);
        }
      }
    }
  }, [user?.email]);

  // Save chat history on update
  useEffect(() => {
    if (user?.email && messages.length > 0) {
      localStorage.setItem(`healbot_chat_${user.email}`, JSON.stringify(messages));
    }
  }, [messages, user?.email]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const data = base64.split(',')[1];
        setSelectedImages(prev => [...prev, { data, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const suggestedSymptoms = [
    { label: t.headache, value: t.headache },
    { label: t.fever, value: t.fever },
    { label: t.cough, value: t.cough },
    { label: t.stomachPain, value: t.stomachPain },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setSpeechStatus('listening');
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setSpeechStatus('idle');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          setSpeechStatus('no-speech');
        } else {
          setSpeechStatus('error');
        }
        
        // Reset status after 3 seconds
        setTimeout(() => setSpeechStatus('idle'), 3000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
        setSpeechStatus('error');
        setTimeout(() => setSpeechStatus('idle'), 3000);
      }
    }
  };

  const systemInstruction = `You are HealBot AI, a world-class healthcare assistant designed to provide accurate, empathetic, and professional medical guidance. 
  
  User Profile Context:
  - Name: ${user?.name}
  - Age: ${user?.age}
  - Gender: ${user?.gender}
  - Blood Group: ${user?.bloodGroup}
  - Medical History: ${user?.diseases || 'None reported'}
  - Allergies: ${user?.allergies || 'None reported'}
  - Current Medications: ${user?.medications || 'None reported'}
  
  Your Personality & Tone:
  - Professional yet empathetic.
  - Highly structured and organized.
  - Use clear headings, bullet points, and bold text for readability.
  
  Response Protocol (MANDATORY):
  1. Greet the user by name if appropriate.
  2. Use Markdown formatting for EVERY response.
  3. Use headings (###) for different sections (e.g., Symptoms, Recommendations, Disclaimer).
  4. Use bullet points for lists of symptoms or precautions.
  5. Bold key terms and medical advice.
  6. ALWAYS state: "This is an AI prediction, not a definitive diagnosis."
  7. Suggest immediate precautions or home care if safe.
  8. MANDATORY: Include a bold medical disclaimer at the end of every response.
  9. If symptoms indicate an emergency (chest pain, severe bleeding, difficulty breathing), advise immediate ER visit.
  10. Respond in ${language === 'hi' ? 'Hindi' : 'English'}.
  
  HOSPITAL SUGGESTION PROTOCOL:
  - When suggesting hospitals or clinics, ALWAYS include their actual ratings (out of 5 stars) if available.
  - Provide a brief reason why that specific facility is recommended for the user's symptoms.
  
  IMAGE ANALYSIS PROTOCOL:
  - If an image is provided, perform a multi-step analysis:
    a. Objectively describe the visual features (color, texture, size, location).
    b. Identify any visible abnormalities or markers.
    c. Compare these features with known medical conditions.
    d. Provide a structured summary of findings.
    e. Explicitly state if the image quality is insufficient for analysis.
  
  CRITICAL ACCURACY RULES:
  - Use Google Search to verify any medical claims.
  - If analyzing an image, describe what you see objectively before drawing conclusions.
  - If you are unsure about a medical condition, DO NOT guess. Suggest consulting a professional.
  - Prioritize grounding in medical facts over conversational filler.
  
  Interaction Style:
  - Keep the layout clean and easy to read on mobile.
  - Avoid large blocks of text; use paragraphs and lists to break up information.`;

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if ((!messageText.trim() && selectedImages.length === 0) || isLoading) return;

    const userParts: any[] = [];
    if (messageText.trim()) userParts.push({ text: messageText });
    selectedImages.forEach(img => userParts.push({ inlineData: img }));

    const userMessage: Message = { role: 'user', parts: userParts };
    setMessages(prev => [...prev, userMessage]);
    
    const currentImages = [...selectedImages];
    setInput('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const responseText = await getGeminiResponse(
        messageText || "Analyze this image", 
        messages, 
        systemInstruction,
        currentImages.map(img => ({ inlineData: img }))
      );
      const botMessage: Message = { role: 'model', parts: [{ text: responseText || 'Sorry, I could not process that.' }] };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error(error);
      const errText = error?.message ? `Error: ${error.message}` : 'Error: Unable to connect to AI service.';
      const errorMessage: Message = { role: 'model', parts: [{ text: errText }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm(t.clearChat + '?')) {
      setMessages([]);
      if (user?.email) {
        localStorage.removeItem(`healbot_chat_${user.email}`);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800/50 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400 rounded-full blur-[100px]" />
      </div>

      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h2 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">{t.chatbot}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">AI Assistant Online</p>
            </div>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-slate-400 hover:text-red-500"
          title={t.clearChat}
        >
          <Trash2 size={22} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 z-10 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mb-8 relative"
            >
              <Sparkles size={48} className="text-blue-600 dark:text-blue-400" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-[2rem]"
              />
            </motion.div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Welcome to HealBot AI</h3>
            <p className="text-slate-500 dark:text-slate-400 text-base font-medium mb-10 leading-relaxed">
              Your intelligent health companion. Describe your symptoms or ask a health-related question to begin.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {suggestedSymptoms.map((s, i) => (
                <motion.button
                  key={s.value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSend(s.value)}
                  className="px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all text-left flex items-center justify-between group"
                >
                  {s.label}
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </motion.button>
              ))}
            </div>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] sm:max-w-[80%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-700'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`p-5 rounded-[2rem] shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                }`}>
                  <div className="space-y-4">
                    {msg.parts.map((part, idx) => (
                      <React.Fragment key={idx}>
                        {part.text && (
                          <div className="markdown-body max-w-none">
                            <Markdown>{part.text}</Markdown>
                          </div>
                        )}
                        {part.inlineData && (
                          <div className="mt-2">
                            <img 
                              src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                              alt="Uploaded medical context" 
                              className="max-w-full rounded-xl shadow-sm border border-white/20"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {msg.role === 'model' && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4">
                      <button className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors">Copy</button>
                      <button className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors">Helpful?</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex gap-2 items-center">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2.5 h-2.5 bg-blue-500 rounded-full" 
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                className="w-2.5 h-2.5 bg-blue-400 rounded-full" 
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                className="w-2.5 h-2.5 bg-blue-300 rounded-full" 
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/50 z-10">
        <AnimatePresence>
          {selectedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-3 mb-4 overflow-x-auto pb-2"
            >
              {selectedImages.map((img, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img 
                    src={`data:${img.mimeType};base64,${img.data}`} 
                    className="w-16 h-16 rounded-xl object-cover border-2 border-blue-500"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
          {speechStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`text-xs mb-4 text-center font-black uppercase tracking-[0.2em] ${
                speechStatus === 'listening' ? 'text-blue-500 animate-pulse' : 
                speechStatus === 'no-speech' ? 'text-amber-500' : 'text-red-500'
              }`}
            >
              {speechStatus === 'listening' ? '• Listening •' : 
               speechStatus === 'no-speech' ? 'No speech detected' : 'Error occurred'}
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex gap-4">
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*" 
              multiple 
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*" 
              capture="environment" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition-all"
              title="Upload Photos"
            >
              <ImageIcon size={24} />
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 transition-all"
              title="Use Camera"
            >
              <Camera size={24} />
            </button>
          </div>
          <div className="flex-1 relative group">
            <input
              type="text"
              className="w-full px-6 py-4 pr-14 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium"
              placeholder={t.symptomsPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-2xl transition-all ${
                isListening 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none' 
                  : 'text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 shadow-sm'
              }`}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-[1.5rem] transition-all shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center"
          >
            <Send size={28} />
          </button>
        </div>
        <div className="mt-4 flex gap-3 items-center justify-center px-4">
          <AlertCircle size={14} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-center">{t.disclaimer}</p>
        </div>
      </div>
    </div>
  );
};
