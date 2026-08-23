import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA service worker registered for instant background updates
registerSW({ immediate: true });

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[React Error Boundary Caught Error]:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121215] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 text-2xl font-bold">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-secondary mt-1">
                An unexpected application error occurred. You can reload the page or return to the dashboard.
              </p>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-xs font-mono text-red-300 break-words max-h-32 overflow-y-auto">
              {this.state.error ? this.state.error.toString() : 'Unknown Application Error'}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full btn-primary py-2 text-xs font-bold"
              >
                🔄 Reload Application
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="w-full btn-outline py-2 text-xs font-semibold text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              >
                🧹 Clear Local Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement._reactRoot) {
  rootElement._reactRoot = ReactDOM.createRoot(rootElement);
}

rootElement._reactRoot.render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
