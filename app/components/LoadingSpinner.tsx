'use client';

import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'gray' | 'white';
    className?: string;
}

export function LoadingSpinner({ size = 'md', color = 'blue', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    const colorClasses = {
        blue: 'border-blue-600 border-t-transparent',
        gray: 'border-gray-600 border-t-transparent',
        white: 'border-white border-t-transparent'
    };

    return (
        <div
            className={`${sizeClasses[size]} border-2 ${colorClasses[color]} rounded-full animate-spin ${className}`}
            role="status"
            aria-label="Loading"
        />
    );
}

interface LoadingStateProps {
    isLoading: boolean;
    children: React.ReactNode;
    loadingText?: string;
    spinner?: boolean;
    className?: string;
}

export function LoadingState({
    isLoading,
    children,
    loadingText = 'Loading...',
    spinner = true,
    className = ''
}: LoadingStateProps) {
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-4 ${className}`}>
                <div className="flex items-center gap-3">
                    {spinner && <LoadingSpinner />}
                    <span className="text-gray-600">{loadingText}</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}