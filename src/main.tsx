import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry, Sentry } from './services/sentry';
import { errorLogger } from './services/errorLogger';

// Initialize Sentry SDK immediately
initSentry();

// Start background health checking for data sources
errorLogger.startBackgroundHealthMonitoring();

// Fallback UI for Sentry Error Boundary in Arabic
function FallbackComponent({ error, resetError }: { error: any; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-[#050b08] text-slate-100 flex items-center justify-center p-6 text-right" dir="rtl">
      <div className="max-w-md w-full bg-slate-900/90 border border-rose-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">حدث خطأ غير متوقع</h2>
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          تم التقاط هذا الخطأ وتوثيقه بواسطة <strong>Sentry</strong> في الوقت الفعلي. يمكنك إعادة تحميل الصفحة للمتابعة.
        </p>
        <div className="p-3 rounded-lg bg-black/40 border border-slate-800 font-mono text-xs text-rose-400 mb-5 break-all max-h-32 overflow-y-auto">
          {error?.message || 'Unknown Application Error'}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors"
          >
            إعادة تحميل الصفحة
          </button>
          <button
            onClick={resetError}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={FallbackComponent} showDialog={false}>
    <App />
  </Sentry.ErrorBoundary>
);
