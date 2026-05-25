import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // you can replace this with your logging service
    // keep it quiet during normal runs but useful during debugging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="glass w-full max-w-2xl rounded-3xl p-8 text-white">
            <h2 className="mb-4 text-xl font-bold">Something went wrong</h2>
            <p className="mb-4 text-gray-300">{String(this.state.error)}</p>
            <div className="flex gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
