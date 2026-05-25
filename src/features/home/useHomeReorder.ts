import { useCallback, useEffect, useRef, useState } from 'react';
import { insertionFromPoint, type ReorderRect } from './reorderGeometry';

/**
 * F67 — pointer-driven reorder for the editable home grid. One Pointer Events
 * gesture covers mouse, touch and pen, so the old HTML5 drag (which has no touch
 * support and paints a "forbidden" cursor over the gutters between cards) is
 * gone entirely. We own the whole interaction: a drop is permitted anywhere on
 * the grid, and the caret always shows exactly where the card will land.
 *
 * Activation differs by input so each feels native:
 *  - mouse / pen: a small move past a threshold starts the drag (a click stays a
 *    click), so it is grab-and-go.
 *  - touch: a brief press-and-hold lifts the card (with a haptic tick where
 *    supported); a quick swipe before that scrolls the page as usual. Once a
 *    touch drag is live we block scroll via a non-passive `touchmove` guard.
 */

/** Press-and-hold before a touch lifts a card (ms). */
const TOUCH_HOLD_MS = 180;
/** Mouse / pen movement that promotes a press into a drag (px). */
const MOUSE_MOVE_THRESHOLD = 6;
/** Touch movement before the hold fires that we read as a scroll, not a drag (px). */
const TOUCH_SCROLL_CANCEL = 12;

interface GestureState {
  key: string | null;
  pointerId: number;
  startX: number;
  startY: number;
  isTouch: boolean;
  activated: boolean;
  holdTimer: number | null;
  blockScroll: ((e: TouchEvent) => void) | null;
  el: HTMLElement | null;
}

function emptyGesture(): GestureState {
  return {
    key: null,
    pointerId: -1,
    startX: 0,
    startY: 0,
    isTouch: false,
    activated: false,
    holdTimer: null,
    blockScroll: null,
    el: null,
  };
}

export interface HomeReorder {
  /** Key of the card currently in flight, or null. */
  draggingKey: string | null;
  /** Insertion slot (0..count) the caret points at, or null when idle. */
  dropIndex: number | null;
  /** Attach to the grid container; used to measure card rectangles live. */
  gridRef: React.RefObject<HTMLDivElement>;
  onItemPointerDown: (e: React.PointerEvent<HTMLElement>, key: string) => void;
  onItemPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onItemPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onItemPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

export function useHomeReorder(onReorder: (key: string, insertAt: number) => void): HomeReorder {
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dropRef = useRef<number | null>(null);
  const gesture = useRef<GestureState>(emptyGesture());
  // Hold the latest callback in a ref so the pointer handlers stay stable.
  const cbRef = useRef(onReorder);
  cbRef.current = onReorder;

  const setDrop = useCallback((slot: number | null) => {
    dropRef.current = slot;
    setDropIndex((prev) => (prev === slot ? prev : slot));
  }, []);

  const measure = useCallback((): ReorderRect[] => {
    const grid = gridRef.current;
    if (!grid) return [];
    return Array.from(grid.querySelectorAll<HTMLElement>('[data-card-index]')).map((el) => ({
      index: Number(el.dataset.cardIndex),
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const reset = useCallback(() => {
    const st = gesture.current;
    if (st.holdTimer !== null) clearTimeout(st.holdTimer);
    if (st.blockScroll) document.removeEventListener('touchmove', st.blockScroll);
    if (st.el && st.pointerId !== -1) {
      try {
        st.el.releasePointerCapture(st.pointerId);
      } catch {
        /* capture already released */
      }
    }
    gesture.current = emptyGesture();
    setDraggingKey(null);
    setDrop(null);
  }, [setDrop]);

  const activate = useCallback(
    (x: number, y: number) => {
      const st = gesture.current;
      st.activated = true;
      setDraggingKey(st.key);
      setDrop(insertionFromPoint(measure(), x, y));
      if (st.isTouch && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
      }
    },
    [measure, setDrop],
  );

  const onItemPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, key: string) => {
      // Mouse: primary button only. Let actual controls (the reorder / size /
      // visibility buttons) receive their click instead of starting a drag.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, input')) return;

      const el = e.currentTarget;
      const st = emptyGesture();
      st.key = key;
      st.pointerId = e.pointerId;
      st.startX = e.clientX;
      st.startY = e.clientY;
      st.isTouch = e.pointerType !== 'mouse';
      st.el = el;
      // Non-passive so it can veto scrolling, but only once the drag is live.
      st.blockScroll = (ev: TouchEvent) => {
        if (gesture.current.activated) ev.preventDefault();
      };
      document.addEventListener('touchmove', st.blockScroll, { passive: false });
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture unsupported */
      }
      gesture.current = st;

      if (st.isTouch) {
        st.holdTimer = window.setTimeout(() => {
          if (gesture.current.key === key && !gesture.current.activated) {
            activate(gesture.current.startX, gesture.current.startY);
          }
        }, TOUCH_HOLD_MS);
      }
    },
    [activate],
  );

  const onItemPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const st = gesture.current;
      if (st.key === null || e.pointerId !== st.pointerId) return;

      if (!st.activated) {
        const dist = Math.hypot(e.clientX - st.startX, e.clientY - st.startY);
        if (st.isTouch) {
          // Moved before the hold fired -> the resident is scrolling; step aside.
          if (dist > TOUCH_SCROLL_CANCEL) reset();
          return;
        }
        if (dist < MOUSE_MOVE_THRESHOLD) return;
        activate(e.clientX, e.clientY);
        return;
      }
      setDrop(insertionFromPoint(measure(), e.clientX, e.clientY));
    },
    [activate, measure, reset, setDrop],
  );

  const onItemPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const st = gesture.current;
      if (e.pointerId !== st.pointerId) return;
      if (st.activated && st.key !== null && dropRef.current !== null) {
        cbRef.current(st.key, dropRef.current);
      }
      reset();
    },
    [reset],
  );

  const onItemPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerId !== gesture.current.pointerId) return;
      reset();
    },
    [reset],
  );

  // Tear down any in-flight gesture (timer + document listener) if the grid
  // unmounts mid-drag, e.g. leaving edit mode while holding a card.
  useEffect(() => reset, [reset]);

  return {
    draggingKey,
    dropIndex,
    gridRef,
    onItemPointerDown,
    onItemPointerMove,
    onItemPointerUp,
    onItemPointerCancel,
  };
}
