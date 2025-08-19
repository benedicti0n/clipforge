import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubtitleEditor from '../SubtitleEditor';

// Mock data
const mockSubtitleTrack = {
    id: 'test-track',
    segments: [
        {
            start: 0,
            end: 3,
            text: 'Hello world',
            confidence: 0.95
        },
        {
            start: 3.5,
            end: 6,
            text: 'This is a test subtitle',
            confidence: 0.88
        }
    ]
};

const defaultProps = {
    subtitles: [mockSubtitleTrack],
    onSubtitlesChange: jest.fn(),
    currentTime: 1.5,
    onTimeSeek: jest.fn(),
    videoDuration: 120,
    isGenerating: false,
    onGenerateSubtitles: jest.fn()
};

describe('SubtitleEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Empty State', () => {
        it('should render empty state when no subtitles are provided', () => {
            render(
                <SubtitleEditor
                    {...defaultProps}
                    subtitles={[]}
                />
            );

            expect(screen.getByText('No subtitles available')).toBeInTheDocument();
            expect(screen.getByText('Generate subtitles automatically or add them manually')).toBeInTheDocument();
        });

        it('should show generate button in empty state', () => {
            render(
                <SubtitleEditor
                    {...defaultProps}
                    subtitles={[]}
                />
            );

            expect(screen.getByText('Generate Subtitles')).toBeInTheDocument();
        });

        it('should show generating state', () => {
            render(
                <SubtitleEditor
                    {...defaultProps}
                    subtitles={[]}
                    isGenerating={true}
                />
            );

            expect(screen.getByText('Generating subtitles...')).toBeInTheDocument();
        });
    });

    describe('Subtitle Display', () => {
        it('should render subtitle segments', () => {
            render(<SubtitleEditor {...defaultProps} />);

            expect(screen.getByText('Hello world')).toBeInTheDocument();
            expect(screen.getByText('This is a test subtitle')).toBeInTheDocument();
        });

        it('should display segment count in header', () => {
            render(<SubtitleEditor {...defaultProps} />);

            expect(screen.getByText('Subtitles (2 segments)')).toBeInTheDocument();
        });

        it('should format timestamps correctly', () => {
            render(<SubtitleEditor {...defaultProps} />);

            expect(screen.getByText('00:00.000')).toBeInTheDocument(); // start of first segment
            expect(screen.getByText('00:03.000')).toBeInTheDocument(); // end of first segment
            expect(screen.getByText('00:03.500')).toBeInTheDocument(); // start of second segment
            expect(screen.getByText('00:06.000')).toBeInTheDocument(); // end of second segment
        });

        it('should highlight active segment', () => {
            render(<SubtitleEditor {...defaultProps} currentTime={1.5} />);

            // First segment should be active (currentTime 1.5 is between 0 and 3)
            const activeSegment = screen.getByText('Hello world').closest('.p-4');
            expect(activeSegment).toHaveClass('bg-blue-50', 'border-l-4', 'border-blue-500');
        });

        it('should display confidence scores', () => {
            render(<SubtitleEditor {...defaultProps} />);

            expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
            expect(screen.getByText('Confidence: 88%')).toBeInTheDocument();
        });
    });

    describe('Text Editing', () => {
        it('should enter edit mode when clicking on text', async () => {
            const user = userEvent.setup();
            render(<SubtitleEditor {...defaultProps} />);

            const textElement = screen.getByText('Hello world');
            await user.click(textElement);

            // Should show textarea with current text
            expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
        });

        it('should save text changes on Enter key', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const textElement = screen.getByText('Hello world');
            await user.click(textElement);

            const textarea = screen.getByDisplayValue('Hello world');
            await user.clear(textarea);
            await user.type(textarea, 'Updated text');
            await user.keyboard('{Enter}');

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Updated text',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });

        it('should cancel text editing on Escape key', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const textElement = screen.getByText('Hello world');
            await user.click(textElement);

            const textarea = screen.getByDisplayValue('Hello world');
            await user.clear(textarea);
            await user.type(textarea, 'Updated text');
            await user.keyboard('{Escape}');

            // Should not call onSubtitlesChange and should exit edit mode
            expect(onSubtitlesChange).not.toHaveBeenCalled();
            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });

        it('should save text changes on blur', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const textElement = screen.getByText('Hello world');
            await user.click(textElement);

            const textarea = screen.getByDisplayValue('Hello world');
            await user.clear(textarea);
            await user.type(textarea, 'Updated text');

            // Click outside to blur
            await user.click(document.body);

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Updated text',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });
    });

    describe('Timing Editing', () => {
        it('should enter edit mode when clicking on start time', async () => {
            const user = userEvent.setup();
            render(<SubtitleEditor {...defaultProps} />);

            const startTimeButton = screen.getByText('00:00.000');
            await user.click(startTimeButton);

            expect(screen.getByDisplayValue('00:00.000')).toBeInTheDocument();
        });

        it('should enter edit mode when clicking on end time', async () => {
            const user = userEvent.setup();
            render(<SubtitleEditor {...defaultProps} />);

            const endTimeButton = screen.getByText('00:03.000');
            await user.click(endTimeButton);

            expect(screen.getByDisplayValue('00:03.000')).toBeInTheDocument();
        });

        it('should save timing changes with MM:SS.mmm format', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const startTimeButton = screen.getByText('00:00.000');
            await user.click(startTimeButton);

            const input = screen.getByDisplayValue('00:00.000');
            await user.clear(input);
            await user.type(input, '00:01.500');
            await user.keyboard('{Enter}');

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 1.5,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });

        it('should save timing changes with seconds format', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const startTimeButton = screen.getByText('00:00.000');
            await user.click(startTimeButton);

            const input = screen.getByDisplayValue('00:00.000');
            await user.clear(input);
            await user.type(input, '2.5');
            await user.keyboard('{Enter}');

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 2.5,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });

        it('should enforce minimum gap between start and end times', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const startTimeButton = screen.getByText('00:00.000');
            await user.click(startTimeButton);

            const input = screen.getByDisplayValue('00:00.000');
            await user.clear(input);
            await user.type(input, '2.95'); // Very close to end time (3.0)
            await user.keyboard('{Enter}');

            // Should be constrained to 2.9 (0.1 seconds before end time)
            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 2.9,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });
    });

    describe('Segment Management', () => {
        it('should add new segment when clicking add button', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                    currentTime={10}
                />
            );

            const addButton = screen.getByText('+ Add Segment');
            await user.click(addButton);

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    },
                    {
                        start: 10,
                        end: 13,
                        text: 'New subtitle'
                    }
                ]
            }]);
        });

        it('should delete segment when clicking delete button', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const deleteButtons = screen.getAllByTitle('Delete segment');
            await user.click(deleteButtons[0]);

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });

        it('should seek to segment when clicking seek button', async () => {
            const user = userEvent.setup();
            const onTimeSeek = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onTimeSeek={onTimeSeek}
                />
            );

            const seekButtons = screen.getAllByTitle('Seek to segment');
            await user.click(seekButtons[0]);

            expect(onTimeSeek).toHaveBeenCalledWith(0);
        });

        it('should add segment after specific segment', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const addAfterButtons = screen.getAllByTitle('Add segment after this one');
            await user.click(addAfterButtons[0]);

            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3,
                        end: 3.5, // Should not overlap with next segment
                        text: 'New subtitle'
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });
    });

    describe('Accessibility and UX', () => {
        it('should show help text', () => {
            render(<SubtitleEditor {...defaultProps} />);

            expect(screen.getByText('Editing Tips:')).toBeInTheDocument();
            expect(screen.getByText('• Click on text to edit subtitle content')).toBeInTheDocument();
            expect(screen.getByText('• Active segments are highlighted in blue during playback')).toBeInTheDocument();
        });

        it('should handle empty text gracefully', () => {
            const subtitlesWithEmptyText = [{
                id: 'test-track',
                segments: [{
                    start: 0,
                    end: 3,
                    text: '',
                    confidence: 0.95
                }]
            }];

            render(
                <SubtitleEditor
                    {...defaultProps}
                    subtitles={subtitlesWithEmptyText}
                />
            );

            expect(screen.getByText('Click to edit text...')).toBeInTheDocument();
        });

        it('should focus input when entering edit mode', async () => {
            const user = userEvent.setup();
            render(<SubtitleEditor {...defaultProps} />);

            const textElement = screen.getByText('Hello world');
            await user.click(textElement);

            const textarea = screen.getByDisplayValue('Hello world');
            expect(textarea).toHaveFocus();
        });
    });

    describe('Edge Cases', () => {
        it('should handle invalid time input gracefully', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                />
            );

            const startTimeButton = screen.getByText('00:00.000');
            await user.click(startTimeButton);

            const input = screen.getByDisplayValue('00:00.000');
            await user.clear(input);
            await user.type(input, 'invalid');
            await user.keyboard('{Enter}');

            // Should default to 0 for invalid input
            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 6,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });

        it('should constrain times to video duration', async () => {
            const user = userEvent.setup();
            const onSubtitlesChange = jest.fn();

            render(
                <SubtitleEditor
                    {...defaultProps}
                    onSubtitlesChange={onSubtitlesChange}
                    videoDuration={10}
                />
            );

            const endTimeButton = screen.getByText('00:06.000');
            await user.click(endTimeButton);

            const input = screen.getByDisplayValue('00:06.000');
            await user.clear(input);
            await user.type(input, '15'); // Beyond video duration
            await user.keyboard('{Enter}');

            // Should be constrained to video duration
            expect(onSubtitlesChange).toHaveBeenCalledWith([{
                id: 'test-track',
                segments: [
                    {
                        start: 0,
                        end: 3,
                        text: 'Hello world',
                        confidence: 0.95
                    },
                    {
                        start: 3.5,
                        end: 10,
                        text: 'This is a test subtitle',
                        confidence: 0.88
                    }
                ]
            }]);
        });
    });
});