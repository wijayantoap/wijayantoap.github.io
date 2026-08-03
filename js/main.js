document.documentElement.classList.add("js");

const root = document.documentElement;
const progress = document.querySelector(".scroll-progress span");
const companyLabel = document.querySelector("[data-current-company]");
const sections = [...document.querySelectorAll("[data-chapter]")];
const entries = [...document.querySelectorAll(".entry")];
const revealItems = document.querySelectorAll(".reveal");
const timeline = document.querySelector(".timeline");
const hero = document.querySelector(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const objectMotion = {
  telkom: { x: [-25, 38], y: [240, -170], rotate: [-14, 8], scale: [0.82, 1.04] },
  accelbyte: { x: [-300, 90], y: [35, -55], rotate: [-11, 7], scale: [0.78, 1] },
  airasia: { x: [350, -230], y: [12, -10], rotate: [1, -1], scale: [0.96, 1.04] },
  lottiefiles: { x: [70, -35], y: [220, -160], rotate: [-24, 22], scale: [0.7, 1.08] },
};

document.querySelector("[data-year]").textContent = new Date().getFullYear();

let ticking = false;

function updatePage() {
  const maximum = document.documentElement.scrollHeight - window.innerHeight;
  const amount = maximum > 0 ? Math.min(window.scrollY / maximum, 1) : 0;
  progress.style.transform = `scaleX(${amount})`;

  const marker = window.scrollY + window.innerHeight * 0.46;
  let active = sections[0];
  sections.forEach((section) => {
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    if (sectionTop <= marker) active = section;
  });

  companyLabel.textContent = active.dataset.company;
  root.style.setProperty("--active-brand", active.dataset.brand || "#111111");

  if (hero && !reducedMotion) {
    const heroProgress = Math.max(0, Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1));
    root.style.setProperty("--portrait-y", (heroProgress * -30).toFixed(1));
    root.style.setProperty("--portrait-scale", (1.015 + heroProgress * 0.055).toFixed(3));
  }

  entries.forEach((entry) => {
    entry.classList.toggle("is-current", entry === active);

    const entryRect = entry.getBoundingClientRect();
    const motion = objectMotion[entry.id];
    if (!motion || reducedMotion) return;

    const entryProgress = Math.max(
      0,
      Math.min((window.innerHeight - entryRect.top) / (window.innerHeight + entryRect.height), 1),
    );
    const interpolate = ([start, end]) => start + (end - start) * entryProgress;

    entry.style.setProperty("--object-x", `${interpolate(motion.x).toFixed(1)}px`);
    entry.style.setProperty("--object-y", `${interpolate(motion.y).toFixed(1)}px`);
    entry.style.setProperty("--object-rotate", `${interpolate(motion.rotate).toFixed(2)}deg`);
    entry.style.setProperty("--object-scale", interpolate(motion.scale).toFixed(3));
  });

  if (timeline) {
    const start = timeline.offsetTop - window.innerHeight * 0.48;
    const end = timeline.offsetTop + timeline.offsetHeight - window.innerHeight * 0.52;
    const timelineAmount = Math.max(0, Math.min((window.scrollY - start) / (end - start), 1));
    timeline.style.setProperty("--timeline-progress", timelineAmount.toFixed(4));
  }

  ticking = false;
}

function onScroll() {
  if (ticking) return;
  window.requestAnimationFrame(updatePage);
  ticking = true;
}

if ("IntersectionObserver" in window && !reducedMotion) {
  const observer = new IntersectionObserver(
    (observed) => {
      observed.forEach((item) => {
        if (item.isIntersecting) item.target.classList.add("is-visible");
      });
    },
    { threshold: 0.13, rootMargin: "0px 0px -8%" },
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
updatePage();
