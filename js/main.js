(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const progressBar = document.querySelector(".scroll-progress");
  const timeline = document.querySelector("[data-timeline]");
  const portrait = document.querySelector("[data-parallax]");
  const routeItems = [...document.querySelectorAll("[data-route-index]")];
  const experienceCards = [...document.querySelectorAll("[data-experience]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ticking = false;

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

  const setActiveRoute = (index) => {
    routeItems.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
    });
  };

  const updateScrollState = () => {
    const scrollTop = window.scrollY;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = scrollRange > 0 ? scrollTop / scrollRange : 0;

    root.style.setProperty("--page-progress", clamp(pageProgress));
    header?.classList.toggle("is-scrolled", scrollTop > 28);

    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const startLine = window.innerHeight * 0.42;
      const travelDistance = Math.max(rect.height - window.innerHeight * 0.55, 1);
      const timelineProgress = clamp((startLine - rect.top) / travelDistance);
      timeline.style.setProperty("--timeline-progress", `${timelineProgress * 100}%`);
    }

    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollState);
      ticking = true;
    }
  };

  const revealElements = [...document.querySelectorAll(".reveal")];

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  if ("IntersectionObserver" in window && experienceCards.length) {
    const experienceObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        setActiveRoute(Number(visible.target.dataset.experience));
      },
      { rootMargin: "-24% 0px -56%", threshold: [0.05, 0.2, 0.45] }
    );

    experienceCards.forEach((card) => experienceObserver.observe(card));
  }

  if (portrait && !reduceMotion.matches && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;

      root.style.setProperty("--mouse-x", x.toFixed(3));
      root.style.setProperty("--mouse-y", y.toFixed(3));
      portrait.style.setProperty("--portrait-x", (x * 18).toFixed(2));
      portrait.style.setProperty("--portrait-y", (y * 14).toFixed(2));
    });
  }

  const navLinks = [...document.querySelectorAll(".site-header nav a")];
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navSections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            const active = link.getAttribute("href") === `#${entry.target.id}`;
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-35% 0px -55%", threshold: 0 }
    );

    navSections.forEach((section) => navObserver.observe(section));
  }

  const yearTarget = document.querySelector("[data-year]");
  if (yearTarget) yearTarget.textContent = new Date().getFullYear();

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollState();
})();
