import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Component error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 m-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <p className="font-bold">Notice: A component error occurred.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md text-[11px] font-semibold"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
