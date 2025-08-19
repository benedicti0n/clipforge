import { ErrorLogger, ErrorHandler, ErrorState } from '../error-handling';

describe('ErrorLogger', () => {
    beforeEach(() => {
        ErrorLogger.clearLogs();
    });

    it('should log errors with context', () => {
        const error = new Error('Test error');
        const context = 'Test context';

        ErrorLogger.log(error, context);

        const logs = ErrorLogger.getLogs();
        expect(logs).toHaveLength(1);
        expect(logs[0].error).toBe(error);
        expect(logs[0].context).toBe(context);
        expect(logs[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit the number of logs', () => {
        // Create more than maxLogs entries
        for (let i = 0; i < 150; i++) {
            ErrorLogger.log(new Error(`Error ${i}`), `Context ${i}`);
        }

        const logs = ErrorLogger.getLogs();
        expect(logs.length).toBeLessThanOrEqual(100);

        // Should keep the most recent logs
        expect(logs[0].context).toBe('Context 149');
    });

    it('should clear logs', () => {
        ErrorLogger.log(new Error('Test error'), 'Test context');
        expect(ErrorLogger.getLogs()).toHaveLength(1);

        ErrorLogger.clearLogs();
        expect(ErrorLogger.getLogs()).toHaveLength(0);
    });
});

describe('ErrorHandler', () => {
    it('should create error state for network errors', () => {
        const error = new Error('Network failed');
        const errorState = ErrorHandler.createErrorState(error, 'network');

        expect(errorState.type).toBe('network');
        expect(errorState.message).toBe('Network connection failed. Please check your internet connection.');
        expect(errorState.recoverable).toBe(true);
        expect(errorState.details).toBe('Network failed');
    });

    it('should create error state for processing errors', () => {
        const error = new Error('ffmpeg processing failed');
        const errorState = ErrorHandler.createErrorState(error, 'processing');

        expect(errorState.type).toBe('processing');
        expect(errorState.message).toBe('Video processing failed. The video format may not be supported.');
        expect(errorState.recoverable).toBe(true);
    });

    it('should create error state for whisper errors', () => {
        const error = new Error('whisper failed to generate subtitles');
        const errorState = ErrorHandler.createErrorState(error, 'processing');

        expect(errorState.type).toBe('processing');
        expect(errorState.message).toBe('Subtitle generation failed. Please try again or add subtitles manually.');
        expect(errorState.recoverable).toBe(true);
    });

    it('should create error state for validation errors', () => {
        const error = new Error('Invalid input data');
        const errorState = ErrorHandler.createErrorState(error, 'validation');

        expect(errorState.type).toBe('validation');
        expect(errorState.message).toBe('Invalid input data');
        expect(errorState.recoverable).toBe(true);
    });

    it('should handle API errors', () => {
        const fetchError = new Error('fetch failed');
        const errorState = ErrorHandler.handleApiError(fetchError);

        expect(errorState.type).toBe('network');
        expect(errorState.recoverable).toBe(true);
    });

    it('should handle unknown API errors', () => {
        const errorState = ErrorHandler.handleApiError('unknown error');

        expect(errorState.type).toBe('system');
        expect(errorState.message).toBe('An unexpected error occurred. Please refresh the page and try again.');
    });

    it('should handle processing errors with retry action', () => {
        const retryFn = jest.fn();
        const error = new Error('Processing failed');
        const errorState = ErrorHandler.handleProcessingError(error, retryFn);

        expect(errorState.type).toBe('processing');
        expect(errorState.retryAction).toBe(retryFn);
        expect(errorState.recoverable).toBe(true);
    });

    it('should handle validation errors', () => {
        const error = new Error('Validation failed');
        const errorState = ErrorHandler.handleValidationError(error);

        expect(errorState.type).toBe('validation');
        expect(errorState.recoverable).toBe(true);
    });
});

describe('ErrorState interface', () => {
    it('should have correct structure', () => {
        const errorState: ErrorState = {
            type: 'network',
            message: 'Test message',
            recoverable: true,
            retryAction: jest.fn(),
            details: 'Test details'
        };

        expect(errorState.type).toBe('network');
        expect(errorState.message).toBe('Test message');
        expect(errorState.recoverable).toBe(true);
        expect(errorState.retryAction).toBeDefined();
        expect(errorState.details).toBe('Test details');
    });
});