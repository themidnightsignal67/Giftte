import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Giftte ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen soothing-canvas text-[#161B18] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-card rounded-3xl p-8 space-y-4">
            <h1 className="font-display text-2xl font-semibold text-[#161B18]">
              Something needs a quick refresh
            </h1>
            <p className="text-sm text-[#4B544E] leading-relaxed">
              giftte hit an unexpected display state. Reloading brings everything back cleanly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[42px] px-5 py-2.5 text-sm font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-colors"
            >
              Reload giftte
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
