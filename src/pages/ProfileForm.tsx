import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Droplets, Heart, ShieldAlert, Pill, Save, Sparkles } from 'lucide-react';

export const ProfileForm: React.FC = () => {
  const { user, updateProfile, language } = useAuth();
  const t = translations[language];
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || 'male',
    bloodGroup: user?.bloodGroup || '',
    diseases: user?.diseases || '',
    allergies: user?.allergies || '',
    medications: user?.medications || '',
    insuranceProvider: user?.insuranceProvider || '',
    emergencyContact: user?.emergencyContact || '',
    emergencyPhone: user?.emergencyPhone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      updateProfile({ ...formData, hasCompletedProfile: true });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const InputWrapper = ({ icon: Icon, label, children }: any) => (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
        <Icon size={14} className="text-blue-500" />
        {label}
      </label>
      {children}
    </div>
  );

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-6 font-sans relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-100/40 dark:bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-emerald-100/40 dark:bg-emerald-900/20 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 lg:p-14 border border-slate-100 dark:border-slate-800 relative z-10"
      >
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t.welcome}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t.completeProfile}</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.step} {step} {t.of} 3</p>
              <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t.basicInfo}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.basicInfoDesc}</p>
                </div>
                <div className="md:col-span-2">
                  <InputWrapper icon={User} label={t.name}>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      spellCheck="false"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </InputWrapper>
                </div>
                <InputWrapper icon={Calendar} label={t.age}>
                  <input
                    type="number"
                    required
                    autoComplete="age"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </InputWrapper>
                <InputWrapper icon={User} label={t.gender}>
                  <select
                    autoComplete="sex"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium appearance-none"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="male">{t.male}</option>
                    <option value="female">{t.female}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </InputWrapper>
                <div className="md:col-span-2">
                  <InputWrapper icon={Droplets} label={t.bloodGroup}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A+"
                      autoComplete="off"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    />
                  </InputWrapper>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t.emergencyInfo}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.emergencyInfoDesc}</p>
                </div>
                <div className="md:col-span-2">
                  <InputWrapper icon={ShieldAlert} label={t.insuranceProvider}>
                    <input
                      type="text"
                      autoComplete="off"
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                      placeholder="e.g. BlueCross"
                      value={formData.insuranceProvider}
                      onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    />
                  </InputWrapper>
                </div>
                <InputWrapper icon={User} label={t.emergencyContact}>
                  <input
                    type="text"
                    autoComplete="tel-name"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                </InputWrapper>
                <InputWrapper icon={ShieldAlert} label={t.emergencyPhone}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  />
                </InputWrapper>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t.medicalHistory}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.medicalHistoryDesc}</p>
                </div>
                <InputWrapper icon={Heart} label={t.diseases}>
                  <textarea
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium h-32 resize-none"
                    placeholder="List any chronic conditions..."
                    value={formData.diseases}
                    onChange={(e) => setFormData({ ...formData, diseases: e.target.value })}
                  />
                </InputWrapper>
                <InputWrapper icon={ShieldAlert} label={t.allergies}>
                  <textarea
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium h-32 resize-none"
                    placeholder="List any allergies (food, medicine, etc.)..."
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                </InputWrapper>
                <InputWrapper icon={Pill} label={t.medications}>
                  <textarea
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-white font-medium h-32 resize-none"
                    placeholder="List current medications and dosage..."
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  />
                </InputWrapper>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-4 mt-12">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-5 rounded-2xl transition-all active:scale-95"
              >
                {t.back}
              </button>
            )}
            <button
              type="submit"
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-3 text-lg active:scale-95"
            >
              {step === 3 ? (
                <>
                  <Save size={24} />
                  {t.save}
                </>
              ) : (
                <>
                  {t.next}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
