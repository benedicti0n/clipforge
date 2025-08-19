import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewControls from '../PreviewControls';

// Mock quality settings
const mockQualitySettings = {
    renderQuality: 'high' as const,
    updateFrequency: 16,
    enableSubtitles: true,
    enableTextOverlays: true,
    enablePerformanceMode: false
};

// Mock props
const mockProps = {
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    trimBounds: { start: 10, end: 100 },
    qualitySettings: mockQualitySettings,
    onPlayPause: jest.fn(),
    onTimeSeek: jest.fn(),
    onQualityChange: jest.fn(),
    onGoToStart: jest.fn(),
    onGoToEnd: jest.fn(),
    onSkipBackward: jest.fn(),
    onSkipForward: jest.fn(),
    onFrameStep: jest.fn(),
    disabled: false
};

describe('PreviewControls', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders preview controls with all buttons', () => {
        render(<PreviewControls {...mockProps} />);

        expect(screen.getByTitle('Go to start (Home)')).toBeInTheDocument();
        expect(screen.getByTitle('Skip back 10s (J)')).toBeInTheDocument();
        expect(screen.getByTitle('Previous frame (,)')).toBeInTheDocument();
        expect(screen.getByText('Play')).toBeInTheDocument();
        expect(screen.getByTitle('Next frame (.)')).toBeInTheDocument();
        expect(screen.getByTitle('Skip forward 10s (L)')).toBeInTheDocument();
        expect(screen.getByTitle('Go to end (End)')).toBeInTheDocument();
    });

    it('displays correct time formatting', () => {
        render(<PreviewControls {...mockProps} />);

        expect(screen.getByText('0:30.00')).toBeInTheDocument(); // current time
        expect(screen.getByText('2:00.00')).toBeInTheDocument(); // duration
        expect(screen.getByText('Trim: 0:10.00 - 1:40.00')).toBeInTheDocument();
    });

    it('shows pause button when playing', () => {
        render(<PreviewControls {...mockProps} isPlaying={true} />);

        expect(screen.getByText('Pause')).toBeInTheDocument();
        expect(screen.queryByText('Play')).not.toBeInTheDocument();
    });

    it('calls onPlayPause when play/pause button is clicked', () => {
        render(<PreviewControls {...mockProps} />);

        fireEvent.click(screen.getByText('Play'));
        expect(mockProps.onPlayPause).toHaveBeenCalledTimes(1);
    });

    it('calls transport control functions when buttons are clicked', () => {
        render(<PreviewControls {...mockProps} />);

        fireEvent.click(screen.getByTitle('Go to start (Home)'));
        expect(mockProps.onGoToStart).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTitle('Go to end (End)'));
        expect(mockProps.onGoToEnd).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTitle('Skip back 10s (J)'));
        expect(mockProps.onSkipBackward).toHaveBeenCalledWith(10);

        fireEvent.click(screen.getByTitle('Skip forward 10s (L)'));
        expect(mockProps.onSkipForward).toHaveBeenCalledWith(10);

        fireEvent.click(screen.getByTitle('Previous frame (,)'));
        expect(mockProps.onFrameStep).toHaveBeenCalledWith('backward');

        fireEvent.click(screen.getByTitle('Next frame (.)'));
        expect(mockProps.onFrameStep).toHaveBeenCalledWith('forward');
    });

    it('updates scrubber position and calls onTimeSeek', () => {
        render(<PreviewControls {...mockProps} />);

        const scrubber = screen.getByRole('slider');
        expect(scrubber).toHaveValue('30');

        fireEvent.change(scrubber, { target: { value: '45' } });
        expect(mockProps.onTimeSeek).toHaveBeenCalledWith(45);
    });

    it('opens and closes quality settings panel', async () => {
        render(<PreviewControls {...mockProps} />);

        const settingsButton = screen.getByTitle('Quality settings');
        fireEvent.click(settingsButton);

        await waitFor(() => {
            expect(screen.getByText('Preview Quality Settings')).toBeInTheDocument();
        });

        // Close by clicking settings button again
        fireEvent.click(settingsButton);

        await waitFor(() => {
            expect(screen.queryByText('Preview Quality Settings')).not.toBeInTheDocument();
        });
    });

    it('applies quality presets correctly', async () => {
        render(<PreviewControls {...mockProps} />);

        const settingsButton = screen.getByTitle('Quality settings');
        fireEvent.click(settingsButton);

        await waitFor(() => {
            expect(screen.getByText('Performance')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Performance'));

        expect(mockProps.onQualityChange).toHaveBeenCalledWith({
            renderQuality: 'low',
            updateFrequency: 33,
            enableSubtitles: true,
            enableTextOverlays: true,
            enablePerformanceMode: true
        });
    });

    it('updates individual quality settings', async () => {
        render(<PreviewControls {...mockProps} />);

        const settingsButton = screen.getByTitle('Quality settings');
        fireEvent.click(settingsButton);

        await waitFor(() => {
            const qualitySelect = screen.getByDisplayValue('High');
            fireEvent.change(qualitySelect, { target: { value: 'medium' } });
        });

        expect(mockProps.onQualityChange).toHaveBeenCalledWith({
            ...mockQualitySettings,
            renderQuality: 'medium'
        });
    });

    it('shows and hides keyboard help', async () => {
        render(<PreviewControls {...mockProps} />);

        const helpButton = screen.getByTitle('Keyboard shortcuts (?)');
        fireEvent.click(helpButton);

        await waitFor(() => {
            expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
        });

        fireEvent.click(helpButton);

        await waitFor(() => {
            expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
        });
    });

    it('disables all controls when disabled prop is true', () => {
        render(<PreviewControls {...mockProps} disabled={true} />);

        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
            expect(button).toBeDisabled();
        });

        const scrubber = screen.getByRole('slider');
        expect(scrubber).toBeDisabled();
    });

    it('handles keyboard shortcuts', () => {
        render(<PreviewControls {...mockProps} />);

        // Test space key for play/pause
        fireEvent.keyDown(document, { code: 'Space' });
        expect(mockProps.onPlayPause).toHaveBeenCalledTimes(1);

        // Test arrow keys for skipping
        fireEvent.keyDown(document, { code: 'ArrowLeft' });
        expect(mockProps.onSkipBackward).toHaveBeenCalledWith(5);

        fireEvent.keyDown(document, { code: 'ArrowRight' });
        expect(mockProps.onSkipForward).toHaveBeenCalledWith(5);

        // Test frame stepping
        fireEvent.keyDown(document, { code: 'Comma' });
        expect(mockProps.onFrameStep).toHaveBeenCalledWith('backward');

        fireEvent.keyDown(document, { code: 'Period' });
        expect(mockProps.onFrameStep).toHaveBeenCalledWith('forward');

        // Test home/end keys
        fireEvent.keyDown(document, { code: 'Home' });
        expect(mockProps.onGoToStart).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { code: 'End' });
        expect(mockProps.onGoToEnd).toHaveBeenCalledTimes(1);
    });

    it('shows performance mode indicator when enabled', () => {
        const performanceSettings = {
            ...mockQualitySettings,
            enablePerformanceMode: true
        };

        render(<PreviewControls {...mockProps} qualitySettings={performanceSettings} />);

        expect(screen.getByText('Performance Mode')).toBeInTheDocument();
    });

    it('shows scrubbing indicator when dragging scrubber', () => {
        render(<PreviewControls {...mockProps} />);

        const scrubber = screen.getByRole('slider');

        fireEvent.mouseDown(scrubber);
        expect(screen.getByText('Scrubbing')).toBeInTheDocument();

        fireEvent.mouseUp(scrubber);
        expect(screen.queryByText('Scrubbing')).not.toBeInTheDocument();
    });

    it('shows playing indicator when video is playing', () => {
        render(<PreviewControls {...mockProps} isPlaying={true} />);

        expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('displays correct quality and FPS information', () => {
        render(<PreviewControls {...mockProps} />);

        expect(screen.getByText('Quality: high')).toBeInTheDocument();
        expect(screen.getByText('FPS: 63')).toBeInTheDocument(); // 1000/16 ≈ 63
    });

    it('ignores keyboard shortcuts when input is focused', () => {
        render(
            <div>
                <input data-testid="text-input" />
                <PreviewControls {...mockProps} />
            </div>
        );

        const input = screen.getByTestId('text-input');
        input.focus();

        fireEvent.keyDown(document, { code: 'Space' });
        expect(mockProps.onPlayPause).not.toHaveBeenCalled();
    });

    it('ignores keyboard shortcuts when disabled', () => {
        render(<PreviewControls {...mockProps} disabled={true} />);

        fireEvent.keyDown(document, { code: 'Space' });
        expect(mockProps.onPlayPause).not.toHaveBeenCalled();
    });
});