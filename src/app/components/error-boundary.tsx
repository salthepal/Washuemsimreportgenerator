import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 max-w-lg w-full border-2 border-red-200 dark:border-red-900">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Something went wrong
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              The application encountered an unexpected error. Please refresh the page to continue.
            </p>
            {this.state.error && (
              <details className="bg-slate-50 dark:bg-slate-900 rounded p-4 mb-4">
                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Error Details
                </summary>
                <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
