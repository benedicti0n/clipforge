'use client';

import React from 'react';

interface ProgressBarProps {
    progress: number; // 0-100
    label?: string;
    showPercentage?: boolean;
    color?: 'blue' | 'green' | 'orange' | 'red';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ProgressBar({
    progress,
    label,
    showPercentage = true,
    color = 'blue',
    size = 'md',
    className = ''
}: ProgressBarProps) {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    const colorClasses = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        orange: 'bg-orange-600',
        red: 'bg-red-600'
    };

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };

    return (
        <div className={`w-full ${className}`}>
            {(label || showPercentage) && (
                <div className="flex justify-between items-center mb-2">
                    {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
                    {showPercentage && (
                        <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
                    )}
                </div>
            )}
            <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
                <div
                    className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
                    style={{ width: `${clampedProgress}%` }}
                    role="progressbar"
                    aria-valuenow={clampedProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}

interface CircularProgressProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: 'blue' | 'green' | 'orange' | 'red';
    showPercentage?: boolean;
    className?: string;
}

export function CircularProgress({
    progress,
    size = 64,
    strokeWidth = 4,
    color = 'blue',
    showPercentage = true,
    className = ''
}: CircularProgressProps) {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

    const colorClasses = {
        blue: 'stroke-blue-600',
        green: 'stroke-green-600',
        orange: 'stroke-orange-600',
        red: 'stroke-red-600'
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`${colorClasses[color]} transition-all duration-300 ease-out`}
                />
            </svg>
            {showPercentage && (
                <span className="absolute text-sm font-medium text-gray-700">
                    {Math.round(clampedProgress)}%
                </span>
            )}
        </div>
    );
}