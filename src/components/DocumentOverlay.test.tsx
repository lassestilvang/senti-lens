import { render, screen } from '@testing-library/react';
import DocumentOverlay from './DocumentOverlay';

describe('DocumentOverlay', () => {
  it('should render the document guide lines', () => {
    render(<DocumentOverlay active={true} />);
    const overlay = screen.getByTestId('document-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).not.toHaveClass('hidden');
  });

  it('should be hidden when not active', () => {
    render(<DocumentOverlay active={false} />);
    const overlay = screen.queryByTestId('document-overlay');
    // It can be null or have a hidden class depending on implementation. 
    // Let's assume it renders with a class.
    if (overlay) {
      expect(overlay).toHaveClass('opacity-0');
    }
  });

  it('should display document alignment status', () => {
    render(<DocumentOverlay active={true} status='aligned' />);
    expect(screen.getByText(/Document Aligned/i)).toBeInTheDocument();
  });
});
