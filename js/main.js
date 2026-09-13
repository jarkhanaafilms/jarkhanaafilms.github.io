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
      const href = a.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        a.target === "_blank" ||
        /^https?:\/\//i.test(href)
      ) {
        return;
      }
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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

    const hoverables = "a, button, .scope-dot, .still-rail img, .reel-card, input, textarea";
    document.querySelectorAll(hoverables).forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("hover"));
      el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
    });
  }

  // scroll reveal — sections ease into place as they enter the viewport
  if (!reduceMotionMQ.matches && "IntersectionObserver" in window) {
    const revealables = document.querySelectorAll(
      "main .section, .gallery-shot, .gallery-row, .job, .callout"
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
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
