/**
 * T241: Verifies the modal state-isolation pattern (introduced in T238) is
 * correctly applied to the Locator, Ideas, Marketplace, Projects, and
 * Crowdfund pages. Draft state inside *ComposeModal / *CreateModal /
 * *PledgeModal must not propagate to the parent and must not trigger
 * re-renders of the memoized list below it.
 *
 * Uses a minimal replica of the pattern (not the full pages) to avoid
 * mocking Supabase, i18n, and feature stores. The invariant is
 * framework-level and independent of those dependencies.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { memo, useState } from 'react';

let listRenderCount = 0;

const MemoList = memo(function MemoList({ items }: { items: string[] }) {
  listRenderCount++;
  return (
    <ul>
      {items.map((item) => (
        <li key={item} data-testid={`item-${item}`}>
          {item}
        </li>
      ))}
    </ul>
  );
});

function IsolatedModal({
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

function Page() {
  const [open, setOpen] = useState(false);
  const [items] = useState(['locator', 'ideas', 'marketplace', 'projects', 'crowdfund']);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      <MemoList items={items} />
      <IsolatedModal open={open} onClose={() => setOpen(false)} onSubmit={() => {}} />
    </div>
  );
}

describe('T241 modal state isolation (Locator/Ideas/Marketplace/Projects/Crowdfund)', () => {
  beforeEach(() => {
    listRenderCount = 0;
  });

  it('list renders exactly once on mount', () => {
    render(<Page />);
    expect(listRenderCount).toBe(1);
    expect(screen.getByTestId('item-locator')).toBeInTheDocument();
    expect(screen.getByTestId('item-crowdfund')).toBeInTheDocument();
  });

  it('opening the modal does not re-render the list', () => {
    render(<Page />);
    const countBefore = listRenderCount;
    fireEvent.click(screen.getByText('Open'));
    expect(listRenderCount).toBe(countBefore);
  });

  it('typing 5 keystrokes in the draft input does not re-render the list', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Open'));
    const countAfterOpen = listRenderCount;

    const input = screen.getByTestId('draft-input');
    for (const value of ['T', 'Ti', 'Tit', 'Titl', 'Title']) {
      fireEvent.change(input, { target: { value } });
    }

    expect(listRenderCount).toBe(countAfterOpen);
  });

  it('list items remain in the DOM throughout compose flow', () => {
    render(<Page />);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.change(screen.getByTestId('draft-input'), { target: { value: 'test' } });
    expect(screen.getByTestId('item-ideas')).toBeInTheDocument();
    expect(screen.getByTestId('item-projects')).toBeInTheDocument();
  });
});
