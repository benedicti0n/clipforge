'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: boolean;
}

export function Skeleton({ className = '', width, height, rounded = false }: SkeletonProps) {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`bg-gray-200 animate-pulse ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
            style={style}
            role="status"
            aria-label="Loading content"
        />
    );
}

export function VideoPreviewSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton height={300} className="w-full" />
            <div className="flex justify-center space-x-4">
                <Skeleton width={40} height={40} rounded />
                <Skeleton width={40} height={40} rounded />
                <Skeleton width={40} height={40} rounded />
            </div>
        </div>
    );
}

export function TimelineSkeleton() {
    return (
        <div className="space-y-3">
            <div className="flex justify-between">
                <Skeleton width={60} height={20} />
                <Skeleton width={60} height={20} />
            </div>
            <Skeleton height={60} className="w-full" />
            <div className="flex justify-between">
                <Skeleton width={40} height={16} />
                <Skeleton width={40} height={16} />
            </div>
        </div>
    );
}

export function SubtitleEditorSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton width={120} height={24} />
                <Skeleton width={100} height={32} />
            </div>
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <Skeleton width={80} height={16} />
                            <Skeleton width={60} height={16} />
                        </div>
                        <Skeleton height={20} className="w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TextOverlayManagerSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton width={100} height={24} />
                <Skeleton width={80} height={32} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="p-3 border rounded-lg space-y-2">
                            <Skeleton height={16} className="w-3/4" />
                            <Skeleton height={14} className="w-1/2" />
                        </div>
                    ))}
                </div>
                <div className="space-y-3">
                    <Skeleton height={24} className="w-full" />
                    <Skeleton height={32} className="w-full" />
                    <div className="grid grid-cols-2 gap-2">
                        <Skeleton height={32} />
                        <Skeleton height={32} />
                    </div>
                </div>
            </div>
        </div>
    );
}