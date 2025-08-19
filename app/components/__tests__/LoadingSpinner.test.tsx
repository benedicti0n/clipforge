import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingState } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
    it('should render with default props', () => {
        render(<LoadingSpinner />);

        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
        expect(spinner).toHaveClass('w-6', 'h-6', 'border-blue-600');
    });

    it('should render with custom size', () => {
        render(<LoadingSpinner size="lg" />);

        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('should render with custom color', () => {
        render(<LoadingSpinner color="white" />);

        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('border-white');
    });

    it('should apply custom className', () => {
        render(<LoadingSpinner className="custom-class" />);

        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('custom-class');
    });
});

describe('LoadingState', () => {
    it('should render children when not loading', () => {
        render(
            <LoadingState isLoading={false}>
                <div>Content</div>
            </LoadingState>
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render loading state when loading', () => {
        render(
            <LoadingState isLoading={true}>
                <div>Content</div>
            </LoadingState>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should render custom loading text', () => {
        render(
            <LoadingState isLoading={true} loadingText="Processing...">
                <div>Content</div>
            </LoadingState>
        );

        expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should render without spinner when disabled', () => {
        render(
            <LoadingState isLoading={true} spinner={false}>
                <div>Content</div>
            </LoadingState>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should apply custom className to loading state', () => {
        const { container } = render(
            <LoadingState isLoading={true} className="custom-loading">
                <div>Content</div>
            </LoadingState>
        );

        expect(container.firstChild).toHaveClass('custom-loading');
    });
});