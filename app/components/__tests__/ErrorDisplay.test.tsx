import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';
import { ErrorState } from '../../../lib/error-handling';

describe('ErrorDisplay', () => {
    const mockRetry = jest.fn();
    const mockDismiss = jest.fn();

    beforeEach(() => {
        mockRetry.mockClear();
        mockDismiss.mockClear();
    });

    it('should render network error correctly', () => {
        const error: ErrorState = {
            type: 'network',
            message: 'Network connection failed',
            recoverable: true,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Network connection failed')).toBeInTheDocument();
        expect(screen.getByText('🌐')).toBeInTheDocument();
    });

    it('should render processing error correctly', () => {
        const error: ErrorState = {
            type: 'processing',
            message: 'Video processing failed',
            recoverable: true,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText('Processing Error')).toBeInTheDocument();
        expect(screen.getByText('Video processing failed')).toBeInTheDocument();
        expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should render validation error correctly', () => {
        const error: ErrorState = {
            type: 'validation',
            message: 'Invalid input data',
            recoverable: true,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText('Validation Error')).toBeInTheDocument();
        expect(screen.getByText('Invalid input data')).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should render system error correctly', () => {
        const error: ErrorState = {
            type: 'system',
            message: 'System error occurred',
            recoverable: true,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText('System Error')).toBeInTheDocument();
        expect(screen.getByText('System error occurred')).toBeInTheDocument();
        expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('should show technical details when provided', () => {
        const error: ErrorState = {
            type: 'system',
            message: 'User-friendly message',
            recoverable: true,
            details: 'Technical error details',
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText('Technical Details')).toBeInTheDocument();

        // Click to expand details
        fireEvent.click(screen.getByText('Technical Details'));
        expect(screen.getByText('Technical error details')).toBeInTheDocument();
    });

    it('should show retry button for recoverable errors', () => {
        const error: ErrorState = {
            type: 'network',
            message: 'Network error',
            recoverable: true,
        };

        render(<ErrorDisplay error={error} onRetry={mockRetry} />);

        const retryButton = screen.getByText('Try Again');
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should use error retry action when no onRetry prop provided', () => {
        const retryAction = jest.fn();
        const error: ErrorState = {
            type: 'network',
            message: 'Network error',
            recoverable: true,
            retryAction,
        };

        render(<ErrorDisplay error={error} />);

        const retryButton = screen.getByText('Try Again');
        fireEvent.click(retryButton);
        expect(retryAction).toHaveBeenCalledTimes(1);
    });

    it('should show dismiss button when onDismiss provided', () => {
        const error: ErrorState = {
            type: 'system',
            message: 'System error',
            recoverable: false,
        };

        render(<ErrorDisplay error={error} onDismiss={mockDismiss} />);

        const dismissButton = screen.getByText('Dismiss');
        expect(dismissButton).toBeInTheDocument();

        fireEvent.click(dismissButton);
        expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button for non-recoverable errors without retry action', () => {
        const error: ErrorState = {
            type: 'system',
            message: 'System error',
            recoverable: false,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const error: ErrorState = {
            type: 'system',
            message: 'System error',
            recoverable: false,
        };

        const { container } = render(<ErrorDisplay error={error} className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });
});