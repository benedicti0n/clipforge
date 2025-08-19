import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProgressBar, CircularProgress } from '../ProgressBar';

describe('ProgressBar', () => {
    it('should render with basic props', () => {
        render(<ProgressBar progress={50} />);

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '50');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render with label', () => {
        render(<ProgressBar progress={75} label="Processing video" />);

        expect(screen.getByText('Processing video')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should hide percentage when disabled', () => {
        render(<ProgressBar progress={25} showPercentage={false} />);

        expect(screen.queryByText('25%')).not.toBeInTheDocument();
    });

    it('should clamp progress values', () => {
        const { rerender } = render(<ProgressBar progress={150} />);
        expect(screen.getByText('100%')).toBeInTheDocument();

        rerender(<ProgressBar progress={-10} />);
        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should apply different colors', () => {
        const { container } = render(<ProgressBar progress={50} color="green" />);

        const progressFill = container.querySelector('.bg-green-600');
        expect(progressFill).toBeInTheDocument();
    });

    it('should apply different sizes', () => {
        const { container } = render(<ProgressBar progress={50} size="lg" />);

        const progressContainer = container.querySelector('.h-4');
        expect(progressContainer).toBeInTheDocument();
    });
});

describe('CircularProgress', () => {
    it('should render with basic props', () => {
        render(<CircularProgress progress={60} />);

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '60');
        expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should hide percentage when disabled', () => {
        render(<CircularProgress progress={40} showPercentage={false} />);

        expect(screen.queryByText('40%')).not.toBeInTheDocument();
    });

    it('should clamp progress values', () => {
        const { rerender } = render(<CircularProgress progress={120} />);
        expect(screen.getByText('100%')).toBeInTheDocument();

        rerender(<CircularProgress progress={-20} />);
        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should apply custom size', () => {
        const { container } = render(<CircularProgress progress={50} size={80} />);

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '80');
        expect(svg).toHaveAttribute('height', '80');
    });

    it('should apply different colors', () => {
        const { container } = render(<CircularProgress progress={50} color="orange" />);

        const progressCircle = container.querySelector('.stroke-orange-600');
        expect(progressCircle).toBeInTheDocument();
    });
});