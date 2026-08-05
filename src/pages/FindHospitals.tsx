import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Search, MapPin, CheckCircle, Hospital, ExternalLink, Loader2, Mic, MicOff, Image as ImageIcon, Camera, X as CloseIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchHospitals } from '../services/geminiService';

interface HospitalData {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  mapsUri?: string;
  rating?: string;
  reviewsCount?: string;
  summary?: string;
  accreditation?: string;
}

export const FindHospitals: React.FC = () => {
  const { language, user } = useAuth();
  const t = translations[language];
  const [city, setCity] = useState('');
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'error' | 'no-speech'>('idle');
  const [selectedImages, setSelectedImages] = useState<{ mimeType: string; data: string }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImages(prev => [...prev, {
          mimeType: file.type,
          data: base64String
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

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
        setCity(transcript);
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

  const handleSearch = async () => {
    if (!city.trim()) return;
    setIsLoading(true);
    setGeminiResponse(null);
    setHospitals([]);

    try {
      const result = await searchHospitals(city, selectedImages.map(img => ({ inlineData: img })));
      setGeminiResponse(result.text || "No information found.");
      
      // Advanced extraction logic using the strict format defined in geminiService
      const hospitalBlocks = result.text.split(/\[Hospital:/g).filter(Boolean);
      
      const extracted: HospitalData[] = hospitalBlocks
        .map((block, index) => {
          const nameMatch = block.match(/^(.*?)\s*\]/);
          const name = nameMatch ? nameMatch[1].trim() : "Unknown";
          
          const rating = block.match(/\[Rating:\s*(.*?)\s*\]/)?.[1]?.trim();
          const reviewsCount = block.match(/\[Reviews:\s*(.*?)\s*\]/)?.[1]?.trim();
          const summary = block.match(/\[Summary:\s*(.*?)\s*\]/)?.[1]?.trim();
          const mapsUri = block.match(/\[Maps:\s*(.*?)\s*\]/)?.[1]?.trim();
          const address = block.match(/\[Address:\s*(.*?)\s*\]/)?.[1]?.trim();
          const accreditation = block.match(/\[Accreditation:\s*(.*?)\s*\]/)?.[1]?.trim();

          return {
            id: `h-${index}`,
            name,
            address: address || "Address on Maps",
            phone: "Available on Maps",
            city,
            mapsUri,
            rating,
            reviewsCount,
            summary,
            accreditation
          };
        })
        .filter(h => h.name.toLowerCase() !== "unknown" && !h.name.toLowerCase().includes("unknown hospital") && h.name.length > 2);

      // Fallback to grounding chunks if extraction from text fails significantly
      if (extracted.length === 0) {
        const groundingExtracted = (result.groundingChunks
          .map((chunk: any, i: number) => {
            if (chunk.maps || chunk.web) {
              const hospitalName = chunk.maps?.title || chunk.web?.title || "";
              return {
                id: `h-ground-${i}`,
                name: hospitalName,
                address: "See details in link",
                phone: "N/A",
                city,
                mapsUri: chunk.maps?.uri || chunk.web?.uri,
              } as HospitalData;
            }
            return null;
          })
          .filter((h) => 
            h !== null && 
            h.name.toLowerCase() !== "unknown" && 
            !h.name.toLowerCase().includes("unknown hospital") && 
            h.name.length > 2
          ) as HospitalData[]);
        setHospitals(groundingExtracted);
      } else {
        setHospitals(extracted);
      }
    } catch (error) {
      console.error(error);
      setGeminiResponse("Error fetching hospital data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t.findHospitals}</h2>
        <AnimatePresence>
          {speechStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-xs mb-3 font-bold uppercase tracking-wider ${
                speechStatus === 'listening' ? 'text-blue-500 animate-pulse' : 
                speechStatus === 'no-speech' ? 'text-amber-500' : 'text-red-500'
              }`}
            >
              {speechStatus === 'listening' ? 'Listening...' : 
               speechStatus === 'no-speech' ? 'No speech detected. Try again.' : 'Speech recognition error.'}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*,video/*" 
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
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
              title="Upload Photos/Videos"
            >
              <ImageIcon size={20} />
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
              title="Use Camera"
            >
              <Camera size={20} />
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
              placeholder="Search by city (e.g., Mumbai, New York)..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold shadow-md shadow-blue-100 dark:shadow-none disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : t.search}
          </button>
        </div>

        <AnimatePresence>
          {selectedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-3 mt-4 overflow-x-auto pb-2"
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
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {isLoading && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
            <p className="text-slate-500 dark:text-slate-400">Searching for hospitals in {city}...</p>
          </div>
        )}

        {hospitals.length > 0 && !isLoading && (
          <div className="flex justify-between items-center mb-2 px-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Hospitals in {city}</h3>
            <span className="text-xs font-bold px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              {hospitals.length} Found
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {hospitals.map((h, index) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{h.name}</h3>
                      {h.accreditation && h.accreditation.toLowerCase() !== 'unknown' && h.accreditation.toLowerCase() !== 'none' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded text-[9px] font-black uppercase tracking-tighter">
                          <CheckCircle size={10} />
                          {h.accreditation}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
                        <MapPin size={12} />
                        <span>{h.city}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border shadow-sm ${h.rating ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => {
                            const ratingVal = parseFloat(h.rating || "0");
                            const isFull = i < Math.floor(ratingVal);
                            const isHalf = !isFull && i < ratingVal;
                            return (
                              <Star 
                                key={i} 
                                size={12} 
                                fill={isFull ? "currentColor" : "none"} 
                                className={isFull || isHalf ? "text-amber-500" : "text-slate-300 dark:text-slate-700"}
                              />
                            );
                          })}
                        </div>
                        <span className="ml-1 whitespace-nowrap">{h.rating ? `${h.rating} / 5` : 'N/A'}</span>
                        {h.reviewsCount && (
                          <span className="ml-2 text-slate-400 dark:text-slate-500 font-medium text-[10px] break-keep">
                            ({h.reviewsCount} reviews)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                    <Hospital size={20} />
                  </div>
                </div>

                {h.summary && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 italic">
                    "{h.summary}"
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {h.mapsUri && (
                    <a 
                      href={h.mapsUri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none active:scale-95"
                    >
                      <ExternalLink size={16} /> View Location on Maps
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {!isLoading && hospitals.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800"
          >
            <Hospital size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Find Medical Care</h3>
            <p className="text-slate-400 dark:text-slate-600 font-medium max-w-xs mx-auto">Search for a city to find verified hospitals and medical facilities.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
