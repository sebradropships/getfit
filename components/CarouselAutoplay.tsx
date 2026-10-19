"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/*
  Autoplay for a strip the visitor can also swipe.

  The strip used to slide with a CSS transform, which no amount of CSS could
  make swipeable: a transform and a scroll offset are different mechanisms, and
  a finger moves the second one. So the strip is a real scroll container now and
  autoplay drives `scrollLeft` from a single animation frame loop. The visitor's
  swipe and our autoplay then write to the same number instead of fighting over
  two, which is what makes handing control back and forth invisible.

  Everything here is a ref rather than state. Sixty position updates a second
  through React would re-render the strip sixty times a second for no reason —
  none of this belongs in the render output.
*/

/* Three seconds, measured from the moment the scroll genuinely comes to rest
   rather than from the moment the finger lifts. On iOS those are up to a second
   apart, and a timer started at touchend expires while the strip is still
   gliding, which would read as the strip ignoring the visitor. */
const RESUME_DELAY_MS = 3000;

/* Autoplay fades up to speed instead of switching on at full speed. The eye
   catches the discontinuity rather than the motion, so a jump from a dead stop
   to 78px/s reads as a jolt even though 78px/s itself reads as calm. */
const RAMP_MS = 600;

/* How long the strip takes to glide onto the nearest card once a swipe ends. */
const SNAP_MS = 240;

/* The strip is at rest once it has not moved half a pixel for three frames in a
   row. One frame is not enough: a fling that reverses direction is momentarily
   still at the apex, and a single still frame there would be read as the end of
   the gesture. Three frames costs about 50ms of extra wait and never misfires. */
const SETTLE_FRAMES = 3;
const SETTLE_EPS = 0.5;

/* A position this far from the one we last wrote means something other than us
   moved it — a finger, a trackpad, the browser scrolling a focused card into
   view. Two pixels of slack absorbs the rounding browsers do on displays whose
   device pixel ratio is not a whole number. */
const DRIFT_EPS = 2;

/* One long frame must not teleport the strip, so a frame longer than this is
   treated as this long. At 78px/s the worst a stall can cost is 4px of drift. */
const MAX_FRAME_MS = 50;

/* A mouse drag only begins once the pointer has travelled this far, so that a
   click on a card is still a click on a card. */
const DRAG_SLOP_PX = 6;

/* Where a card's left edge lands when the strip snaps, as a fraction of the
   visible width. The edge fade covers the first 5%, so a card snapped flush to
   the left edge would be snapped into the fade. This keeps it just clear, and
   it is the same 6% the stylesheet hands to `scroll-padding-inline-start` for
   the browser's own snapping under reduced motion. */
const SNAP_INSET = 0.06;

/*
  run   autoplay owns the position
  user  the visitor owns it; we only watch for the gesture to end
  snap  we are gliding onto the nearest card after a gesture
  wait  position is final, the three seconds are running
*/
type Phase = "run" | "user" | "snap" | "wait";

