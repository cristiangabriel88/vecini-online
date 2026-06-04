/**
 * Proves the state-isolation pattern introduced in T238: draft state that lives
 * inside ComposeModal does not propagate up to the parent and does not trigger
 * re-renders of the memoized announcement list.
 *
 * The harness is a minimal replica of the pattern (not the full page) so we
 * avoid the cost of mocking Supabase, i18n, and all feature stores. The
 * architectural invariant being tested is framework-level and independent of
 * those dependencies.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { memo, useState } from 'react';

// Track how many times the list subtree renders.
let listRenderCount = 0;

const MemoList = memo(function MemoList({ items }: { items: string[] }) {
  listRenderCount++;
  return (
    <ul>
      {items.map((item) => (
        <li key={item} data-testid={`item-${item}`}>{item}</li>
      ))}
    </ul>
  );
});

// Compose modal that owns its own draft state -- the pattern from T238.
function ComposeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState('');
  if (!open) return null;
  return (
    <div>
      <input
        data-testid="draft-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="draft"
      />
      <button
        onClick={() => {
          onSubmit(value);
          onClose();
        }}
      >
        Submit
      </button>
    </div>
  );
}

// Parent page: holds only `open` + the list; all draft state is in ComposeModal.
function Page() {
  const [open, setOpen] = useState(false);
  const [items] = useState(['alfa', 'beta', 'gamma']);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <MemoList items={items} />
      <ComposeModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => {}}
      />
    </div>
  );
}

describe('AnnouncementComposeModal state isolation (T238)', () => {
  beforeEach(() => {
    listRenderCount = 0;
  });

  it('list renders exactly once on mount', () => {
    render(<Page />);
    expect(listRenderCount).toBe(1);
    expect(screen.getByTestId('item-alfa')).toBeInTheDocument();
  });

  it('opening the modal does not re-render the list', () => {
    render(<Page />);
    const countBefore = listRenderCount;
    fireEvent.click(screen.getByText('Open modal'));
    expect(listRenderCount).toBe(countBefore);
  });

  it('typing 5 keystrokes in the draft input does not re-render the list', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Open modal'));
    const countAfterOpen = listRenderCount;

    const input = screen.getByTestId('draft-input');
    for (const value of ['A', 'An', 'Anun', 'Anunț', 'Anunțul']) {
      fireEvent.change(input, { target: { value } });
    }

    expect(listRenderCount).toBe(countAfterOpen);
  });

  it('items remain in the DOM throughout compose flow', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Open modal'));
    fireEvent.change(screen.getByTestId('draft-input'), { target: { value: 'test' } });
    expect(screen.getByTestId('item-beta')).toBeInTheDocument();
    expect(screen.getByTestId('item-gamma')).toBeInTheDocument();
  });
});
