import { render, screen } from '@testing-library/react';
import ProactiveAssistOverlay from './ProactiveAssistOverlay';

describe('ProactiveAssistOverlay', () => {
  it('should not render anything when there is no suggestion', () => {
    const { container } = render(<ProactiveAssistOverlay suggestion="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render the AI Insight when a suggestion is provided', () => {
    render(<ProactiveAssistOverlay suggestion="Consider trying oatmeal, it is healthier." />);
    expect(screen.getByText(/AI Insight/i)).toBeInTheDocument();
    expect(screen.getByText(/Consider trying oatmeal/i)).toBeInTheDocument();
  });

  it('should style as a Safety Alert when suggestion includes "Hazard"', () => {
    render(<ProactiveAssistOverlay suggestion="Hazard Detected: Wet floor" />);
    expect(screen.getByText(/Safety Alert/i)).toBeInTheDocument();
    expect(screen.getByText(/Hazard Detected/i)).toBeInTheDocument();
    const alertBox = screen.getByTestId('proactive-overlay');
    expect(alertBox).toHaveClass('bg-red-600/95');
  });
});
