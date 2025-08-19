import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
    isLoading: boolean;
    progress?: number;
    message?: string;
    error?: string;
}

export interface LoadingStateManager {
    loadingState: LoadingState;
    startLoading: (message?: string) => void;
    updateProgress: (progress: number, message?: string) => void;
    updateMessage: (message: string) => void;
    setError: (error: string) => void;
    finishLoading: () => void;
    reset: () => void;
}

export function useLoadingState(initialMessage?: string): LoadingStateManager {
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: false,
        progress: undefined,
        message: initialMessage,
        error: undefined,
    });

    const startLoading = useCallback((message?: string) => {
        setLoadingState({
            isLoading: true,
            progress: undefined,
            message: message || initialMessage,
            error: undefined,
        });
    }, [initialMessage]);

    const updateProgress = useCallback((progress: number, message?: string) => {
        setLoadingState(prev => ({
            ...prev,
            progress: Math.max(0, Math.min(100, progress)),
            message: message || prev.message,
            error: undefined,
        }));
    }, []);

    const updateMessage = useCallback((message: string) => {
        setLoadingState(prev => ({
            ...prev,
            message,
            error: undefined,
        }));
    }, []);

    const setError = useCallback((error: string) => {
        setLoadingState(prev => ({
            ...prev,
            error,
            isLoading: false,
        }));
    }, []);

    const finishLoading = useCallback(() => {
        setLoadingState(prev => ({
            ...prev,
            isLoading: false,
            progress: 100,
        }));
    }, []);

    const reset = useCallback(() => {
        setLoadingState({
            isLoading: false,
            progress: undefined,
            message: initialMessage,
            error: undefined,
        });
    }, [initialMessage]);

    return {
        loadingState,
        startLoading,
        updateProgress,
        updateMessage,
        setError,
        finishLoading,
        reset,
    };
}

// Hook for managing multiple async operations
export interface AsyncOperation {
    id: string;
    name: string;
    progress?: number;
    status: 'pending' | 'running' | 'completed' | 'error';
    error?: string;
}

export interface AsyncOperationManager {
    operations: AsyncOperation[];
    addOperation: (id: string, name: string) => void;
    startOperation: (id: string) => void;
    updateOperationProgress: (id: string, progress: number) => void;
    completeOperation: (id: string) => void;
    failOperation: (id: string, error: string) => void;
    removeOperation: (id: string) => void;
    clearOperations: () => void;
    getOverallProgress: () => number;
    isAnyOperationRunning: () => boolean;
}

export function useAsyncOperations(): AsyncOperationManager {
    const [operations, setOperations] = useState<AsyncOperation[]>([]);

    const addOperation = useCallback((id: string, name: string) => {
        setOperations(prev => [
            ...prev.filter(op => op.id !== id),
            { id, name, status: 'pending' }
        ]);
    }, []);

    const startOperation = useCallback((id: string) => {
        setOperations(prev =>
            prev.map(op =>
                op.id === id
                    ? { ...op, status: 'running' as const, progress: 0, error: undefined }
                    : op
            )
        );
    }, []);

    const updateOperationProgress = useCallback((id: string, progress: number) => {
        setOperations(prev =>
            prev.map(op =>
                op.id === id
                    ? { ...op, progress: Math.max(0, Math.min(100, progress)) }
                    : op
            )
        );
    }, []);

    const completeOperation = useCallback((id: string) => {
        setOperations(prev =>
            prev.map(op =>
                op.id === id
                    ? { ...op, status: 'completed' as const, progress: 100, error: undefined }
                    : op
            )
        );
    }, []);

    const failOperation = useCallback((id: string, error: string) => {
        setOperations(prev =>
            prev.map(op =>
                op.id === id
                    ? { ...op, status: 'error' as const, error }
                    : op
            )
        );
    }, []);

    const removeOperation = useCallback((id: string) => {
        setOperations(prev => prev.filter(op => op.id !== id));
    }, []);

    const clearOperations = useCallback(() => {
        setOperations([]);
    }, []);

    const getOverallProgress = useCallback(() => {
        if (operations.length === 0) return 0;

        const totalProgress = operations.reduce((sum, op) => {
            if (op.status === 'completed') return sum + 100;
            if (op.status === 'running' && op.progress !== undefined) return sum + op.progress;
            return sum;
        }, 0);

        return totalProgress / operations.length;
    }, [operations]);

    const isAnyOperationRunning = useCallback(() => {
        return operations.some(op => op.status === 'running');
    }, [operations]);

    return {
        operations,
        addOperation,
        startOperation,
        updateOperationProgress,
        completeOperation,
        failOperation,
        removeOperation,
        clearOperations,
        getOverallProgress,
        isAnyOperationRunning,
    };
}

// Hook for debounced loading states (useful for search/filter operations)
export function useDebouncedLoading(delay: number = 300) {
    const [isLoading, setIsLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startLoading = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsLoading(true);
    }, []);

    const stopLoading = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsLoading(false);
        }, delay);
    }, [delay]);

    const stopLoadingImmediate = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        isLoading,
        startLoading,
        stopLoading,
        stopLoadingImmediate,
    };
}