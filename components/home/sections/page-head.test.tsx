import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `PageHead`'s video backdrop.
 *
 * What is worth asserting is the behaviour a screenshot cannot show: that the
 * footage is not fetched by the markup, that it stays still on a Save-Data
 * connection, and that it comes back after the tab has been hidden. Each of
 * those is a way for the hero to cost a visitor bandwidth or look broken
 * without anything visibly failing.
 */

const { PageHead } = await import("@/components/home/sections/page-head");

const BACKDROP = {
  video: "/marketing/hero-1080.mp4",
  mobileVideo: "/marketing/hero-720.mp4",
  poster: "/marketing/hero-poster.webp",
};

function renderHead(withBackdrop = true) {
  return render(
    <PageHead
      eyebrow="Features"
      title={["A title"]}
      lede="A lede."
      backdrop={withBackdrop ? BACKDROP : undefined}
    />,
  );
}

// jsdom implements neither playback method.
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

function setSaveData(on: boolean) {
  Object.defineProperty(navigator, "connection", {
    value: on ? { saveData: true } : undefined,
    configurable: true,
  });
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

beforeEach(() => {
  play.mockClear();
  pause.mockClear();
  Object.defineProperty(HTMLMediaElement.prototype, "play", { value: play, configurable: true });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { value: pause, configurable: true });
  setSaveData(false);
  setVisibility("visible");
});

afterEach(() => setSaveData(false));

describe("PageHead backdrop", () => {
  it("leaves an ordinary head alone", () => {
    const { container } = renderHead(false);

    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("section")).not.toHaveAttribute("data-chapter");
  });

  it("turns the head into an ink chapter, so the type and the nav go light", () => {
    const { container } = renderHead();

    expect(container.querySelector("section")).toHaveAttribute("data-chapter", "ink");
  });

  it("does not let the markup start the download", () => {
    // An `autoplay` attribute puts the file on the wire before any script can
    // check reduced motion or Save-Data. The effect decides instead — so this
    // is asserted on the server-rendered HTML, which is what the browser sees
    // first. After mount the effect raises `preload` to start the fetch.
    const html = renderToString(
      <PageHead eyebrow="Features" title={["A title"]} lede="A lede." backdrop={BACKDROP} />,
    );
    const video = html.match(/<video[^>]*>/)?.[0] ?? "";

    expect(video).not.toMatch(/\bautoplay\b/i);
    expect(video).toMatch(/preload="none"/);
    expect(video).toContain(`poster="${BACKDROP.poster}"`);
  });

  it("serves the full-size file from md up, and the light one below", () => {
    // Full-size first, with the query: a browser that ignores `media` on
    // <source> takes the first playable one, and the safe failure is the sharp
    // file on a phone rather than the soft one on a desktop.
    const { container } = renderHead();
    const sources = [...container.querySelectorAll("source")];

    expect(sources.map((source) => source.getAttribute("src"))).toEqual([
      BACKDROP.video,
      BACKDROP.mobileVideo,
    ]);
    expect(sources[0]).toHaveAttribute("media", "(min-width: 768px)");
    expect(sources[1]).not.toHaveAttribute("media");
  });

  it("starts the loop once mounted", () => {
    renderHead();

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("stays on the poster for a Save-Data connection", () => {
    setSaveData(true);
    renderHead();

    expect(play).not.toHaveBeenCalled();
    expect(pause).toHaveBeenCalled();
  });

  it("resumes when the tab is shown again", () => {
    // Chrome pauses muted video in a hidden tab and leaves resuming to the
    // page — without this, switching tabs and back left a frozen frame.
    const { container } = renderHead();
    const video = container.querySelector("video")!;
    Object.defineProperty(video, "paused", { value: true, configurable: true });
    play.mockClear();

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));

    expect(play).toHaveBeenCalledTimes(1);
  });

  it("marks the footage as decoration", () => {
    const { container } = renderHead();

    expect(container.querySelector("video")!.closest("[aria-hidden]")).not.toBeNull();
  });
});
