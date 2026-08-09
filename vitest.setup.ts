import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Shared test environment.
 *
 * Everything here is a jsdom gap, not a convenience. jsdom implements the DOM,
 * not a browser, so anything a component reaches for that jsdom does not
 * provide throws — and the resulting failure names the missing API rather than
 * the component, which sends you looking in the wrong file.
 */

afterEach(() => {
  cleanup();
});

// Radix and animate-ui measure and observe elements. jsdom has neither
// observer, and a component that constructs one throws on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// Radix pointer-based components (Select, Slider) call these before opening.
// jsdom defines neither, so a click on a trigger throws instead of opening.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// `matchMedia` backs the theme provider and every responsive hook.
if (!window.matchMedia) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}
