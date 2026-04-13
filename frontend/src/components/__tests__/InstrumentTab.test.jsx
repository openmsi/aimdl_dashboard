import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InstrumentTab from '../InstrumentTab';

describe('InstrumentTab', () => {
  it('renders name and count', () => {
    render(<InstrumentTab name="MAXIMA" active={false} color="#4ECDC4" count={5} onClick={() => {}} />);
    expect(screen.getByText('MAXIMA')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<InstrumentTab name="HELIX" active={false} color="#FF6B6B" count={0} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('applies active styling when active', () => {
    const { rerender } = render(
      <InstrumentTab name="HELIX" active={false} color="#FF6B6B" count={3} onClick={() => {}} />,
    );
    const inactiveBorder = screen.getByRole('button').style.border;
    rerender(<InstrumentTab name="HELIX" active={true} color="#FF6B6B" count={3} onClick={() => {}} />);
    expect(screen.getByRole('button').style.border).not.toBe(inactiveBorder);
  });
});
