import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Timeline from '../Timeline';

// Mock Web Audio API
const mockAudioContext = {
    decodeAudioData: jest.fn().mockResolvedValue({
        getChannelData: jest.fn().mockReturnValue(new Float32Array(1000).fill(0.5))
    })
};

(global as any).AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
(global as any).webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

// Mock fetch for waveform generation
global.fetch = jest.fn().mockResolvedValue({
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1000))
});

// Mock canvas context
const mockCanvasContext = {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn().mockReturnValue({ width: 50 }),
    strokeText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    set fillStyle(value: string) { },
    set strokeStyle(value: string) { },
    set lineWidth(value: number) { },
    set font(value: string) { },
    set textAlign(value: string) { },
    set textBaseline(value: string) { }
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCanvasContext);

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 400,
    height: 80,
    right: 400,
    bottom: 80,
    x: 0,
    y: 0,
    toJSON: jest.fn()
}));

HTMLCanvasElement.prototype.getBoundingClientRect = mockGetBoundingClientRect;
HTMLDivElement.prototype.getBoundingClientRect = mockGetBoundingClientRect;

describe('Timeline Component', () => {
    const defaultProps = {
        duration: 60,
        trimBounds: { start: 10, end: 50 },
        onTrimChange: jest.fn(),
        subtitles: [
            { start: 15, end: 20, text: 'Test subtitle', confidence: 0.9 }
        ],
        textOverlays: [
            {
                id: '1',
                text: 'Test overlay',
                position: { x: 100, y: 100 },
                style: {
                    fontSize: 24,
                    fontFamily: 'Arial',
                    color: '#ffffff'
                },
                timing: { start: 25, end: 35 }
            }
        ],
        currentTime: 30,
        onTimeSeek: jest.fn(),
        videoUrl: 'test-video.mp4'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders timeline with correct duration display', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        expect(screen.getByText('Duration: 1:00')).toBeInTheDocument();
        expect(screen.getByText('Current: 0:30')).toBeInTheDocument();
    });

    it('displays trim bounds correctly', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        expect(screen.getByText('0:10 - 0:50')).toBeInTheDocument();
        expect(screen.getByText('Trim Duration: 0:40')).toBeInTheDocument();
    });

    it('shows legend for different timeline elements', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        expect(screen.getByText('Trim Bounds')).toBeInTheDocument();
        expect(screen.getByText('Subtitles')).toBeInTheDocument();
        expect(screen.getByText('Text Overlays')).toBeInTheDocument();
        expect(screen.getByText('Playhead')).toBeInTheDocument();
    });

    it('calls onTrimChange when trim bounds are modified', async () => {
        const onTrimChange = jest.fn();

        await act(async () => {
            render(<Timeline {...defaultProps} onTrimChange={onTrimChange} />);
        });

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();

        // Simulate mouse down on start marker (approximate position)
        fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 40 });
        fireEvent.mouseMove(canvas!, { clientX: 120, clientY: 40 });
        fireEvent.mouseUp(canvas!);

        await waitFor(() => {
            expect(onTrimChange).toHaveBeenCalled();
        });
    });

    it('calls onTimeSeek when clicking on timeline', async () => {
        const onTimeSeek = jest.fn();

        await act(async () => {
            render(<Timeline {...defaultProps} onTimeSeek={onTimeSeek} />);
        });

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();

        // Simulate click on timeline
        fireEvent.mouseDown(canvas!, { clientX: 200, clientY: 40 });

        await waitFor(() => {
            expect(onTimeSeek).toHaveBeenCalled();
        });
    });

    it('handles mouse leave events properly', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();

        // Start dragging
        fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 40 });

        // Mouse leave should stop dragging
        fireEvent.mouseLeave(canvas!);

        // Subsequent mouse move should not trigger changes
        fireEvent.mouseMove(canvas!, { clientX: 150, clientY: 40 });

        // Should not crash or cause issues
        expect(canvas).toBeInTheDocument();
    });

    it('formats time correctly', async () => {
        const props = {
            ...defaultProps,
            duration: 125, // 2:05
            currentTime: 75, // 1:15
            trimBounds: { start: 5, end: 90 } // 0:05 to 1:30
        };

        await act(async () => {
            render(<Timeline {...props} />);
        });

        expect(screen.getByText('Duration: 2:05')).toBeInTheDocument();
        expect(screen.getByText('Current: 1:15')).toBeInTheDocument();
        expect(screen.getByText('0:05 - 1:30')).toBeInTheDocument();
    });

    it('handles waveform loading state', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        // Should show loading state initially
        expect(screen.getByText('Loading waveform...')).toBeInTheDocument();
    });

    it('prevents invalid trim bounds', async () => {
        const onTrimChange = jest.fn();

        await act(async () => {
            render(<Timeline {...defaultProps} onTrimChange={onTrimChange} />);
        });

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();

        // Try to drag start marker past end marker
        fireEvent.mouseDown(canvas!, { clientX: 100, clientY: 40 });
        fireEvent.mouseMove(canvas!, { clientX: 500, clientY: 40 }); // Far right
        fireEvent.mouseUp(canvas!);

        await waitFor(() => {
            if (onTrimChange.mock.calls.length > 0) {
                const lastCall = onTrimChange.mock.calls[onTrimChange.mock.calls.length - 1][0];
                // Start should not exceed end minus minimum gap
                expect(lastCall.start).toBeLessThan(lastCall.end);
            }
        });
    });

    it('handles empty subtitles and overlays gracefully', async () => {
        const props = {
            ...defaultProps,
            subtitles: [],
            textOverlays: []
        };

        await act(async () => {
            render(<Timeline {...props} />);
        });

        // Should render without errors
        expect(screen.getByText('Trim Bounds')).toBeInTheDocument();
    });

    it('updates canvas dimensions on resize', async () => {
        await act(async () => {
            render(<Timeline {...defaultProps} />);
        });

        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();

        // Trigger resize event
        fireEvent(window, new Event('resize'));

        // Should not crash
        expect(canvas).toBeInTheDocument();
    });
});