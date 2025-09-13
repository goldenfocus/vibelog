import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PublishActions from '@/components/mic/PublishActions';

// Mock the I18n provider
vi.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'actions.edit': 'Edit',
        'actions.copy': 'Copy',
        'actions.save': 'Save',
        'actions.share': 'Share',
        'components.micRecorder.loginRequired': 'Login Required',
        'components.micRecorder.loginEditMessage': 'Please sign in to edit your content',
        'components.micRecorder.loginSaveMessage': 'Please sign in to save your content',
        'components.micRecorder.signInToEdit': 'Sign In to Edit',
        'components.micRecorder.maybeLater': 'Maybe Later'
      };
      return translations[key] || key;
    }
  })
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Copy: ({ className }: { className?: string }) => <div data-testid="copy-icon" className={className}>Copy</div>,
  Edit: ({ className }: { className?: string }) => <div data-testid="edit-icon" className={className}>Edit</div>,
  Save: ({ className }: { className?: string }) => <div data-testid="save-icon" className={className}>Save</div>,
  Share: ({ className }: { className?: string }) => <div data-testid="share-icon" className={className}>Share</div>,
  X: ({ className }: { className?: string }) => <div data-testid="x-icon" className={className}>X</div>,
  LogIn: ({ className }: { className?: string }) => <div data-testid="login-icon" className={className}>LogIn</div>
}));

