import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, 
  Mic, 
  Bell, 
  Image, 
  PhoneCall, 
  MapPin, 
  Phone, 
  ShieldCheck,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Permission {
  id: string;
  icon: any;
  title: string;
  description: string;
  required?: boolean;
}

export const Permissions: React.FC = () => {
  const { updateProfile } = useAuth();
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  const permissions: Permission[] = [
    { 
      id: 'location', 
      icon: MapPin, 
      title: 'Location Access', 
      description: 'To find nearby hospitals and emergency services.',
      required: true 
    },
    { 
      id: 'microphone', 
      icon: Mic, 
      title: 'Microphone Access', 
      description: 'For voice-enabled symptom checking and health queries.' 
    },
    { 
      id: 'camera', 
      icon: Camera, 
      title: 'Camera Access', 
      description: 'To scan medical reports or for future video consultations.' 
    },
    { 
      id: 'notifications', 
      icon: Bell, 
      title: 'Notifications', 
      description: 'For medicine reminders and appointment alerts.' 
    },
    { 
      id: 'photos', 
      icon: Image, 
      title: 'Photos & Videos', 
      description: 'To upload and store your medical records securely.' 
    },
    { 
      id: 'phone', 
      icon: Phone, 
      title: 'Phone Status', 
      description: 'To facilitate direct emergency calls from the app.' 
    },
    { 
      id: 'call_logs', 
      icon: PhoneCall, 
      title: 'Call Logs', 
      description: 'To track emergency contact history for your safety.' 
    }
  ];

  const togglePermission = (id: string) => {
    setGranted(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContinue = () => {
    updateProfile({ hasAcceptedPermissions: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-8 pb-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Permissions</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            HealBot AI needs these permissions to provide a complete healthcare experience.
          </p>
        </div>

        <div className="px-4 max-h-[400px] overflow-y-auto space-y-2 py-4">
          {permissions.map((p, index) => {
            const Icon = p.icon;
            const isGranted = granted[p.id];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => togglePermission(p.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                  isGranted 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isGranted 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-blue-500'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{p.title}</h3>
                    {p.required && (
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Required</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  isGranted 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-transparent'
                }`}>
                  <Check size={14} />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="p-8 pt-4">
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-100 dark:shadow-none active:scale-[0.98]"
          >
            Continue to App
            <ChevronRight size={20} />
          </button>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-widest font-bold">
            You can manage these in settings later
          </p>
        </div>
      </motion.div>
    </div>
  );
};
