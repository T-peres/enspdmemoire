import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ignorer complètement les erreurs de Portal removeChild
    if (
      error.message?.includes("removeChild") ||
      error.message?.includes("not a child of this node") ||
      error.name === "NotFoundError"
    ) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Ignorer les erreurs de Portal removeChild
    if (
      error.message?.includes("removeChild") ||
      error.message?.includes("not a child of this node") ||
      error.name === "NotFoundError"
    ) {
      return;
    }
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message || "Erreur inconnue"}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Recharger la page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
