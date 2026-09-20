import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F6F6F6] dark:bg-[#15162C] text-[#1C244C] dark:text-[#F6F6F6] transition-colors duration-300">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1C244C]/60 border border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.3)] shadow-2xl text-center space-y-5 animate-viewFadeIn">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-title font-extrabold text-2xl sm:text-3xl text-[#101426] dark:text-[#F6F6F6]">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                An unexpected error occurred while loading this page. Our team has been notified. Please return to the homepage or reload the application.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-left overflow-x-auto max-h-32">
                <code className="font-mono text-[11px] text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-xs bg-[#0075A2] hover:bg-[#1C244C] dark:hover:bg-[#53afd0] dark:hover:text-[#101426] text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <Home className="w-4 h-4" />
                <span>Return to Homepage</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
