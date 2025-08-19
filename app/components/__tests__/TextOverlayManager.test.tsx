/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextOverlayManager from '../TextOverlayManager';
import { createTextOverlay } from '../../../lib/text-overlay';
import { UseTextOverlaysReturn } from '../../../lib/hooks/useTextOverlays';

// Mock the text overlay manager
const createMockTextOverlayManager = (overrides: Partial<UseTextOverlaysReturn> = {}): UseTextOverlaysReturn => ({
    overlays: [],
    selectedOverlayId: null,
    validationErrors: {},
    isValid: true,
    addOverlay: jest.fn(),
    removeOverlay: jest.fn(),
    updateOverlay: jest.fn(),
    duplicateOverlay: jest.fn(),
    clearAllOverlays: jest.fn(),
    selectOverlay: jest.fn(),
    getSelectedOverlay: jest.fn(() => null),
    updateOverlayPosition: jest.fn(),
    updateOverlayTiming: jest.fn(),
    updateOverlayStyle: jest.fn(),
    updateOverlayText: jest.fn(),
    updateOverlayVisibility: jest.fn(),
    updateOverlayZIndex: jest.fn(),
    getOverlayById: jest.fn(),
    getActiveOverlaysAtTime: jest.fn(() => []),
    isOverlayActiveAtTime: jest.fn(() => false),
    getOverlayCount: jest.fn(() => 0),
    hasOverlays: jest.fn(() => false),
    moveOverlayUp: jest.fn(),
    moveOverlayDown: jest.fn(),
    reorderOverlays: jest.fn(),
    ...overrides
});

