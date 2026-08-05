import React, { useState, useEffect } from 'react';
import { Bell, Calendar, CheckCircle, AlertCircle, Info, Trash2, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: number;
  createdAt: string;
}

export const Notifications: React.FC = () => {
  const { user, language } = useAuth();
  const t = translations[language];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    try {
      const response = await fetch(`/api/notifications/${user.email}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.email]);

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 1 } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.isRead === 0);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Calendar className="text-blue-500" size={24} />;
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      case 'alert': return <AlertCircle className="text-red-500" size={24} />;
      default: return <Info className="text-slate-400" size={24} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
            {t.notifications}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Stay updated with your appointments and health alerts.
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          <CheckSquare size={18} />
          Mark all as read
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800"
          >
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={40} className="text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">All Caught Up!</h3>
            <p className="text-slate-400 dark:text-slate-600 font-medium max-w-xs mx-auto">
              You don't have any notifications at the moment.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => n.isRead === 0 && markAsRead(n.id)}
                className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                  n.isRead === 0 
                    ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 shadow-xl shadow-blue-100/50 dark:shadow-none ring-1 ring-blue-100 dark:ring-blue-900' 
                    : 'bg-white/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex gap-6 items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                    n.isRead === 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-50 dark:bg-slate-800'
                  }`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-lg font-bold truncate ${n.isRead === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 ml-4">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${n.isRead === 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                      {n.message}
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.isRead === 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
