import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Calendar, CheckCircle, ArrowLeft, MapPin, Phone, Clock, User, AlertCircle, Hospital, Image as ImageIcon, Camera, X as CloseIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getGeminiResponse } from '../services/geminiService';

interface HospitalData {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  mapsUri?: string;
}

export const BookAppointment: React.FC = () => {
  const { language, user } = useAuth();
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const { hospitalId } = useParams();
  
  // Get hospital data from location state or fallback
  const hospital = location.state?.hospital as HospitalData;

  const [bookingDate, setBookingDate] = useState('');
  const [patientName, setPatientName] = useState(user?.name || '');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [preferredTime, setPreferredTime] = useState('morning');
  const [symptoms, setSymptoms] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ mimeType: string; data: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const analyzeWithAI = async () => {
    if (selectedImages.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const prompt = "Analyze these medical images/videos and provide a brief summary of symptoms or conditions visible. Also suggest if this looks like an urgent case. Keep it professional and concise for a medical appointment booking form.";
      const response = await getGeminiResponse(
        prompt, 
        [], 
        "You are a medical assistant helping to summarize patient-provided images for an appointment booking form.",
        selectedImages.map(img => ({ inlineData: img }))
      );
      setSymptoms(prev => prev + (prev ? "\n\n" : "") + "AI Analysis of uploaded media:\n" + response);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  if (!hospital) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hospital Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Please select a hospital from the search page first.</p>
        <button 
          onClick={() => navigate('/hospitals')}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Go Back to Search
        </button>
      </div>
    );
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingError(null);

    try {
      const response = await fetch('/api/book-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalName: hospital.name,
          date: bookingDate,
          time: preferredTime,
          patientName: patientName,
          urgency: urgency,
          reason: reasonForVisit,
          userEmail: user?.email || "240160226137.chetna@gdgu.org", // Fallback to user's email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send confirmation email');
      }

      setIsConfirmed(true);
    } catch (error) {
      console.error("Booking failed:", error);
      setBookingError("Failed to book appointment. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm"
      >
        <ArrowLeft size={18} />
        Back to Results
      </button>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
          <Calendar size={120} className="text-blue-600" />
        </div>

        {!isConfirmed ? (
          <div className="relative z-10">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{t.bookAppointment}</h2>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400">
                  <Hospital size={18} />
                  <span className="text-sm font-bold">{hospital.name}</span>
                </div>
                {hospital.city && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <MapPin size={18} />
                    <span className="text-sm font-bold">{hospital.city}</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleBooking} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                    <User size={14} className="text-blue-500" />
                    {t.patientName}
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium transition-all"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                    <Calendar size={14} className="text-blue-500" />
                    {t.date}
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium transition-all"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                    <Clock size={14} className="text-blue-500" />
                    {t.preferredTime}
                  </label>
                  <select
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-bold transition-all"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  >
                    <option value="morning">{t.morning}</option>
                    <option value="afternoon">{t.afternoon}</option>
                    <option value="evening">{t.evening}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                    <AlertCircle size={14} className="text-blue-500" />
                    {t.urgency}
                  </label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level)}
                        className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                          urgency === level 
                            ? level === 'high' ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' : level === 'medium' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 dark:shadow-none' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
                        }`}
                      >
                        {(t as any)[level]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                  <span className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-blue-500" />
                    Medical Photos/Videos
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case">Optional - helps with diagnosis</span>
                </label>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex gap-3">
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
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all font-bold text-sm"
                    >
                      <ImageIcon size={18} />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all font-bold text-sm"
                    >
                      <Camera size={18} />
                      Camera
                    </button>
                  </div>

                  <AnimatePresence>
                    {selectedImages.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative shrink-0">
                              <img 
                                src={`data:${img.mimeType};base64,${img.data}`} 
                                className="w-20 h-20 rounded-xl object-cover border-2 border-blue-500 shadow-md"
                                referrerPolicy="no-referrer"
                              />
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                              >
                                <CloseIcon size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={analyzeWithAI}
                          disabled={isAnalyzing}
                          className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Analyzing with AI...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              Analyze with AI to fill notes
                            </>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regular Checkup, Fever, Consultation"
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium transition-all"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">
                  Additional Symptoms or Notes
                </label>
                <textarea
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium transition-all h-32 resize-none"
                  placeholder="Describe how you are feeling..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              {bookingError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  {bookingError}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isBooking}
                  className="w-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 dark:shadow-none active:scale-[0.98] disabled:opacity-50"
                >
                  {isBooking ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Calendar size={20} />
                      {t.confirm} Booking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-12 relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"
            >
              <CheckCircle size={48} />
            </motion.div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">Confirmed!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">Your appointment has been successfully scheduled.</p>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-left mb-10 max-w-md mx-auto">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hospital</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{hospital.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white">{new Date(bookingDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Slot</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white capitalize">{(t as any)[preferredTime]}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white">{patientName}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Urgency</p>
                    <p className={`text-sm font-black uppercase tracking-wider ${urgency === 'high' ? 'text-red-500' : urgency === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {(t as any)[urgency]}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Verified
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/hospitals')}
                className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Book Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
