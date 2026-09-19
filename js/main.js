// Jarkhanaa Films — shared site behavior

const reduceMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

// Page transition: fade in on load, fade out before internal navigation.
// Runs immediately (not wired to DOMContentLoaded) so the enter animation
// starts as soon as possible.
document.body.classList.add("page-enter");
window.addEventListener("pageshow", (e) => {
  // back/forward cache restores — make sure a stale fade-out doesn't stick.
  if (e.persisted) document.body.classList.remove("page-leave");
});

document.addEventListener("DOMContentLoaded", () => {
  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // fade to black-ish before following an internal link, so navigating
  // between pages feels like a cut rather than a hard reload.
  if (!reduceMotionMQ.matches) {
    document.querySelectorAll("a[href]").forEach((a) => {
      const initialHref = a.getAttribute("href");
      if (
        !initialHref ||
        initialHref.startsWith("#") ||
        initialHref.startsWith("mailto:") ||
        initialHref.startsWith("tel:") ||
        a.target === "_blank" ||
        /^https?:\/\//i.test(initialHref)
      ) {
        return;
      }
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // read live, not the value captured above — some links (the
        // homepage frame viewer) change their target after the page loads
        const href = a.getAttribute("href");
        e.preventDefault();
        document.body.classList.add("page-leave");
        window.setTimeout(() => { window.location.href = href; }, 220);
      });
    });
  }

  // light leaks — a few slow-drifting blobs behind everything, purely
  // decorative. Injected here so it's automatic on every page.
  const leak = document.createElement("div");
  leak.className = "light-leak";
  leak.innerHTML = "<span></span><span></span><span></span>";
  document.body.prepend(leak);

  // cursor companion ring — trails the pointer, grows over anything
  // clickable. Desktop with a real mouse only.
  if (window.matchMedia("(pointer: fine)").matches) {
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(ring);

    let rx = 0, ry = 0, tx = 0, ty = 0;
    let active = false;

    document.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!active) { active = true; ring.classList.add("active"); }
    });
    document.addEventListener("mouseleave", () => ring.classList.remove("active"));

    const tick = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const hoverables = "a, button, .scope-dot, .still-rail img, .reel-card, .tool-badge, input, textarea";
    document.querySelectorAll(hoverables).forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
    });
  }

  // scroll reveal — sections ease into place as they enter the viewport
  if (!reduceMotionMQ.matches && "IntersectionObserver" in window) {
    const revealables = document.querySelectorAll(
      "main .section, .gallery-shot, .gallery-row, .job, .callout, .frame-viewer"
    );
    revealables.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      // threshold 0 = reveal as soon as any part enters view. A fractional
      // threshold (was 0.12) silently breaks on tall sections: on a phone,
      // a multi-thousand-px section can never get 12% of itself on screen
      // at once, so it stayed at opacity 0 forever.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach((el) => io.observe(el));
  }

  // opening credits sequence (home page only) — plays once per browser
  // session, respects reduced-motion, and is always skippable.
  const overlay = document.getElementById("credits-overlay");
  if (overlay) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = sessionStorage.getItem("creditsSeen") === "1";

    const dismiss = () => {
      overlay.classList.add("hidden");
      document.body.style.overflow = "";
      sessionStorage.setItem("creditsSeen", "1");
    };

    if (reduceMotion || alreadySeen) {
      dismiss();
    } else {
      document.body.style.overflow = "hidden";
      const skipBtn = document.getElementById("credits-skip");
      if (skipBtn) skipBtn.addEventListener("click", dismiss);

      // total on-screen time before it fades: last line's delay + its
      // own fade-in + a beat to let it breathe, then a 0.9s fade-out.
      window.setTimeout(() => {
        overlay.classList.add("fading");
        window.setTimeout(dismiss, 900);
      }, 3400);
    }
  }

  // Still-rails scroll horizontally via their own visible scrollbar,
  // trackpad swipe, or shift+wheel — no JS scroll-hijacking here, so a
  // plain mouse wheel over a rail still scrolls the page like normal.

  // Frame viewer (home page): one still plays large in the "screen",
  // the row beneath acts like a contact strip. Click a thumb to swap
  // the screen; the screen itself always links through to that film.
  // Auto-advances gently on its own, pauses on hover/focus, and skips
  // the autoplay (but keeps the click-to-browse) if motion is reduced.
  const viewer = document.getElementById("frame-viewer");
  if (viewer) {
    const screen = viewer.querySelector(".viewer-screen");
    const screenImg = screen.querySelector("img");
    const title = viewer.querySelector(".viewer-title");
    const thumbs = Array.from(viewer.querySelectorAll(".viewer-thumb"));
    let current = 0;

    const select = (index) => {
      current = index;
      const thumb = thumbs[index];
      thumbs.forEach((t, i) => t.classList.toggle("active", i === index));
      screen.classList.add("switching");
      window.setTimeout(() => {
        screenImg.src = thumb.dataset.img;
        screenImg.alt = thumb.dataset.title + " — still";
        title.textContent = thumb.dataset.title;
        screen.setAttribute("href", "films.html#" + thumb.dataset.film);
        screen.classList.remove("switching");
      }, 220);
    };

    thumbs.forEach((thumb, index) => {
      thumb.addEventListener("click", () => select(index));
    });

    if (!reduceMotionMQ.matches) {
      let auto = window.setInterval(() => select((current + 1) % thumbs.length), 5000);
      const restart = () => {
        window.clearInterval(auto);
        auto = window.setInterval(() => select((current + 1) % thumbs.length), 5000);
      };
      viewer.addEventListener("mouseenter", () => window.clearInterval(auto));
      viewer.addEventListener("mouseleave", restart);
      viewer.addEventListener("focusin", () => window.clearInterval(auto));
      viewer.addEventListener("focusout", restart);
    }
  }

  // Detective board (experience page): cursor becomes a flashlight —
  // a circular spotlight follows the pointer, the rest of the board
  // stays slightly dimmed (but always readable, see .board::before).
  const board = document.getElementById("detective-board");
  if (board && window.matchMedia("(pointer: fine)").matches) {
    const moveSpot = (e) => {
      const r = board.getBoundingClientRect();
      board.style.setProperty("--spot-x", e.clientX - r.left + "px");
      board.style.setProperty("--spot-y", e.clientY - r.top + "px");
    };
    board.addEventListener("mouseenter", (e) => { moveSpot(e); board.classList.add("lit"); });
    board.addEventListener("mousemove", moveSpot);
    board.addEventListener("mouseleave", () => board.classList.remove("lit"));
  }

  // Vectorscope (films page): hover a dot for a tooltip, click to jump
  // to that film's section.
  const scope = document.getElementById("vectorscope");
  const tooltip = document.getElementById("scope-tooltip");
  if (scope && tooltip) {
    const tooltipHTML = (dot) =>
      `<img src="${dot.dataset.thumb}" alt="${dot.dataset.filmLabel} — ${dot.dataset.colorLabel}">` +
      `<span class="text">${dot.dataset.colorLabel}<span class="film">${dot.dataset.filmLabel}</span></span>`;

    scope.querySelectorAll(".scope-dot").forEach((dot) => {
      const show = (e) => {
        tooltip.innerHTML = tooltipHTML(dot);
        tooltip.style.left = e.clientX + "px";
        tooltip.style.top = e.clientY + "px";
        tooltip.classList.add("visible");
      };
      dot.addEventListener("mouseenter", show);
      dot.addEventListener("mousemove", show);
      dot.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
      dot.addEventListener("focus", () => {
        const r = dot.getBoundingClientRect();
        tooltip.innerHTML = tooltipHTML(dot);
        tooltip.style.left = r.left + r.width / 2 + "px";
        tooltip.style.top = r.top + "px";
        tooltip.classList.add("visible");
      });
      dot.addEventListener("blur", () => tooltip.classList.remove("visible"));
      dot.addEventListener("click", () => {
        const target = document.getElementById(dot.dataset.film);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
});