export default function CarouselAutoplay({
  cycleSeconds,
  children,
}: {
  cycleSeconds: number;
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const track = host.firstElementChild;
    const group = track?.firstElementChild;
    if (!(track instanceof HTMLElement) || !(group instanceof HTMLElement)) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    let groupW = 0;
    let base = 0;
    let pos = 0; // our own copy of scrollLeft, kept fractional
    let expected = 0; // the value we last wrote, read back after the write
    let lastSeen = 0;
    let phase: Phase = "wait";
    let rampAt = 0;
    let lastFrame = 0;
    let stillFrames = 0;
    let snapFrom = 0;
    let snapTo = 0;
    let snapAt = 0;
    let raf = 0;
    let timer: number | undefined;

    let pointerDown = false;
    let lastPointerType = "mouse";
    let dragging = false;
    let dragFrom = 0;
    let dragLastX = 0;
    let swallowClick = false;

    /*
      Both of these are read from the DOM every time rather than mirrored into a
      boolean by the focus and pointer listeners, because a mirror can desync
      and a desynced mirror strands the strip. Chrome does not dispatch focus
      events at all while the document itself is unfocused — it moves
      activeElement silently — so a `focusInside` flag set from `focusin` can
      sit false with a card genuinely focused, or true after it has blurred. The
      first keeps the strip sliding under a focused card; the second stops it
      forever. Asking the DOM cannot be wrong.
    */
    const focusInside = () => host.contains(document.activeElement);
    /*
      Hover pauses for real pointers only. On touch, :hover latches onto the
      last-tapped element and stays there until something else is tapped, so one
      tap on a card used to leave the old marquee paused indefinitely, which
      looked exactly like a broken loop. The media query alone does not cover a
      touchscreen laptop, where it matches and a finger can still latch :hover —
      so the kind of pointer last used has to agree as well.
    */
    const hovering = () =>
      finePointer.matches && lastPointerType === "mouse" && host.matches(":hover");

    /* Any of these means the visitor is still engaged, so the strip must hold
       still and the three seconds must not start. */
    const engaged = () => pointerDown || hovering() || focusInside();

    const measure = () => {
      groupW = group.offsetWidth;
      const max = host.scrollWidth - host.clientWidth;
      /*
        Park the strip in a window one copy wide, placed so there is as much
        runway to the left as to the right. A swipe can now go backwards, which
        it never could while the strip was a transform, and the only way the
        illusion breaks is by reaching a real boundary. Centring the window is
        what buys the most distance before that can happen: 3105px at an 861px
        viewport, about 3.6 screens in either direction.
      */
      base = Math.max(0, (max - groupW) / 2);
    };

    /*
      Slide the scroll position by whole copies until it sits back in that
      window. Three identical copies make the strip periodic with a period of
      exactly one copy, so this changes nothing on screen — measured at 0.2px of
      sub-pixel drift on a 1.14x display. It is the whole trick: the wrap is not
      hidden, it is genuinely invisible.
    */
    const normalize = () => {
      if (!groupW) return;
      /* Never move a card that has focus. The browser would scroll it back into
         view and we would be fighting it for the rest of the gesture. */
      if (focusInside()) return;
      const offset = (((host.scrollLeft - base) % groupW) + groupW) % groupW;
      const target = base + offset;
      if (Math.abs(target - host.scrollLeft) > 0.5) host.scrollLeft = target;
      pos = host.scrollLeft;
      expected = pos;
      lastSeen = pos;
    };

    const write = (next: number) => {
      pos = next;
      host.scrollLeft = next;
      /* Read back rather than trusting the write: browsers round scrollLeft to
         device pixels, and `pos` has to stay fractional or a 1.3px-per-frame
         delta would be rounded away to nothing every frame. */
      expected = host.scrollLeft;
      lastSeen = expected;
    };

    /* Hand the position over exactly as it stands. Autoplay keeps no target of
       its own — it only ever adds to wherever the strip already is — so there is
       nothing to snap back to and the handover has nothing to give away. */
    const interrupt = () => {
      window.clearTimeout(timer);
      timer = undefined;
      if (phase === "user") return;
      phase = "user";
      stillFrames = 0;
      pos = host.scrollLeft;
      lastSeen = pos;
    };

    const settle = () => {
      normalize();
      /* Under reduced motion the strip stops here for good and the stylesheet's
         own scroll-snap takes over. Nothing resumes. */
      if (motion.matches) {
        phase = "wait";
        return;
      }

      /*
        Snap onto the nearest card ourselves rather than asking CSS to.
        `scroll-snap-type: x mandatory` cannot be on while autoplay runs — it
        pins every programmatic write straight back to the snap point, measured
        as thirty frames of writes advancing the strip 0.0px — and switching it
        on mid-gesture jumps the strip up to half a card. So the snap is done
        here, over 240ms, which lands on the same place `scroll-snap-align:
        start` would and is the same in every browser.
      */
      const want = host.clientWidth * SNAP_INSET;
      const left = host.getBoundingClientRect().left;
      let shift: number | null = null;
      for (const item of track.querySelectorAll(".carousel__item")) {
        const dx = item.getBoundingClientRect().left - left - want;
        if (shift === null || Math.abs(dx) < Math.abs(shift)) shift = dx;
      }
      snapFrom = pos;
      snapTo = pos + (shift ?? 0);
      snapAt = performance.now();
      phase = "snap";

      /* The three seconds start now, at the instant the gesture genuinely
         ended. The 240ms snap runs inside them rather than delaying them. */
      timer = window.setTimeout(resume, RESUME_DELAY_MS);
    };

    const resume = () => {
      timer = undefined;
      normalize();
      rampAt = performance.now();
      lastFrame = rampAt;
      phase = "run";
    };

    /* Called every frame while the visitor owns the position. */
    const watch = () => {
      const at = host.scrollLeft;
      const v = at - lastSeen;
      lastSeen = at;
      const view = host.clientWidth;
      const max = host.scrollWidth - view;

      /*
        Rescue a glide that is going to die on a real boundary. We otherwise
        never touch the position while momentum is in flight, because on iOS
        writing scrollLeft kills the glide outright. Within one screen of the
        end there is no glide left to protect: the boundary was about to stop it
        a few frames later anyway, so wrapping here costs nothing the visitor
        can see and it keeps the strip from ever hitting a wall it is not
        supposed to have.
      */
      if (
        !pointerDown &&
        groupW > 0 &&
        ((v < -SETTLE_EPS && at < view) || (v > SETTLE_EPS && at > max - view))
      ) {
        normalize();
        stillFrames = 0;
        return;
      }

      if (engaged() || Math.abs(v) > SETTLE_EPS) {
        stillFrames = 0;
        return;
      }
      if (++stillFrames >= SETTLE_FRAMES) settle();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - lastFrame, MAX_FRAME_MS);
      lastFrame = now;

      if (phase === "user") {
        watch();
        return;
      }
      if (phase === "wait") return;

      if (phase === "snap") {
        const t = Math.min(1, (now - snapAt) / SNAP_MS);
        write(snapFrom + (snapTo - snapFrom) * (1 - Math.pow(1 - t, 3)));
        if (t >= 1) phase = "wait";
        return;
      }

      /* A last check that nobody is engaged, so that a trigger event which
         never arrives — a suppressed focusin, a pointerleave lost when an
         element is removed from under the cursor — costs at most one frame of
         motion instead of defeating the pause altogether. */
      if (engaged()) {
        interrupt();
        return;
      }

      /* Speed comes from the copy width and the cycle time, so the seconds-per-
         card the strip was tuned to survives every breakpoint change in card
         width exactly as it did when a CSS animation was doing the arithmetic. */
      const speed = groupW / cycleSeconds;
      let ease = 1;
      if (rampAt) {
        const t = Math.min(1, (now - rampAt) / RAMP_MS);
        ease = 1 - Math.pow(1 - t, 3);
        if (t >= 1) rampAt = 0;
      }
      let next = pos + (speed * ease * dt) / 1000;
      if (next >= base + groupW) next -= groupW;
      write(next);
    };

    /*
      One listener catches every way the position can move that is not us:
      a finger, a trackpad, a keyboard scrolling a focused card into view, the
      browser restoring a position. Comparing against the value we last wrote is
      cheaper and more complete than trying to enumerate the input devices.
    */
    const onScroll = () => {
      if (Math.abs(host.scrollLeft - expected) > DRIFT_EPS) interrupt();
    };

    /* A horizontal wheel or trackpad swipe moves the strip without ever
       producing a pointer event, and it arrives before the scroll it causes, so
       catching it here stops the next frame from writing over it. Vertical
       wheels are left alone — those are the visitor scrolling the page. */
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) interrupt();
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDown = true;
      swallowClick = false;
      interrupt();
      /* Nothing is in flight at this instant — the touch itself cancelled any
         momentum — so this is the one safe moment to re-centre, and it gives
         the gesture about to happen the full runway in both directions. */
      normalize();
      lastPointerType = e.pointerType;
      if (e.pointerType === "mouse") {
        dragging = false;
        dragFrom = e.clientX;
        dragLastX = e.clientX;
      }
    };

    /* Touch and trackpad scroll the strip natively; a mouse has nothing to grab
       now that the scrollbar is hidden, so a mouse gets a drag. No inertia: a
       mouse drag that keeps gliding after the button comes up feels broken. */
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown || e.pointerType !== "mouse") return;
      if (!dragging) {
        if (Math.abs(e.clientX - dragFrom) < DRAG_SLOP_PX) return;
        dragging = true;
        swallowClick = true;
        host.classList.add("marquee--dragging");
      }
      host.scrollLeft -= e.clientX - dragLastX;
      dragLastX = e.clientX;
      lastSeen = host.scrollLeft;
    };

    const onPointerUp = () => {
      if (!pointerDown) return;
      pointerDown = false;
      dragging = false;
      host.classList.remove("marquee--dragging");
      stillFrames = 0;
    };

    /* The pointer travelled, so that was a swipe and not a tap on a card.
       Capture phase, because the card is a link and would otherwise navigate. */
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    /* These only make the pause prompt. The frame loop would notice either
       condition on its own a frame later; what they add is that it never has
       to. */
    const onEnter = (e: PointerEvent) => {
      lastPointerType = e.pointerType;
      if (hovering()) interrupt();
    };
    const onLeave = () => {
      stillFrames = 0;
    };
    const onFocusIn = () => {
      interrupt();
    };
    const onFocusOut = () => {
      stillFrames = 0;
    };
    /* Stops the browser's native image drag from hijacking a mouse swipe. */
    const onDragStart = (e: Event) => e.preventDefault();

    const start = () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      timer = undefined;
      measure();
      normalize();
      /* No autoplay without somewhere to wrap to. Reduced motion asks for none;
         a catalogue too short to fill two copies cannot loop at all, and would
         otherwise have autoplay walking into a boundary every cycle. Swiping
         still works in both cases — that is the scroll container, not us. */
      if (motion.matches || host.scrollWidth - host.clientWidth < groupW) {
        phase = "wait";
        return;
      }
      phase = "run";
      rampAt = 0;
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(() => {
      measure();
      normalize();
    });
    ro.observe(group);
    ro.observe(host);

    /*
      Load every copy's pictures as soon as the strip is near the window.

      The cards are marked loading="lazy", which the browser resolves against
      the WINDOW, not against this scroller. Two of the three copies sit
      thousands of pixels off to the right inside it and so never qualify,
      and horizontal movement does not reliably re-trigger the check: measured
      on the live page, 14 of 39 pictures had decoded after the strip had been
      running for a minute. The cards themselves are laid out and spaced
      correctly — which is why every geometric check of the seam came back at
      a clean 12px — but a card with no picture reads as a hole, and the pair
      either side of the seam is the one people notice.

      Promoting them costs no extra download: all three copies point at the
      same thirteen URLs, so the duplicates resolve out of cache. It waits for
      the strip to approach the window rather than firing at load, because
      thirteen product images competing with the hero would cost the page its
      LCP to fix a strip nobody has scrolled to yet.
    */
    let io: IntersectionObserver | undefined;
    const wake = () => {
      for (const img of track.querySelectorAll("img")) {
        if (img.loading === "lazy") img.loading = "eager";
      }
    };
    if (typeof IntersectionObserver === "undefined") {
      wake();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          wake();
          io?.disconnect();
          io = undefined;
        },
        { rootMargin: "400px 0px" }
      );
      io.observe(host);
    }

    host.addEventListener("scroll", onScroll, { passive: true });
    host.addEventListener("wheel", onWheel, { passive: true });
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("focusin", onFocusIn);
    host.addEventListener("focusout", onFocusOut);
    host.addEventListener("click", onClick, true);
    host.addEventListener("dragstart", onDragStart);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    motion.addEventListener("change", start);

    start();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro.disconnect();
      host.removeEventListener("scroll", onScroll);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("focusin", onFocusIn);
      host.removeEventListener("focusout", onFocusOut);
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      motion.removeEventListener("change", start);
      io?.disconnect();
    };
  }, [cycleSeconds]);

  /*
    The cards arrive as `children`, already rendered on the server. Only this
    wrapper and its loop are client code, so making the strip interactive cost
    2KB of First Load JS on this page and did not push thirty-nine product cards
    into the client bundle.
  */
  return (
    /*
      The fade at each end lives on this static parent, not on the scroller.
      See .marquee-port in globals.css: masking the scroller is what blanked
      the strip on iOS.
    */
    <div className="marquee-port">
      <div className="marquee" ref={hostRef}>
        {children}
      </div>
    </div>
  );
}
