import React from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { motion } from 'motion/react';
import { 
  Heart, 
  Activity, 
  Calendar, 
  ShieldAlert, 
  ArrowRight,
  Bot,
  Hospital,
  Droplets,
  User,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { language, user } = useAuth();
  const t = translations[language];

  const stats = [
    { label: t.age, value: user?.age, icon: User, color: 'bg-blue-50 text-blue-600' },
    { label: t.bloodGroup, value: user?.bloodGroup, icon: Droplets, color: 'bg-red-50 text-red-600' },
    { label: 'Status', value: 'Healthy', icon: Activity, color: 'bg-emerald-50 text-emerald-600' },
  ];

  const quickActions = [
    { path: '/chatbot', icon: Bot, label: t.chatbot, desc: 'Check symptoms with AI', color: 'bg-indigo-600' },
    { path: '/report-analyzer', icon: FileText, label: t.reportAnalyzer, desc: 'Analyze health reports with AI', color: 'bg-emerald-600' },
    { path: '/hospitals', icon: Hospital, label: t.findHospitals, desc: 'Find nearby medical care', color: 'bg-blue-600' },
    { path: '/emergency', icon: ShieldAlert, label: t.emergency, desc: 'Quick access to help', color: 'bg-rose-600' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-slate-800 dark:text-white"
          >
            {t.welcome}, {user?.name}!
          </motion.h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Here's your health summary for today.</p>
        </div>
        <Link 
          to="/chatbot"
          className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-sm font-bold text-blue-600 dark:text-blue-400 hover:shadow-md transition-all"
        >
          <Bot size={18} />
          Talk to HealBot
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color} dark:bg-opacity-10`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-600 dark:text-blue-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Link
                  to={action.path}
                  className="group block p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg ${action.color}`}>
                    <action.icon size={24} />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.label}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{action.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                    Get Started <ArrowRight size={14} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-500" />
            Health Profile
          </h3>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 p-8 rounded-3xl text-white shadow-xl shadow-blue-200 dark:shadow-none"
          >
            <div className="space-y-6">
              <div>
                <p className="text-blue-100 dark:text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Existing Conditions</p>
                <p className="text-lg font-medium">{user?.diseases || 'None reported'}</p>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <p className="text-blue-100 dark:text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Allergies</p>
                <p className="text-lg font-medium">{user?.allergies || 'None reported'}</p>
              </div>
              <div className="h-px bg-white/10" />
              <div>
                <p className="text-blue-100 dark:text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Current Medications</p>
                <p className="text-lg font-medium">{user?.medications || 'None reported'}</p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};
