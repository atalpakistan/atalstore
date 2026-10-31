import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Store in global window object for diagnostic access
    if (typeof window !== 'undefined') {
      (window as any).__LAST_REACT_ERROR__ = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      };
    }

    console.group('🚨 [ErrorBoundary Diagnostic Log]');
    console.error('❌ Uncaught Exception:', error.name, '-', error.message);
    console.error('📜 JS Call Stack:\n', error.stack);
    console.error('🧩 Component Stack:\n', errorInfo.componentStack);
    console.groupEnd();
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 font-sans selection:bg-[#093824] selection:text-amber-200">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-lg w-full border border-slate-200 text-center space-y-5">
            <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto font-bold text-2xl">
              ⚠️
            </div>
            
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                An unexpected error occurred while rendering this page. You can try refreshing or returning to the storefront homepage.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold rounded-xl text-xs sm:text-sm transition shadow"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm transition"
              >
                Return to Storefront
              </button>
            </div>

            {/* Diagnostic Details Toggle for Admin / Developer Debugging */}
            <div className="pt-4 border-t border-slate-100 text-left">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition underline flex items-center gap-1 mx-auto"
              >
                <span>{this.state.showDetails ? 'Hide Diagnostic Info' : 'Show Diagnostic Info'}</span>
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3.5 bg-slate-900 text-amber-300 rounded-2xl text-[11px] font-mono space-y-2 overflow-x-auto max-h-60 no-scrollbar">
                  <div>
                    <strong className="text-rose-400 block">Error Message:</strong>
                    <span>{this.state.error?.message || 'Unknown error'}</span>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong className="text-emerald-400 block">Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-[10px] text-slate-300">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

