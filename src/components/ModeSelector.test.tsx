import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from './ModeSelector';

describe('ModeSelector', () => {
  it('should render all four mode options', () => {
    render(<ModeSelector currentMode="grocery" onModeChange={jest.fn()} />);
    
    expect(screen.getByText(/Grocery/i)).toBeInTheDocument();
    expect(screen.getByText(/Document/i)).toBeInTheDocument();
    expect(screen.getByText(/Medication/i)).toBeInTheDocument();
    expect(screen.getByText(/Environment/i)).toBeInTheDocument();
  });

  it('should trigger onModeChange when a new mode is clicked', () => {
    const mockOnChange = jest.fn();
    render(<ModeSelector currentMode="grocery" onModeChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText(/Document/i));
    expect(mockOnChange).toHaveBeenCalledWith('document');
  });

  it('should highlight the current active mode', () => {
    render(<ModeSelector currentMode="medication" onModeChange={jest.fn()} />);
    const activeBtn = screen.getByText(/Medication/i).closest('button');
    expect(activeBtn).toHaveClass('bg-blue-600');
  });
});
