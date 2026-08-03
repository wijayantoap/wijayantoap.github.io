document.documentElement.classList.add("has-js");

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const updateScroll = () => {
  const max = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
  const progress = Math.min(Math.max(scrollY / max, 0), 1);
  root.style.setProperty("--scroll-progress", progress.toFixed(4));
  root.style.setProperty("--scroll-y", `${scrollY}px`);
};

updateScroll();
addEventListener("scroll", updateScroll, { passive: true });

if (reduceMotion) {
  document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll("[data-reveal]").forEach((node) => revealObserver.observe(node));

  addEventListener("pointermove", (event) => {
    root.style.setProperty("--pointer-x", `${event.clientX}px`);
    root.style.setProperty("--pointer-y", `${event.clientY}px`);
  }, { passive: true });
}

document.querySelectorAll("[data-track]").forEach((container) => {
  const items = [...container.querySelectorAll("[data-track-item]")];
  if (!items.length) return;
  const tracker = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      items.forEach((item) => item.classList.toggle("is-active", item === entry.target));
      document.body.dataset.active = entry.target.dataset.trackItem || "";
    });
  }, { rootMargin: "-35% 0px -50%", threshold: 0 });
  items.forEach((item) => tracker.observe(item));
});