describe('TextOverlayManager', () => {
    const defaultProps = {
        currentTime: 10,
        videoDuration: 120,
        onTimeSeek: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when no overlay is selected', () => {
        it('should show empty state message', () => {
            const textOverlayManager = createMockTextOverlayManager();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            expect(screen.getByText('No overlay selected')).toBeInTheDocument();
            expect(screen.getByText('Select an overlay to edit its properties')).toBeInTheDocument();
        });
    });

    describe('when an overlay is selected', () => {
        const mockOverlay = createTextOverlay('Test Overlay', { x: 0.5, y: 0.5 }, { start: 5, end: 15 });

        let textOverlayManager: UseTextOverlaysReturn;

        beforeEach(() => {
            textOverlayManager = createMockTextOverlayManager({
                selectedOverlayId: mockOverlay.id,
                getSelectedOverlay: jest.fn(() => mockOverlay)
            });
        });

        it('should show overlay editor with text content', () => {
            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            expect(screen.getByText('Text Overlay Editor')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test Overlay')).toBeInTheDocument();
        });

        it('should update text when text input changes', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const textInput = screen.getByDisplayValue('Test Overlay');
            await user.clear(textInput);
            await user.type(textInput, 'Updated Text');

            expect(textOverlayManager.updateOverlayText).toHaveBeenCalledWith(mockOverlay.id, 'Updated Text');
        });

        it('should update font size when slider changes', async () => {
            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const fontSizeSlider = screen.getByDisplayValue(mockOverlay.style.fontSize.toString());
            fireEvent.change(fontSizeSlider, { target: { value: '32' } });

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { fontSize: 32 });
        });

        it('should update text color when color input changes', async () => {
            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const colorInput = screen.getByDisplayValue(mockOverlay.style.color);
            fireEvent.change(colorInput, { target: { value: '#ff0000' } });

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { color: '#ff0000' });
        });

        it('should update font family when select changes', async () => {
            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const fontFamilySelect = screen.getByDisplayValue('Arial');
            fireEvent.change(fontFamilySelect, { target: { value: 'Helvetica, sans-serif' } });

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { fontFamily: 'Helvetica, sans-serif' });
        });

        it('should update text alignment when alignment button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const centerAlignButton = screen.getByText('↔️ Center');
            await user.click(centerAlignButton);

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { textAlign: 'center' });
        });

        it('should show advanced controls when advanced button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const advancedButton = screen.getByText('Advanced');
            await user.click(advancedButton);

            expect(screen.getByText('Background Color')).toBeInTheDocument();
            expect(screen.getByText('Border Width')).toBeInTheDocument();
            expect(screen.getByText('Opacity')).toBeInTheDocument();
        });

        it('should update timing when timing inputs change', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const startTimeInput = screen.getByDisplayValue('0:05.00');
            await user.clear(startTimeInput);
            await user.type(startTimeInput, '0:10.00');

            expect(textOverlayManager.updateOverlayTiming).toHaveBeenCalledWith(mockOverlay.id, { start: 10, end: 15 });
        });

        it('should set start time to current time when "Start Now" is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const startNowButton = screen.getByText('Start Now');
            await user.click(startNowButton);

            expect(textOverlayManager.updateOverlayTiming).toHaveBeenCalledWith(mockOverlay.id, { start: 10, end: 15 });
        });

        it('should set end time to current time when "End Now" is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    currentTime={12}
                    {...defaultProps}
                />
            );

            const endNowButton = screen.getByText('End Now');
            await user.click(endNowButton);

            expect(textOverlayManager.updateOverlayTiming).toHaveBeenCalledWith(mockOverlay.id, { start: 5, end: 12 });
        });

        it('should call onTimeSeek when "Go to Start" is clicked', async () => {
            const user = userEvent.setup();
            const onTimeSeek = jest.fn();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    onTimeSeek={onTimeSeek}
                    {...defaultProps}
                />
            );

            const goToStartButton = screen.getByText('Go to Start');
            await user.click(goToStartButton);

            expect(onTimeSeek).toHaveBeenCalledWith(5);
        });

        it('should duplicate overlay when duplicate button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const duplicateButton = screen.getByText('Duplicate');
            await user.click(duplicateButton);

            expect(textOverlayManager.duplicateOverlay).toHaveBeenCalledWith(mockOverlay.id);
        });

        it('should delete overlay when delete button is clicked and confirmed', async () => {
            const user = userEvent.setup();

            // Mock window.confirm
            const originalConfirm = window.confirm;
            window.confirm = jest.fn(() => true);

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const deleteButton = screen.getByText('Delete');
            await user.click(deleteButton);

            expect(textOverlayManager.removeOverlay).toHaveBeenCalledWith(mockOverlay.id);

            // Restore original confirm
            window.confirm = originalConfirm;
        });

        it('should not delete overlay when delete is not confirmed', async () => {
            const user = userEvent.setup();

            // Mock window.confirm
            const originalConfirm = window.confirm;
            window.confirm = jest.fn(() => false);

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const deleteButton = screen.getByText('Delete');
            await user.click(deleteButton);

            expect(textOverlayManager.removeOverlay).not.toHaveBeenCalled();

            // Restore original confirm
            window.confirm = originalConfirm;
        });

        it('should close editor when close button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            const closeButton = screen.getByText('✕');
            await user.click(closeButton);

            expect(textOverlayManager.selectOverlay).toHaveBeenCalledWith(null);
        });
    });

    describe('validation errors', () => {
        it('should display validation errors when present', () => {
            const mockOverlay = createTextOverlay('Test Overlay');
            const textOverlayManager = createMockTextOverlayManager({
                selectedOverlayId: mockOverlay.id,
                getSelectedOverlay: jest.fn(() => mockOverlay),
                validationErrors: {
                    [mockOverlay.id]: ['Text content cannot be empty', 'Invalid timing']
                },
                isValid: false
            });

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
            expect(screen.getByText('Text content cannot be empty')).toBeInTheDocument();
            expect(screen.getByText('Invalid timing')).toBeInTheDocument();
        });
    });

    describe('color presets', () => {
        it('should update color when preset color is clicked', async () => {
            const user = userEvent.setup();
            const mockOverlay = createTextOverlay('Test Overlay');
            const textOverlayManager = createMockTextOverlayManager({
                selectedOverlayId: mockOverlay.id,
                getSelectedOverlay: jest.fn(() => mockOverlay)
            });

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            // Find a preset color button (red)
            const redColorButton = screen.getByTitle('#ff0000');
            await user.click(redColorButton);

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { color: '#ff0000' });
        });
    });

    describe('advanced controls', () => {
        let textOverlayManager: UseTextOverlaysReturn;
        let mockOverlay: any;

        beforeEach(async () => {
            mockOverlay = createTextOverlay('Test Overlay');
            textOverlayManager = createMockTextOverlayManager({
                selectedOverlayId: mockOverlay.id,
                getSelectedOverlay: jest.fn(() => mockOverlay)
            });

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            // Click advanced to show advanced controls
            const user = userEvent.setup();
            const advancedButton = screen.getByText('Advanced');
            await user.click(advancedButton);
        });

        it('should enable background color when checkbox is checked', async () => {
            const user = userEvent.setup();

            const backgroundCheckbox = screen.getByRole('checkbox');
            await user.click(backgroundCheckbox);

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { backgroundColor: 'rgba(0, 0, 0, 0.7)' });
        });

        it('should update opacity when opacity slider changes', async () => {
            const opacitySlider = screen.getByDisplayValue('1');
            fireEvent.change(opacitySlider, { target: { value: '0.5' } });

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { opacity: 0.5 });
        });

        it('should update border width when border width slider changes', async () => {
            const borderWidthSlider = screen.getByDisplayValue('0');
            fireEvent.change(borderWidthSlider, { target: { value: '2' } });

            expect(textOverlayManager.updateOverlayStyle).toHaveBeenCalledWith(mockOverlay.id, { borderWidth: 2 });
        });
    });

    describe('time formatting', () => {
        it('should format time correctly', () => {
            const mockOverlay = createTextOverlay('Test', { x: 0.5, y: 0.5 }, { start: 65.5, end: 125.75 });
            const textOverlayManager = createMockTextOverlayManager({
                selectedOverlayId: mockOverlay.id,
                getSelectedOverlay: jest.fn(() => mockOverlay)
            });

            render(
                <TextOverlayManager
                    textOverlayManager={textOverlayManager}
                    {...defaultProps}
                />
            );

            // Should format 65.5 seconds as 1:05.50
            expect(screen.getByDisplayValue('1:05.50')).toBeInTheDocument();
            // Should format 125.75 seconds as 2:05.75
            expect(screen.getByDisplayValue('2:05.75')).toBeInTheDocument();
        });
    });
});