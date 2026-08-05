import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { useNavigate } from 'react-router-dom';
import { Bot, Mail, Lock, ArrowRight, Sparkles, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login, language, updateProfile } = useAuth();
  const t = translations[language];
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password.length >= 6) {
      login(email);
      if (!isLogin && name) {
        // If signing up, pre-fill the name
        updateProfile({ name });
      }
      navigate('/');
    } else {
      alert('Please enter a valid email and password (min 6 chars)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 dark:bg-blue-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 dark:border-slate-800 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-200 dark:shadow-none">
            <Bot size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{t.appName}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{isLogin ? 'Welcome back! Please login' : 'Join us for smarter healthcare'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.name}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required={!isLogin}
                    autoComplete="name"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.email}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group active:scale-95"
          >
            {isLogin ? t.login : t.signup}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-10 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-blue-600 text-sm font-bold transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-blue-600">Sign Up</span></>
            ) : (
              <>Already have an account? <span className="text-blue-600">Login</span></>
            )}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-2 text-slate-300">
          <Sparkles size={16} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Powered by Gemini AI</span>
        </div>
      </motion.div>
    </div>
  );
};
