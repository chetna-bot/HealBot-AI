import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { translations } from './translations';
import { Login } from './pages/Login';
import { ProfileForm } from './pages/ProfileForm';
import { Permissions } from './pages/Permissions';
import { HealBot } from './pages/HealBot';
import { FindHospitals } from './pages/FindHospitals';
import { Emergency } from './pages/Emergency';
import { Settings } from './pages/Settings';
import { Dashboard } from './pages/Dashboard';
import { Notifications } from './pages/Notifications';
import { ReportAnalyzer } from './pages/ReportAnalyzer';
import { NotificationCenter } from './components/NotificationCenter';
import { SplashScreen } from './components/SplashScreen';
import { 
  LayoutDashboard, 
  Bot, 
  Hospital, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Calendar,
  Bell,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { language, logout, user } = useAuth();
  const t = translations[language];
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: t.dashboard },
    { path: '/chatbot', icon: Bot, label: t.chatbot },
    { path: '/report-analyzer', icon: FileText, label: t.reportAnalyzer },
    { path: '/hospitals', icon: Hospital, label: t.findHospitals },
    { path: '/notifications', icon: Bell, label: t.notifications },
    { path: '/emergency', icon: ShieldAlert, label: t.emergency },
    { path: '/settings', icon: SettingsIcon, label: t.settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        className="fixed lg:static top-0 left-0 h-full w-[280px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50 flex flex-col shadow-2xl lg:shadow-none"
      >
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Bot size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{t.appName}</h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 dark:shadow-none' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'} />
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-blue-200" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">Account</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{user?.name || user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-sm group"
          >
            <LogOut size={20} className="text-red-400 group-hover:text-red-600" />
            {t.logout}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const { language } = useAuth();
  const t = translations[language];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 lg:px-8 justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-slate-800 dark:text-white text-lg lg:hidden">{t.appName}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">System Online</span>
            </div>
            <NotificationCenter />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chatbot" element={<HealBot />} />
            <Route path="/report-analyzer" element={<ReportAnalyzer />} />
            <Route path="/hospitals" element={<FindHospitals />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!user.hasCompletedProfile) {
    return <ProfileForm />;
  }

  if (!user.hasAcceptedPermissions) {
    return <Permissions />;
  }

  return <DashboardLayout />;
}
