import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../translations';

export interface User {
  email: string;
  name?: string;
  age?: string;
  gender?: string;
  bloodGroup?: string;
  diseases?: string;
  allergies?: string;
  medications?: string;
  insuranceProvider?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  hasCompletedProfile: boolean;
  hasAcceptedPermissions: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, initialData?: Partial<User>) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('healbot_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('healbot_lang') as Language) || 'en';
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('healbot_theme') as 'light' | 'dark' | 'system') || 'light';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('healbot_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('healbot_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('healbot_lang', language);
  }, [language]);

  useEffect(() => {
    const applyTheme = (themeValue: 'light' | 'dark' | 'system') => {
      const root = window.document.documentElement;
      
      let effectiveTheme: 'light' | 'dark' = 'light';
      if (themeValue === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        effectiveTheme = themeValue;
      }

      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    localStorage.setItem('healbot_theme', theme);
    applyTheme(theme);

    // If system theme, listen for changes in system preference
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const login = (email: string, initialData?: Partial<User>) => {
    const existingUsers = JSON.parse(localStorage.getItem('healbot_users_db') || '{}');
    const baseData = existingUsers[email] || { email, hasCompletedProfile: false, hasAcceptedPermissions: false };
    const userData = { ...baseData, ...initialData };
    existingUsers[email] = userData;
    localStorage.setItem('healbot_users_db', JSON.stringify(existingUsers));
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      const existingUsers = JSON.parse(localStorage.getItem('healbot_users_db') || '{}');
      existingUsers[prev.email] = updated;
      localStorage.setItem('healbot_users_db', JSON.stringify(existingUsers));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, language, setLanguage, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
