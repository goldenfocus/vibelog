import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Controls from '@/components/mic/Controls'
import type { RecordingState } from '@/components/mic/Controls'

describe('Controls Component', () => {
  const mockHandlers = {
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    onReset: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('State-dependent rendering', () => {
    it('renders idle state correctly', () => {
      render(
        <Controls
          recordingState="idle"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('mic-button-idle')).toBeInTheDocument()
      expect(screen.getByText('Tap to start recording')).toBeInTheDocument()
    })

    it('renders recording state with timer', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={65} // 1:05
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('mic-button-recording')).toBeInTheDocument()
      expect(screen.getByText('Recording...')).toBeInTheDocument()
      expect(screen.getByTestId('recording-timer')).toHaveTextContent('1:05')
    })

    it('renders processing state with spinner', () => {
      render(
        <Controls
          recordingState="processing"
          recordingTime={30}
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('mic-button-processing')).toBeInTheDocument()
      expect(screen.getByText('Processing your vibe...')).toBeInTheDocument()
      
      // Button should be disabled during processing
      expect(screen.getByTestId('mic-button-processing')).toBeDisabled()
    })

    it('renders complete state', () => {
      render(
        <Controls
          recordingState="complete"
          recordingTime={30}
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('mic-button-complete')).toBeInTheDocument()
      expect(screen.getByText('Complete! Tap to start over')).toBeInTheDocument()
    })
  })

  describe('Time formatting and limits', () => {
    it('formats time correctly', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={0}
          {...mockHandlers}
        />
      )
      expect(screen.getByTestId('recording-timer')).toHaveTextContent('0:00')
    })

    it('formats minutes and seconds correctly', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={125} // 2:05
          {...mockHandlers}
        />
      )
      expect(screen.getByTestId('recording-timer')).toHaveTextContent('2:05')
    })

    it('shows time warning near limit', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={280} // 4:40 - near 5:00 limit
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('time-warning')).toBeInTheDocument()
      expect(screen.getByText(/20 seconds remaining/)).toBeInTheDocument()
    })

    it('does not show warning when not near limit', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={60} // 1:00
          {...mockHandlers}
        />
      )

      expect(screen.queryByTestId('time-warning')).not.toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('calls onStartRecording when idle button is clicked', () => {
      render(
        <Controls
          recordingState="idle"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      fireEvent.click(screen.getByTestId('mic-button-idle'))
      expect(mockHandlers.onStartRecording).toHaveBeenCalledTimes(1)
      expect(mockHandlers.onStopRecording).not.toHaveBeenCalled()
      expect(mockHandlers.onReset).not.toHaveBeenCalled()
    })

    it('calls onStopRecording when recording button is clicked', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={30}
          {...mockHandlers}
        />
      )

      fireEvent.click(screen.getByTestId('mic-button-recording'))
      expect(mockHandlers.onStopRecording).toHaveBeenCalledTimes(1)
      expect(mockHandlers.onStartRecording).not.toHaveBeenCalled()
      expect(mockHandlers.onReset).not.toHaveBeenCalled()
    })

    it('calls onReset when complete button is clicked', () => {
      render(
        <Controls
          recordingState="complete"
          recordingTime={30}
          {...mockHandlers}
        />
      )

      fireEvent.click(screen.getByTestId('mic-button-complete'))
      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1)
      expect(mockHandlers.onStartRecording).not.toHaveBeenCalled()
      expect(mockHandlers.onStopRecording).not.toHaveBeenCalled()
    })

    it('does not call handlers when disabled', () => {
      render(
        <Controls
          recordingState="idle"
          recordingTime={0}
          disabled={true}
          {...mockHandlers}
        />
      )

      fireEvent.click(screen.getByTestId('mic-button-idle'))
      expect(mockHandlers.onStartRecording).not.toHaveBeenCalled()
    })

    it('does not call handlers during processing', () => {
      render(
        <Controls
          recordingState="processing"
          recordingTime={30}
          {...mockHandlers}
        />
      )

      const button = screen.getByTestId('mic-button-processing')
      expect(button).toBeDisabled()
      
      fireEvent.click(button)
      expect(mockHandlers.onStartRecording).not.toHaveBeenCalled()
      expect(mockHandlers.onStopRecording).not.toHaveBeenCalled()
      expect(mockHandlers.onReset).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for each state', () => {
      const states: RecordingState[] = ['idle', 'recording', 'processing', 'complete']
      
      states.forEach(state => {
        const { unmount } = render(
          <Controls
            recordingState={state}
            recordingTime={0}
            {...mockHandlers}
          />
        )
        
        const button = screen.getByTestId(`mic-button-${state}`)
        expect(button).toHaveAttribute('aria-label')
        
        unmount()
      })
    })

    it('has proper disabled state styling', () => {
      render(
        <Controls
          recordingState="processing"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      const button = screen.getByTestId('mic-button-processing')
      expect(button).toHaveClass('disabled:opacity-70', 'disabled:cursor-not-allowed')
      expect(button).toBeDisabled()
    })
  })

  describe('CSS classes and styling', () => {
    it('applies correct base classes to mic button', () => {
      render(
        <Controls
          recordingState="idle"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      const button = screen.getByTestId('mic-button-idle')
      expect(button).toHaveClass('mic')
      expect(button).toHaveClass('w-40', 'h-40', 'sm:w-48', 'sm:h-48', 'rounded-full')
      expect(button).toHaveClass('bg-gradient-electric', 'text-primary-foreground')
    })

    it('applies recording-specific classes', () => {
      render(
        <Controls
          recordingState="recording"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      const button = screen.getByTestId('mic-button-recording')
      expect(button).toHaveClass('is-recording')
    })

    it('applies complete state styling', () => {
      render(
        <Controls
          recordingState="complete"
          recordingTime={0}
          {...mockHandlers}
        />
      )

      const button = screen.getByTestId('mic-button-complete')
      expect(button).toHaveClass('!bg-secondary', '!text-secondary-foreground', 'shadow-elevated')
    })

    it('applies custom className when provided', () => {
      render(
        <Controls
          recordingState="idle"
          recordingTime={0}
          className="custom-class"
          {...mockHandlers}
        />
      )

      const container = screen.getByTestId('mic-button-idle').closest('.w-full')
      expect(container).toHaveClass('custom-class')
    })
  })
})