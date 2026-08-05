import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { User, Heart, Lock, LogOut, Globe, Bell, Moon, Shield, Trash2, ChevronRight, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const SettingItem = ({ icon: Icon, title, subtitle, onClick, color, danger, loading }: any) => (
  <div 
    onClick={loading ? undefined : onClick}
    className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group ${danger ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : ''} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
        <Icon size={20} className={loading ? 'animate-spin' : ''} />
      </div>
      <div>
        <p className={`font-bold ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
  </div>
);

export const Settings: React.FC = () => {
  const { language, setLanguage, logout, user, theme, setTheme, updateProfile } = useAuth();
  const t = translations[language];
  const [notifications, setNotifications] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user?.email) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/appointments/${user.email}`);
      const appointments = await response.json();

      const exportData = {
        profile: user,
        appointments: appointments,
        exportedAt: new Date().toISOString(),
        appName: "HealBot AI"
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healbot_health_data_${user.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.settings}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your account and preferences</p>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Account</h3>
            <div className="space-y-1">
              <SettingItem 
                icon={User} 
                title={t.profile} 
                subtitle={`${user?.name} • ${user?.email}`}
                color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              />
              <SettingItem 
                icon={Heart} 
                title={t.healthHistory} 
                subtitle={`${user?.bloodGroup} • ${user?.age} years`}
                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              />
              <SettingItem 
                icon={Shield} 
                title="Permissions" 
                subtitle="Manage app access and privacy"
                onClick={() => updateProfile({ hasAcceptedPermissions: false })}
                color="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              />
              <SettingItem 
                icon={Lock} 
                title="Security" 
                subtitle="Password and authentication"
                color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              />
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{t.notifications}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Push alerts and reminders</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-all relative ${notifications ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center">
                    <Moon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{t.theme}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customize appearance</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['light', 'dark', 'system'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTheme(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                        theme === m ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {t[m as keyof typeof t] || m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 px-2">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-white mb-2">{t.language}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { code: 'en', name: 'English' },
                      { code: 'hi', name: 'हिन्दी' },
                      { code: 'es', name: 'Español' },
                      { code: 'fr', name: 'Français' },
                      { code: 'de', name: 'Deutsch' },
                      { code: 'zh', name: '中文' },
                      { code: 'ja', name: '日本語' },
                      { code: 'ru', name: 'Русский' },
                      { code: 'pt', name: 'Português' },
                    ].map((l) => (
                      <button
                        key={l.code}
                        onClick={() => setLanguage(l.code as any)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          language === l.code 
                            ? 'bg-blue-600 text-white shadow-lg border-blue-600' 
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">{t.dataManagement}</h3>
            <div className="space-y-1">
              <SettingItem 
                icon={isExporting ? Loader2 : Download} 
                title={t.exportData} 
                subtitle={t.exportDataDesc}
                onClick={handleExport}
                loading={isExporting}
                color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Legal & Support</h3>
            <div className="space-y-1">
              <SettingItem 
                icon={Shield} 
                title={t.privacy} 
                subtitle="Terms of service and data policy"
                color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              />
              <SettingItem 
                icon={LogOut} 
                title={t.logout} 
                subtitle="Sign out of your session"
                onClick={logout}
                color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                danger
              />
              <SettingItem 
                icon={Trash2} 
                title={t.deleteAccount} 
                subtitle="Permanently remove your data"
                color="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                danger
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