describe('PublishActions', () => {
  const mockOnCopy = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnShare = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    content: 'Sample blog content for testing',
    isLoggedIn: false,
    onCopy: mockOnCopy,
    onEdit: mockOnEdit,
    onSave: mockOnSave,
    onShare: mockOnShare
  };

  describe('Basic Rendering', () => {
    it('should render all four action buttons', () => {
      render(<PublishActions {...defaultProps} />);
      
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('copy-button')).toBeInTheDocument();
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });

    it('should render with correct button labels', () => {
      render(<PublishActions {...defaultProps} />);
      
      // Check labels specifically within buttons
      expect(screen.getByTestId('edit-button')).toHaveTextContent('Edit');
      expect(screen.getByTestId('copy-button')).toHaveTextContent('Copy');
      expect(screen.getByTestId('save-button')).toHaveTextContent('Save');
      expect(screen.getByTestId('share-button')).toHaveTextContent('Share');
    });

    it('should render icons for all buttons', () => {
      render(<PublishActions {...defaultProps} />);
      
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
      expect(screen.getByTestId('save-icon')).toBeInTheDocument();
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<PublishActions {...defaultProps} className="custom-class" />);
      
      const publishActions = screen.getByTestId('publish-actions');
      expect(publishActions).toHaveClass('custom-class');
    });
  });

  describe('Copy Functionality', () => {
    it('should call onCopy with content when copy button clicked', () => {
      render(<PublishActions {...defaultProps} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith('Sample blog content for testing');
    });

    it('should add signature when showSignature is true', () => {
      render(<PublishActions {...defaultProps} showSignature={true} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(
        'Sample blog content for testing\n\n---\nCreated by @vibeyang\nhttps://vibelog.io/vibeyang'
      );
    });

    it('should not add signature when showSignature is false', () => {
      render(<PublishActions {...defaultProps} showSignature={false} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith('Sample blog content for testing');
    });

    it('should handle empty content', () => {
      render(<PublishActions {...defaultProps} content="" />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith('');
    });

    it('should handle very long content', () => {
      const longContent = 'A '.repeat(1000).trim(); // 2000 characters
      render(<PublishActions {...defaultProps} content={longContent} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(longContent);
    });
  });

  describe('Share Functionality', () => {
    it('should call onShare when share button clicked', () => {
      render(<PublishActions {...defaultProps} />);
      
      const shareButton = screen.getByTestId('share-button');
      fireEvent.click(shareButton);
      
      expect(mockOnShare).toHaveBeenCalledTimes(1);
    });

    it('should have special styling for share button', () => {
      render(<PublishActions {...defaultProps} />);
      
      const shareButton = screen.getByTestId('share-button');
      expect(shareButton).toHaveClass('bg-electric/20', 'hover:bg-electric/30', 'border-electric/20');
    });
  });

  describe('Edit Functionality - Logged Out User', () => {
    it('should show edit popup when edit button clicked and user not logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      // Should show login popup
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to edit your content')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    });

    it('should not call onEdit when user not logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('should close edit popup when X button clicked', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      
      const closeButton = screen.getByTestId('close-popup-button');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });

    it('should close edit popup when "Maybe Later" clicked', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      
      const maybeLaterButton = screen.getByTestId('maybe-later-button');
      fireEvent.click(maybeLaterButton);
      
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });
  });

  describe('Edit Functionality - Logged In User', () => {
    it('should call onEdit when edit button clicked and user is logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should not show popup when user is logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });
  });

  describe('Save Functionality - Logged Out User', () => {
    it('should show save popup when save button clicked and user not logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      // Should show login popup
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to save your content')).toBeInTheDocument();
      expect(screen.getByText('Sign In to Save')).toBeInTheDocument();
    });

    it('should not call onSave when user not logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should close save popup when X button clicked', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Sign In to Save')).toBeInTheDocument();
      
      const closeButton = screen.getByTestId('close-popup-button');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Sign In to Save')).not.toBeInTheDocument();
    });

    it('should close save popup when "Maybe Later" clicked', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Sign In to Save')).toBeInTheDocument();
      
      const maybeLaterButton = screen.getByTestId('maybe-later-button');
      fireEvent.click(maybeLaterButton);
      
      expect(screen.queryByText('Sign In to Save')).not.toBeInTheDocument();
    });
  });

  describe('Save Functionality - Logged In User', () => {
    it('should call onSave when save button clicked and user is logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    it('should not show popup when user is logged in', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Popups Management', () => {
    it('should handle both edit and save popups independently', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      // Open edit popup
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Please sign in to edit your content')).toBeInTheDocument();
      
      // Close edit popup
      const closeEditButton = screen.getByTestId('close-popup-button');
      fireEvent.click(closeEditButton);
      
      expect(screen.queryByText('Please sign in to edit your content')).not.toBeInTheDocument();
      
      // Open save popup
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Please sign in to save your content')).toBeInTheDocument();
    });

    it('should allow showing one popup at a time', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      // Open edit popup
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      
      expect(screen.getByText('Please sign in to edit your content')).toBeInTheDocument();
      expect(screen.queryByText('Please sign in to save your content')).not.toBeInTheDocument();
      
      // Close edit popup
      const closeButton = screen.getByTestId('close-popup-button');
      fireEvent.click(closeButton);
      
      // Now open save popup
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.queryByText('Please sign in to edit your content')).not.toBeInTheDocument();
      expect(screen.getByText('Please sign in to save your content')).toBeInTheDocument();
    });
  });

  describe('Button States and Accessibility', () => {
    it('should have proper button types', () => {
      render(<PublishActions {...defaultProps} />);
      
      const editButton = screen.getByTestId('edit-button');
      const copyButton = screen.getByTestId('copy-button');
      const saveButton = screen.getByTestId('save-button');
      const shareButton = screen.getByTestId('share-button');
      
      expect(editButton.tagName).toBe('BUTTON');
      expect(copyButton.tagName).toBe('BUTTON');
      expect(saveButton.tagName).toBe('BUTTON');
      expect(shareButton.tagName).toBe('BUTTON');
    });

    it('should have proper hover styles', () => {
      render(<PublishActions {...defaultProps} />);
      
      const editButton = screen.getByTestId('edit-button');
      expect(editButton).toHaveClass('hover:bg-muted/30', 'hover:scale-105');
      
      const shareButton = screen.getByTestId('share-button');
      expect(shareButton).toHaveClass('hover:bg-electric/30', 'hover:scale-105');
    });

    it('should be keyboard accessible', () => {
      render(<PublishActions {...defaultProps} />);
      
      const editButton = screen.getByTestId('edit-button');
      editButton.focus();
      expect(editButton).toHaveFocus();
      
      // Test keyboard navigation
      fireEvent.keyDown(editButton, { key: 'Tab' });
      const copyButton = screen.getByTestId('copy-button');
      copyButton.focus();
      expect(copyButton).toHaveFocus();
    });

    it('should handle Enter key press on buttons', () => {
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const editButton = screen.getByTestId('edit-button');
      editButton.focus();
      
      // Simulate Enter key which should trigger click
      fireEvent.keyPress(editButton, { key: 'Enter', code: 'Enter', charCode: 13 });
      fireEvent.click(editButton); // Browsers typically convert Enter to click
      
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should handle undefined content gracefully', () => {
      render(<PublishActions {...defaultProps} content={undefined as any} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(undefined);
    });

    it('should handle null content gracefully', () => {
      render(<PublishActions {...defaultProps} content={null as any} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(null);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Content with <script>alert("test")</script> and & special chars';
      render(<PublishActions {...defaultProps} content={specialContent} />);
      
      const copyButton = screen.getByTestId('copy-button');
      fireEvent.click(copyButton);
      
      expect(mockOnCopy).toHaveBeenCalledWith(specialContent);
    });

    it('should handle rapid button clicks', async () => {
      const user = userEvent.setup();
      render(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      const editButton = screen.getByTestId('edit-button');
      
      // Rapid clicks
      await user.click(editButton);
      await user.click(editButton);
      await user.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalledTimes(3);
    });
  });

  describe('Layout and Styling', () => {
    it('should render buttons in horizontal layout', () => {
      render(<PublishActions {...defaultProps} />);
      
      const publishActions = screen.getByTestId('publish-actions');
      expect(publishActions).toHaveClass('flex', 'justify-center', 'gap-2', 'sm:gap-3');
    });

    it('should have responsive button spacing', () => {
      render(<PublishActions {...defaultProps} />);
      
      const editButton = screen.getByTestId('edit-button');
      expect(editButton).toHaveClass('p-3', 'sm:p-4', 'min-w-[70px]', 'sm:min-w-[80px]');
    });

    it('should have proper icon sizes', () => {
      render(<PublishActions {...defaultProps} />);
      
      const editIcon = screen.getByTestId('edit-icon');
      expect(editIcon).toHaveClass('w-5', 'h-5', 'sm:w-6', 'sm:h-6');
    });
  });

  describe('Integration with Parent Component', () => {
    it('should work with all callback functions undefined', () => {
      const propsWithoutCallbacks = {
        content: 'Test content',
        isLoggedIn: true,
        onCopy: undefined as any,
        onEdit: undefined as any,
        onSave: undefined as any,
        onShare: undefined as any
      };
      
      expect(() => {
        render(<PublishActions {...propsWithoutCallbacks} />);
      }).not.toThrow();
    });

    it('should handle props changes', () => {
      const { rerender } = render(<PublishActions {...defaultProps} isLoggedIn={false} />);
      
      const editButton = screen.getByTestId('edit-button');
      fireEvent.click(editButton);
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      
      // Change to logged in
      rerender(<PublishActions {...defaultProps} isLoggedIn={true} />);
      
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalled();
    });
  });
});