import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, ShieldCheck, AlertCircle, ArrowLeft, Check, Key, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GoogleAccount {
  email: string;
  name: string;
  password: string; // The Google account password in the database
  avatarUrl?: string;
  isCustom?: boolean;
}

const DEFAULT_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    email: '240160226137.chetna@gdgu.org',
    name: 'Chetna Sharma',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'chetna.health@gmail.com',
    name: 'Chetna (Personal)',
    password: 'password123',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'john.doe@gmail.com',
    name: 'John Doe',
    password: 'googlepass123',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'sarah.medical@gmail.com',
    name: 'Dr. Sarah Miller',
    password: 'health2026password',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'
  }
];

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<'SELECT' | 'PASSWORD' | 'NEW_ACCOUNT' | 'PERMISSIONS'>('SELECT');
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);
  
  // Password step state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // New account form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmailError, setNewEmailError] = useState<string | null>(null);

  // Load registered accounts from localStorage database
  useEffect(() => {
    if (isOpen) {
      const storedGoogleDb = localStorage.getItem('google_accounts_db');
      let combinedAccounts = [...DEFAULT_GOOGLE_ACCOUNTS];
      
      if (storedGoogleDb) {
        try {
          const parsed: GoogleAccount[] = JSON.parse(storedGoogleDb);
          // Merge custom accounts not in default
          parsed.forEach(acc => {
            if (!combinedAccounts.some(a => a.email.toLowerCase() === acc.email.toLowerCase())) {
              combinedAccounts.push(acc);
            }
          });
        } catch (e) {
          console.error("Failed to parse google_accounts_db", e);
        }
      }

      // Also merge any users from healbot_users_db
      const healbotUsersDb = localStorage.getItem('healbot_users_db');
      if (healbotUsersDb) {
        try {
          const parsedUsers = JSON.parse(healbotUsersDb);
          Object.keys(parsedUsers).forEach(email => {
            if (!combinedAccounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
              const u = parsedUsers[email];
              combinedAccounts.push({
                email: u.email,
                name: u.name || u.email.split('@')[0],
                password: u.password || 'password123',
                isCustom: true
              });
            }
          });
        } catch (e) {
          console.error("Failed to parse healbot_users_db", e);
        }
      }

      setAccounts(combinedAccounts);
      setStep('SELECT');
      setSelectedAccount(null);
      setPassword('');
      setPasswordError(null);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAccount = (acc: GoogleAccount) => {
    setSelectedAccount(acc);
    setPassword('');
    setPasswordError(null);
    setStep('PASSWORD');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsVerifying(true);
    setPasswordError(null);

    setTimeout(() => {
      setIsVerifying(false);
      // Verify password against Google DB
      if (password === selectedAccount.password) {
        // Password matches! Advance to Google Permissions screen
        setStep('PERMISSIONS');
      } else {
        // Wrong password error
        setPasswordError('Wrong password. Try again or click Forgot password to reset it.');
      }
    }, 600);
  };

  const handleCreateNewAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      setNewEmailError('Please enter a valid Gmail or Google Workspace email address.');
      return;
    }
    if (newPassword.length < 6) {
      setNewEmailError('Google Account passwords must be at least 6 characters long.');
      return;
    }

    const createdAccount: GoogleAccount = {
      email: newEmail.trim(),
      name: newName.trim() || newEmail.split('@')[0],
      password: newPassword,
      isCustom: true
    };

    // Save to Google DB
    const storedGoogleDb = localStorage.getItem('google_accounts_db');
    let existingList: GoogleAccount[] = storedGoogleDb ? JSON.parse(storedGoogleDb) : [];
    existingList = existingList.filter(a => a.email.toLowerCase() !== createdAccount.email.toLowerCase());
    existingList.push(createdAccount);
    localStorage.setItem('google_accounts_db', JSON.stringify(existingList));

    setSelectedAccount(createdAccount);
    setStep('PERMISSIONS');
  };

  const handleGrantPermissionsAndLogin = () => {
    if (!selectedAccount) return;

    // Save user to healbot_users_db
    login(selectedAccount.email, {
      name: selectedAccount.name,
      hasCompletedProfile: true,
      hasAcceptedPermissions: true
    });

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col font-sans"
      >
        {/* Top Header bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Official Google 'G' Logo */}
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sign in with Google</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Modal Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT ACCOUNT */}
            {step === 'SELECT' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Choose an account</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">to continue to <span className="font-semibold text-blue-600">HealBot AI</span></p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                  {accounts.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex items-center gap-3.5 text-left group"
                    >
                      {acc.avatarUrl ? (
                        <img src={acc.avatarUrl} alt={acc.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {acc.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{acc.email}</div>
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      setStep('NEW_ACCOUNT');
                      setNewEmailError(null);
                    }}
                    className="w-full p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <User size={18} className="text-blue-600" />
                    Use another Google account
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                  To continue, Google will share your name, email address, language preference, and profile picture with HealBot AI.
                </p>
              </motion.div>
            )}

            {/* STEP 2: PASSWORD VERIFICATION */}
            {step === 'PASSWORD' && selectedAccount && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setStep('SELECT')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to accounts
                </button>

                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User size={14} className="text-blue-600" />
                    {selectedAccount.email}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome, {selectedAccount.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enter your Google Account password to verify your identity</p>
                </div>

                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs font-medium"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </motion.div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Enter Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoFocus
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-sm transition-all"
                        placeholder="Google password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Default test pwd: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 font-mono">{selectedAccount.password}</code></span>
                    <button type="button" onClick={() => alert(`Password for ${selectedAccount.email} is: ${selectedAccount.password}`)} className="text-blue-600 font-bold hover:underline">
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying with Google...
                      </>
                    ) : (
                      'Next & Verify'
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP: NEW GOOGLE ACCOUNT */}
            {step === 'NEW_ACCOUNT' && (
              <motion.div
                key="new"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <button
                  onClick={() => setStep('SELECT')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to account list
                </button>

                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Add Google Account</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter your Gmail or Google Workspace credentials</p>
                </div>

                {newEmailError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                    <AlertCircle size={14} /> {newEmailError}
                  </div>
                )}

                <form onSubmit={handleCreateNewAccountSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Gmail / Google Email</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-sm"
                      placeholder="yourname@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-sm"
                      placeholder="Your Full Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Set Google Account Password</label>
                    <input
                      type="password"
                      required
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white font-medium text-sm"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 text-sm"
                  >
                    Add & Continue
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: GOOGLE PERMISSION CONSENT SCREEN */}
            {step === 'PERMISSIONS' && selectedAccount && (
              <motion.div
                key="permissions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">HealBot AI wants to access your Google Account</h2>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <User size={12} className="text-blue-500" />
                    {selectedAccount.email}
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">This will allow HealBot AI to:</p>
                  
                  <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} />
                      </div>
                      <span>See your personal info, including name and Google profile picture</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} />
                      </div>
                      <span>See your primary Google email address (<code className="text-blue-600 dark:text-blue-400 font-mono">{selectedAccount.email}</code>)</span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} />
                      </div>
                      <span>Sync health reports, AI triage summaries, and medical profiles securely</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                  Make sure you trust HealBot AI. You can review or remove access anytime in your Google Account Settings.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('SELECT')}
                    className="w-1/2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantPermissionsAndLogin}
                    className="w-1/2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    Allow & Continue
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
