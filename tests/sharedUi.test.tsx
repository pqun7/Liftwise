import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../src/components/ui/Button';
import { IconButton } from '../src/components/ui/IconButton';
import { Card } from '../src/components/ui/Card';
import { Input, NumericInput, Textarea } from '../src/components/ui/FormControl';
import { SegmentedControl } from '../src/components/ui/SegmentedControl';
import { BottomNavigation } from '../src/components/layout/BottomNavigation';
import { RestTimer } from '../src/features/workout/RestTimer';

describe('shared UI contracts', () => {
  it('defaults actions to button without accidentally submitting forms', () => {
    const action = vi.fn();
    render(
      <form>
        <Button onClick={action}>Save</Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(action).toHaveBeenCalledOnce();
  });
  it('retains disabled semantics and explicit submit behavior', () => {
    const action = vi.fn();
    render(
      <Button type="submit" disabled onClick={action}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
  it('keeps icon-only actions named and keyboard focusable', () => {
    render(<IconButton aria-label="Go back">←</IconButton>);
    screen.getByRole('button', { name: 'Go back' }).focus();
    expect(screen.getByRole('button')).toHaveFocus();
  });
  it('preserves semantic surfaces without domain behavior', () => {
    render(
      <Card as="article" aria-label="Summary">
        Content
      </Card>,
    );
    expect(screen.getByRole('article', { name: 'Summary' })).toHaveTextContent('Content');
  });
  it('passes refs, labels, numeric keyboard and validation attributes through', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <Input aria-label="Name" />
        <NumericInput ref={ref} aria-label="Weight" aria-invalid />
        <Textarea aria-label="Notes" />
      </>,
    );
    ref.current?.focus();
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveFocus();
    expect(ref.current).toHaveAttribute('inputmode', 'decimal');
    expect(ref.current).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: 'Notes' }).tagName).toBe('TEXTAREA');
  });
  it('uses native controlled radios with a meaningful group label', () => {
    const change = vi.fn();
    const { rerender } = render(
      <SegmentedControl legend="Range" options={['1M', 'ALL']} value="1M" onChange={change} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'ALL' }));
    expect(change).toHaveBeenCalledWith('ALL');
    rerender(
      <SegmentedControl legend="Range" options={['1M', 'ALL']} value="ALL" onChange={change} />,
    );
    expect(screen.getByRole('group', { name: 'Range' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'ALL' })).toBeChecked();
  });
  it('uses one route-aware navigation for nested feature routes', () => {
    render(
      <MemoryRouter initialEntries={['/workout/session-id']}>
        <BottomNavigation />
      </MemoryRouter>,
    );
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation.querySelectorAll('a')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Workout' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
  it('renders externally derived timer values and delegates actions', () => {
    const end = vi.fn();
    const { rerender } = render(<RestTimer remaining={90} onEnd={end} />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
    rerender(<RestTimer remaining={0} onEnd={end} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End rest' }));
    expect(end).toHaveBeenCalledOnce();
  });
});
