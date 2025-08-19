'use client';

import React from 'react';
import { ErrorState } from '../../lib/error-handling';

interface ErrorDisplayProps {
    error: ErrorState;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
}

export function ErrorDisplay({ error, onRetry, onDismiss, className = '' }: ErrorDisplayProps) {
    const getErrorIcon = () => {
        switch (error.type) {
            case 'network':
                return '🌐';
            case 'processing':
                return '⚙️';
            case 'validation':
                return '⚠️';
            default:
                return '❌';
        }
    };

    const getErrorColor = () => {
        switch (error.type) {
            case 'network':
                return 'blue';
            case 'processing':
                return 'orange';
            case 'validation':
                return 'yellow';
            default:
                return 'red';
        }
    };

    const color = getErrorColor();

    return (
        <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-start">
                <div className="text-2xl mr-3">{getErrorIcon()}</div>
                <div className="flex-1">
                    <h3 className={`text-lg font-semibold text-${color}-800 mb-1`}>
                        {error.type === 'network' && 'Connection Error'}
                        {error.type === 'processing' && 'Processing Error'}
                        {error.type === 'validation' && 'Validation Error'}
                        {error.type === 'system' && 'System Error'}
                    </h3>
                    <p className={`text-${color}-700 mb-2`}>{error.message}</p>

                    {error.details && (
                        <details className="mb-3">
                            <summary className={`text-sm text-${color}-600 cursor-pointer hover:text-${color}-800`}>
                                Technical Details
                            </summary>
                            <p className={`text-xs text-${color}-600 mt-1 font-mono bg-${color}-100 p-2 rounded`}>
                                {error.details}
                            </p>
                        </details>
                    )}

                    <div className="flex gap-2">
                        {error.recoverable && (onRetry || error.retryAction) && (
                            <button
                                onClick={onRetry || error.retryAction}
                                className={`px-3 py-1 bg-${color}-600 text-white rounded text-sm hover:bg-${color}-700 transition-colors`}
                            >
                                Try Again
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className={`px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 transition-colors`}
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}