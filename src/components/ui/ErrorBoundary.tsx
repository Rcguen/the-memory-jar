"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
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
    console.error("Uncaught error in component:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 bg-red-50/50 dark:bg-red-950/20 backdrop-blur-sm rounded-xl border border-red-200 dark:border-red-900/50">
          <div className="flex flex-col items-center text-center max-w-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-900 dark:text-red-200">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700/80 dark:text-red-300/80">
              {this.props.fallbackMessage || "An unexpected error caused this component to crash."}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-xs text-left p-3 bg-red-100/50 dark:bg-black/20 rounded-md overflow-auto w-full max-h-32 text-red-900 dark:text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <Button 
              onClick={this.handleReset}
              variant="outline"
              className="mt-4 border-red-200 hover:bg-red-100 dark:border-red-900 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
