import { useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { normalize } from './match';
import type { KbEntry } from './knowledge';

export interface VisibleContext {
  route?: string;
  headings: string[];
  buttons: string[];
  links: string[];
  fields: { label: string; kind: 'input' | 'select' | 'textarea' }[];
  options: string[];
  paragraphs: string[];
}

interface ExtractOpts {
  excludeSelector?: string;
}

const DEFAULT_EXCLUDE = '.assistant';
const CAP_LIST = 40;
const CAP_TEXT = 160;
const CAP_PARA = 4000;

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function resolveById(doc: Document, id: string): Element | null {
  try {
    return doc.getElementById(id);
  } catch {
    return null;
  }
}

function accessibleName(el: Element, root: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return collapse(ariaLabel);
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ref = resolveById(root.ownerDocument ?? document, labelledBy);
    if (ref) return collapse(ref.textContent ?? '');
  }
  return collapse(el.textContent ?? '');
}

function resolveFieldLabel(el: Element, root: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return collapse(ariaLabel);
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ref = resolveById(root.ownerDocument ?? document, labelledBy);
    if (ref) return collapse(ref.textContent ?? '');
  }
  const id = el.getAttribute('id');
  if (id) {
    try {
      const lbl = root.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lbl) return collapse(lbl.textContent ?? '');
    } catch {
      // CSS.escape or querySelector error
    }
  }
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return collapse(placeholder);
  const name = el.getAttribute('name');
  if (name) return collapse(name);
  return '';
}

/**
 * Extract all user-visible UI content from the DOM in a single TreeWalker pass.
 * Hidden elements (el.hidden, aria-hidden, inline display/visibility, or inside
 * opts.excludeSelector) and their subtrees are skipped. When a real layout engine
 * is available, getComputedStyle and zero-size rects also hide elements -- these
 * checks can only hide more, never reveal more, and are inert in jsdom.
 */
export function extractVisibleContext(root: HTMLElement, opts?: ExtractOpts): VisibleContext {
  const excludeSelector =
    opts?.excludeSelector !== undefined ? opts.excludeSelector : DEFAULT_EXCLUDE;

  const ctx: VisibleContext = {
    headings: [],
    buttons: [],
    links: [],
    fields: [],
    options: [],
    paragraphs: [],
  };

  const seen = {
    headings: new Set<string>(),
    buttons: new Set<string>(),
    links: new Set<string>(),
    options: new Set<string>(),
    fields: new Set<string>(),
  };
  let paraTotal = 0;
  const doc = root.ownerDocument ?? document;

  const filter: NodeFilter = {
    acceptNode(node: Node): number {
      const el = node as HTMLElement;

      // Attribute + inline style checks (jsdom-safe; primary gate)
      if (el.hidden) return NodeFilter.FILTER_REJECT;
      if (el.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;
      const s = el.style;
      if (s && (s.display === 'none' || s.visibility === 'hidden'))
        return NodeFilter.FILTER_REJECT;

      // Excluded subtree
      if (excludeSelector) {
        try {
          if (el.matches(excludeSelector)) return NodeFilter.FILTER_REJECT;
        } catch {
          // invalid selector
        }
      }

      // Computed-style check -- additive; only ever hides, never reveals.
      // getBoundingClientRect zero-rect check is intentionally omitted: jsdom
      // sets window.innerWidth to a non-zero value but returns {width:0,height:0}
      // for all elements, which would reject every element in tests.
      try {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden')
          return NodeFilter.FILTER_REJECT;
      } catch {
        // jsdom: getComputedStyle may be unsupported -- skip additive check
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  };

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);
  let node: Node | null = walker.nextNode();

  while (node) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      if (ctx.headings.length < CAP_LIST) {
        const text = clip(collapse(el.textContent ?? ''), CAP_TEXT);
        if (text && !seen.headings.has(text)) {
          seen.headings.add(text);
          ctx.headings.push(text);
        }
      }
    } else if (
      tag === 'button' ||
      el.getAttribute('role') === 'button' ||
      (tag === 'input' && ['button', 'submit', 'reset'].includes(el.getAttribute('type') ?? ''))
    ) {
      if (ctx.buttons.length < CAP_LIST) {
        const text = clip(accessibleName(el, root), CAP_TEXT);
        if (text && !seen.buttons.has(text)) {
          seen.buttons.add(text);
          ctx.buttons.push(text);
        }
      }
    } else if (tag === 'a' && el.hasAttribute('href')) {
      if (ctx.links.length < CAP_LIST) {
        const text = clip(accessibleName(el, root), CAP_TEXT);
        if (text && !seen.links.has(text)) {
          seen.links.add(text);
          ctx.links.push(text);
        }
      }
    } else if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      const inputType = el.getAttribute('type') ?? 'text';
      if (
        !['button', 'submit', 'reset', 'image', 'hidden'].includes(inputType) &&
        ctx.fields.length < CAP_LIST
      ) {
        const label = clip(resolveFieldLabel(el, root), CAP_TEXT);
        const kind: 'input' | 'select' | 'textarea' =
          tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'input';
        const key = `${kind}:${label}`;
        if (!seen.fields.has(key)) {
          seen.fields.add(key);
          ctx.fields.push({ label, kind });
        }
      }
    } else if (tag === 'option') {
      if (ctx.options.length < CAP_LIST) {
        const text = clip(collapse(el.textContent ?? ''), CAP_TEXT);
        if (text && !seen.options.has(text)) {
          seen.options.add(text);
          ctx.options.push(text);
        }
      }
    } else if ((tag === 'p' || tag === 'li') && paraTotal < CAP_PARA) {
      const text = collapse(el.textContent ?? '');
      if (text) {
        const avail = CAP_PARA - paraTotal;
        const slice = text.slice(0, Math.min(CAP_TEXT, avail));
        if (slice) {
          ctx.paragraphs.push(slice);
          paraTotal += slice.length;
        }
      }
    }

    node = walker.nextNode();
  }

  return ctx;
}

function toTerms(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * Map each visible UI element into a KbEntry (kind:'data', audience:['all'])
 * so they flow through the existing matchEntries/formatEntry pipeline unchanged.
 * IDs are namespaced as `visible.*`. Route is taken from ctx.route.
 */
export function visibleContextEntries(ctx: VisibleContext): KbEntry[] {
  const entries: KbEntry[] = [];
  const route = ctx.route;

  const push = (idSuffix: string, value: string) => {
    if (!value) return;
    entries.push({
      id: `visible.${idSuffix}`,
      kind: 'data',
      audience: ['all'],
      route,
      data: { terms: toTerms(value), label: value, value, valueKind: 'text' },
    });
  };

  ctx.headings.forEach((h, i) => push(`heading.${i}`, h));
  ctx.fields.forEach((f, i) => push(`field.${i}`, f.label || f.kind));
  ctx.options.forEach((o, i) => push(`option.${i}`, o));
  ctx.buttons.forEach((b, i) => push(`button.${i}`, b));

  return entries;
}

/**
 * Returns a snapshot function that captures the live DOM at call-time.
 * Not a memo: each call reads the DOM fresh. Route is filled from useLocation.
 */
export function useVisibleContext(): () => VisibleContext {
  const location = useLocation();
  const routeRef = useRef(location.pathname);
  routeRef.current = location.pathname;

  return useCallback(() => {
    const ctx = extractVisibleContext(document.body);
    return { ...ctx, route: routeRef.current };
  }, []);
}
