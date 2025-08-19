import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useAsyncOperations, useDebouncedLoading } from '../useLoadingState';

describe('useLoadingState', () => {
    it('should initialize with default state', () => {
        const { result } = renderHook(() => useLoadingState());

        expect(result.current.loadingState).toEqual({
            isLoading: false,
            progress: undefined,
            message: undefined,
            error: undefined,
        });
    });

    it('should initialize with custom message', () => {
        const { result } = renderHook(() => useLoadingState('Initial message'));

        expect(result.current.loadingState.message).toBe('Initial message');
    });

    it('should start loading', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading('Loading data...');
        });

        expect(result.current.loadingState).toEqual({
            isLoading: true,
            progress: undefined,
            message: 'Loading data...',
            error: undefined,
        });
    });

    it('should update progress', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading();
        });

        act(() => {
            result.current.updateProgress(50, 'Half way there...');
        });

        expect(result.current.loadingState.progress).toBe(50);
        expect(result.current.loadingState.message).toBe('Half way there...');
    });

    it('should clamp progress values', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.updateProgress(150);
        });
        expect(result.current.loadingState.progress).toBe(100);

        act(() => {
            result.current.updateProgress(-10);
        });
        expect(result.current.loadingState.progress).toBe(0);
    });

    it('should update message', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.updateMessage('New message');
        });

        expect(result.current.loadingState.message).toBe('New message');
    });

    it('should set error', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading();
        });

        act(() => {
            result.current.setError('Something went wrong');
        });

        expect(result.current.loadingState.error).toBe('Something went wrong');
        expect(result.current.loadingState.isLoading).toBe(false);
    });

    it('should finish loading', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading();
        });

        act(() => {
            result.current.finishLoading();
        });

        expect(result.current.loadingState.isLoading).toBe(false);
        expect(result.current.loadingState.progress).toBe(100);
    });

    it('should reset state', () => {
        const { result } = renderHook(() => useLoadingState('Initial'));

        act(() => {
            result.current.startLoading('Loading...');
            result.current.updateProgress(75);
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.loadingState).toEqual({
            isLoading: false,
            progress: undefined,
            message: 'Initial',
            error: undefined,
        });
    });
});

describe('useAsyncOperations', () => {
    it('should initialize with empty operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        expect(result.current.operations).toEqual([]);
        expect(result.current.getOverallProgress()).toBe(0);
        expect(result.current.isAnyOperationRunning()).toBe(false);
    });

    it('should add operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
        });

        expect(result.current.operations).toHaveLength(1);
        expect(result.current.operations[0]).toEqual({
            id: 'op1',
            name: 'Operation 1',
            status: 'pending',
        });
    });

    it('should start operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.startOperation('op1');
        });

        expect(result.current.operations[0].status).toBe('running');
        expect(result.current.operations[0].progress).toBe(0);
        expect(result.current.isAnyOperationRunning()).toBe(true);
    });

    it('should update operation progress', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.startOperation('op1');
            result.current.updateOperationProgress('op1', 75);
        });

        expect(result.current.operations[0].progress).toBe(75);
    });

    it('should complete operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.startOperation('op1');
            result.current.completeOperation('op1');
        });

        expect(result.current.operations[0].status).toBe('completed');
        expect(result.current.operations[0].progress).toBe(100);
        expect(result.current.isAnyOperationRunning()).toBe(false);
    });

    it('should fail operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.startOperation('op1');
            result.current.failOperation('op1', 'Operation failed');
        });

        expect(result.current.operations[0].status).toBe('error');
        expect(result.current.operations[0].error).toBe('Operation failed');
    });

    it('should calculate overall progress', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.addOperation('op2', 'Operation 2');
            result.current.startOperation('op1');
            result.current.startOperation('op2');
            result.current.updateOperationProgress('op1', 50);
            result.current.completeOperation('op2');
        });

        // (50 + 100) / 2 = 75
        expect(result.current.getOverallProgress()).toBe(75);
    });

    it('should remove operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.addOperation('op2', 'Operation 2');
        });

        expect(result.current.operations).toHaveLength(2);

        act(() => {
            result.current.removeOperation('op1');
        });

        expect(result.current.operations).toHaveLength(1);
        expect(result.current.operations[0].id).toBe('op2');
    });

    it('should clear all operations', () => {
        const { result } = renderHook(() => useAsyncOperations());

        act(() => {
            result.current.addOperation('op1', 'Operation 1');
            result.current.addOperation('op2', 'Operation 2');
        });

        act(() => {
            result.current.clearOperations();
        });

        expect(result.current.operations).toHaveLength(0);
    });
});

describe('useDebouncedLoading', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should initialize as not loading', () => {
        const { result } = renderHook(() => useDebouncedLoading());

        expect(result.current.isLoading).toBe(false);
    });

    it('should start loading immediately', () => {
        const { result } = renderHook(() => useDebouncedLoading());

        act(() => {
            result.current.startLoading();
        });

        expect(result.current.isLoading).toBe(true);
    });

    it('should stop loading after delay', () => {
        const { result } = renderHook(() => useDebouncedLoading(500));

        act(() => {
            result.current.startLoading();
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.stopLoading();
        });

        // Still loading immediately after stopLoading
        expect(result.current.isLoading).toBe(true);

        // Fast forward time
        act(() => {
            jest.advanceTimersByTime(500);
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should stop loading immediately when requested', () => {
        const { result } = renderHook(() => useDebouncedLoading());

        act(() => {
            result.current.startLoading();
        });

        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.stopLoadingImmediate();
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should cancel previous timeout when starting loading again', () => {
        const { result } = renderHook(() => useDebouncedLoading(500));

        act(() => {
            result.current.startLoading();
            result.current.stopLoading();
        });

        // Start loading again before timeout
        act(() => {
            result.current.startLoading();
        });

        // Fast forward original timeout
        act(() => {
            jest.advanceTimersByTime(500);
        });

        // Should still be loading because we started again
        expect(result.current.isLoading).toBe(true);
    });
});