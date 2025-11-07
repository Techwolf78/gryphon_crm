import React from 'react';
import { toast } from 'react-toastify';
import { FaCopy, FaCheck } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and show user-friendly message
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Show toast notification
    toast.error('An unexpected error occurred. Please refresh the page if issues persist.', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopyError = async () => {
    const errorDetails = `
Error: ${this.state.error.toString()}

Stack Trace:
${this.state.error.stack || 'No stack trace available'}

${this.state.errorInfo ? `Component Stack:
${this.state.errorInfo.componentStack}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      toast.success('Error details copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      toast.error('Failed to copy error details', {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-gray-50 to-zinc-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
            {/* Main Error Card */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200/60 backdrop-blur-sm overflow-hidden">
              {/* Header Section with Gradient */}
              <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-center relative overflow-hidden">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
                </div>

                {/* Error Icon */}
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-white/20">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 relative z-10">
                  Something went wrong
                </h1>

                {/* Subtitle */}
                <p className="text-slate-300 text-xs sm:text-sm font-medium relative z-10 max-w-xs sm:max-w-sm mx-auto leading-relaxed px-2">
                  We encountered an unexpected error. This has been logged and we're working to fix it.
                </p>
              </div>

              {/* Content Section */}
              <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Status Indicator */}
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium text-amber-800">System Status</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={this.handleRetry}
                    className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] text-sm sm:text-base"
                    aria-label="Try again to reload the application"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Try Again</span>
                    </div>
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 text-sm sm:text-base"
                    aria-label="Refresh the page"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh Page</span>
                    </div>
                  </button>
                </div>

                {/* Support Information */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-slate-600 mb-2">
                      Need immediate assistance?
                    </p>
                    <a
                      href="mailto:support@gryphonacademy.com"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm transition-colors duration-200"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Contact Support</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Error Details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 sm:mt-6 bg-slate-900 rounded-lg sm:rounded-xl overflow-hidden border border-slate-700">
                <summary className="px-4 sm:px-6 py-3 sm:py-4 text-white font-medium cursor-pointer hover:bg-slate-800 transition-colors duration-200 flex items-center justify-between text-sm sm:text-base">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Developer Information</span>
                  </div>
                  <button
                    onClick={this.handleCopyError}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-slate-700"
                    title="Copy error details"
                  >
                    {this.state.copied ? (
                      <FaCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                    ) : (
                      <FaCopy className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span className="text-xs hidden sm:inline">{this.state.copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </summary>
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-700">
                  <div className="bg-slate-800 rounded-lg p-3 sm:p-4 font-mono text-xs text-slate-300 overflow-auto max-h-48 sm:max-h-60">
                    <div className="mb-3">
                      <strong className="text-red-400">Error:</strong>
                      <div className="text-white mt-1 wrap-break-word">{this.state.error.toString()}</div>
                    </div>

                    {this.state.error.stack && (
                      <div className="mb-3">
                        <strong className="text-yellow-400">Stack Trace:</strong>
                        <pre className="text-slate-400 mt-1 whitespace-pre-wrap text-xs leading-relaxed wrap-break-word">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}

                    {this.state.errorInfo && (
                      <div>
                        <strong className="text-blue-400">Component Stack:</strong>
                        <pre className="text-slate-400 mt-1 whitespace-pre-wrap text-xs leading-relaxed wrap-break-word">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Footer */}
            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-xs text-slate-500">
                © 2025 Gryphon Academy. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;