// ============================================================================
// Button Tests — PulseOps V2 Design System
//
// PURPOSE: Unit tests for the shared Button component.
// ============================================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('is disabled when loading prop is true', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeDisabled();
  });

  it('applies variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild.className).toContain('bg-danger-600');
  });
});
