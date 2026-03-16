import { render, screen, fireEvent } from '@testing-library/react';
import DebugPanel from './DebugPanel';

describe('DebugPanel', () => {
  it('should render the panel when visible', () => {
    render(<DebugPanel visible={true} />);
    expect(screen.getByTestId('debug-panel')).toBeInTheDocument();
  });

  it('should show "Grounded" badge when grounded property is true', () => {
    render(<DebugPanel visible={true} grounded={true} />);
    expect(screen.getByText(/Grounded/i)).toBeInTheDocument();
  });

  it('should not render when visible is false', () => {
    render(<DebugPanel visible={false} grounded={true} />);
    expect(screen.queryByTestId('debug-panel')).not.toBeInTheDocument();
  });

  it('should render memory items when provided', () => {
    render(
      <DebugPanel visible={true} memory={['Cheerios', 'Frosted Flakes']} />
    );
    expect(screen.getByText(/Cheerios/)).toBeInTheDocument();
    expect(screen.getByText(/Frosted Flakes/)).toBeInTheDocument();
  });

  it('should show session ID when provided', () => {
    render(
      <DebugPanel visible={true} sessionId="abc12345-test" />
    );
    expect(screen.getByText(/abc12345/)).toBeInTheDocument();
  });

  it('should show WebSocket connection status', () => {
    render(<DebugPanel visible={true} wsConnected={true} />);
    expect(screen.getByText(/Voice/i)).toBeInTheDocument();
  });

  it('should show latency when provided', () => {
    render(<DebugPanel visible={true} latencyMs={450} />);
    expect(screen.getByText(/450ms/)).toBeInTheDocument();
  });

  it('should toggle expanded/collapsed state', () => {
    render(
      <DebugPanel visible={true} memory={['Cheerios']} />
    );
    // Initially expanded — memory visible
    expect(screen.getByText(/Cheerios/)).toBeInTheDocument();

    // Click toggle
    fireEvent.click(screen.getByTestId('debug-toggle'));

    // Memory should be hidden
    expect(screen.queryByText(/Cheerios/)).not.toBeInTheDocument();
  });
});
