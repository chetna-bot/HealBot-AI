import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { translations } from '../translations';
import { 
  FileText, 
  Upload, 
  Search, 
  History, 
  Trash2, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  FileCheck,
  Brain,
  MessageSquare,
  ArrowLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeMedicalReport } from '../services/geminiService';

interface MedicalReport {
  id: number;
  reportName: string;
  reportType: string;
  analysis: string;
  createdAt: string;
}

export const ReportAnalyzer: React.FC = () => {
  const { language, user } = useAuth();
  const t = translations[language];
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [viewingReport, setViewingReport] = useState<MedicalReport | null>(null);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/reports/${user.email}`);
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisError(null);
    }
  };

  const getMimeType = (file: File): string => {
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return file.type || 'image/jpeg';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !user?.email) return;

    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    setAnalysisError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const mimeType = getMimeType(selectedFile);

      const langMap: Record<string, string> = {
        en: 'English',
        hi: 'Hindi',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        zh: 'Chinese',
        ja: 'Japanese',
        ru: 'Russian',
        pt: 'Portuguese'
      };
      const targetLang = langMap[language] || 'English';

      const analysisText = await analyzeMedicalReport(base64, mimeType, targetLang);
      setCurrentAnalysis(analysisText);

      // Save to database
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          reportName: selectedFile.name,
          reportType: mimeType.startsWith('image/') ? 'Image' : 'PDF',
          analysis: analysisText,
          metadata: { size: selectedFile.size, lastModified: selectedFile.lastModified }
        })
      });

      fetchReports();
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(err?.message || 'Failed to analyze report. Please ensure the file is a clear photo or PDF.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      setReports(reports.filter(r => r.id !== id));
      if (viewingReport?.id === id) setViewingReport(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <header>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Brain className="text-blue-600 dark:text-blue-400" size={32} />
          {t.reportAnalyzer}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Upload your medical reports for an instant AI-powered explanation and analysis.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload & Analysis Section */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div 
              className={`border-4 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all ${
                selectedFile ? 'border-emerald-500/50 bg-emerald-50/10' : 'border-slate-100 dark:border-slate-800 hover:border-blue-500/50'
              }`}
            >
              {selectedFile ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                    <FileCheck size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 text-xs font-bold hover:underline"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                    <Upload size={32} />
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">{t.selectFile}</p>
                  <p className="text-slate-400 text-sm mt-1 mb-6 text-center max-w-xs">Supports Blood Reports, X-Rays, Scans (JPG, PNG, PDF)</p>
                  <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold cursor-pointer transition-all shadow-lg shadow-blue-200 dark:shadow-none">
                    Browse Files
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                  </label>
                </>
              )}
            </div>

            {selectedFile && !isAnalyzing && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleAnalyze}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 dark:shadow-none transition-all"
              >
                <Search size={20} />
                {t.analyzeReport}
              </motion.button>
            )}

            {isAnalyzing && (
              <div className="mt-8 text-center space-y-4">
                <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
                <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">{t.analyzing}</p>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-full h-full bg-blue-600"
                  />
                </div>
              </div>
            )}

            {analysisError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-400 text-sm"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                  <p className="font-bold">Analysis Failed</p>
                  <p>{analysisError}</p>
                </div>
              </motion.div>
            )}
          </section>

          <AnimatePresence>
            {(currentAnalysis || viewingReport) && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">Analysis Result</h3>
                      {viewingReport && <p className="text-xs text-slate-400">{viewingReport.reportName}</p>}
                    </div>
                  </div>
                  {viewingReport && (
                    <button 
                      onClick={() => setViewingReport(null)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                  <div className="prose prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white prose-p:text-slate-900 dark:prose-p:text-slate-100 prose-li:text-slate-900 dark:prose-li:text-slate-100 font-medium">
                    <ReactMarkdown>{currentAnalysis || viewingReport?.analysis || ''}</ReactMarkdown>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertCircle className="shrink-0" size={20} />
                  <p>AI can make mistakes. Always verify these results with a qualified healthcare professional.</p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* History Section */}
        <aside className="space-y-6">
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <History size={20} className="text-slate-400" />
              Recent Analysis
            </h3>

            {isLoadingHistory ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="mx-auto text-slate-200 dark:text-slate-800 mb-2" size={48} />
                <p className="text-sm text-slate-400 px-4">{t.noReports}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      viewingReport?.id === report.id 
                        ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => {
                      setViewingReport(report);
                      setCurrentAnalysis(null);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        report.reportType === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{report.reportName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white">
            <h4 className="font-bold mb-2">Secure Storage</h4>
            <p className="text-white/80 text-xs leading-relaxed">
              Your reports are stored securely in our database. We use advanced AI to help you understand complex medical jargon.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
