export interface ErrorState {
    type: 'network' | 'processing' | 'validation' | 'system';
    message: string;
    recoverable: boolean;
    retryAction?: () => void;
    details?: string;
}

export interface ErrorLogEntry {
    timestamp: Date;
    error: Error;
    context?: string;
    userAgent?: string;
    url?: string;
}

export class ErrorLogger {
    private static logs: ErrorLogEntry[] = [];
    private static maxLogs = 100;

    static log(error: Error, context?: string): void {
        const entry: ErrorLogEntry = {
            timestamp: new Date(),
            error,
            context,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
        };

        this.logs.unshift(entry);

        // Keep only the most recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(`[${context || 'Unknown'}]`, error);
        }
    }

    static getLogs(): ErrorLogEntry[] {
        return [...this.logs];
    }

    static clearLogs(): void {
        this.logs = [];
    }
}

export class ErrorHandler {
    static createErrorState(
        error: Error,
        type: ErrorState['type'] = 'system',
        retryAction?: () => void
    ): ErrorState {
        let message = error.message;
        let recoverable = false;

        // Map common errors to user-friendly messages
        switch (type) {
            case 'network':
                message = 'Network connection failed. Please check your internet connection.';
                recoverable = true;
                break;
            case 'processing':
                if (error.message.includes('ffmpeg')) {
                    message = 'Video processing failed. The video format may not be supported.';
                } else if (error.message.includes('whisper')) {
                    message = 'Subtitle generation failed. Please try again or add subtitles manually.';
                } else {
                    message = 'Processing failed. Please try again.';
                }
                recoverable = true;
                break;
            case 'validation':
                message = error.message || 'Invalid input. Please check your data and try again.';
                recoverable = true;
                break;
            case 'system':
                message = 'An unexpected error occurred. Please refresh the page and try again.';
                recoverable = true;
                break;
        }

        return {
            type,
            message,
            recoverable,
            retryAction,
            details: error.message !== message ? error.message : undefined,
        };
    }

    static handleApiError(error: unknown): ErrorState {
        if (error instanceof Error) {
            ErrorLogger.log(error, 'API Error');

            if (error.message.includes('fetch')) {
                return this.createErrorState(error, 'network');
            }

            return this.createErrorState(error, 'processing');
        }

        const unknownError = new Error('Unknown API error occurred');
        ErrorLogger.log(unknownError, 'Unknown API Error');
        return this.createErrorState(unknownError, 'system');
    }

    static handleProcessingError(error: unknown, retryAction?: () => void): ErrorState {
        if (error instanceof Error) {
            ErrorLogger.log(error, 'Processing Error');
            return this.createErrorState(error, 'processing', retryAction);
        }

        const unknownError = new Error('Unknown processing error occurred');
        ErrorLogger.log(unknownError, 'Unknown Processing Error');
        return this.createErrorState(unknownError, 'processing', retryAction);
    }

    static handleValidationError(error: unknown): ErrorState {
        if (error instanceof Error) {
            ErrorLogger.log(error, 'Validation Error');
            return this.createErrorState(error, 'validation');
        }

        const unknownError = new Error('Validation failed');
        ErrorLogger.log(unknownError, 'Unknown Validation Error');
        return this.createErrorState(unknownError, 'validation');
    }
}

import React from 'react';

// Custom hook for error handling
export function useErrorHandler() {
    const [error, setError] = React.useState<ErrorState | null>(null);

    const handleError = React.useCallback((error: unknown, type?: ErrorState['type'], retryAction?: () => void) => {
        if (error instanceof Error) {
            ErrorLogger.log(error, `useErrorHandler - ${type || 'unknown'}`);
            setError(ErrorHandler.createErrorState(error, type, retryAction));
        } else {
            const unknownError = new Error('Unknown error occurred');
            ErrorLogger.log(unknownError, 'useErrorHandler - unknown');
            setError(ErrorHandler.createErrorState(unknownError, 'system', retryAction));
        }
    }, []);

    const clearError = React.useCallback(() => {
        setError(null);
    }, []);

    const retry = React.useCallback(() => {
        if (error?.retryAction) {
            error.retryAction();
            clearError();
        }
    }, [error, clearError]);

    return {
        error,
        handleError,
        clearError,
        retry,
    };
}