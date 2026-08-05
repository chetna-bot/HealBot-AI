import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { Phone, User, Save, ShieldAlert } from 'lucide-react';

export const Emergency: React.FC = () => {
  const { language, user, updateProfile } = useAuth();
  const t = translations[language];
  const [personalContact, setPersonalContact] = useState(user?.emergencyPhone || '');

  const handleSave = () => {
    updateProfile({ emergencyPhone: personalContact });
    alert('Emergency contact saved!');
  };

  const emergencyNumbers = [
    { name: t.ambulance, number: '102', icon: '🚑', color: 'bg-red-50 text-red-600' },
    { name: t.police, number: '100', icon: '👮', color: 'bg-blue-50 text-blue-600' },
    { name: t.fire, number: '101', icon: '🔥', color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="text-red-600 dark:text-red-500" size={28} />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.emergency}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {emergencyNumbers.map((item, i) => (
            <div key={i} className={`p-6 rounded-2xl ${item.color} dark:bg-opacity-10 text-center`}>
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-bold text-lg">{item.number}</div>
              <div className="text-xs font-medium uppercase tracking-wider opacity-70">{item.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <User size={20} className="text-blue-600 dark:text-blue-400" />
          {t.personalContact}
        </h3>
        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="tel"
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter phone number"
              value={personalContact}
              onChange={(e) => setPersonalContact(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};
