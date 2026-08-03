(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealElements = [...document.querySelectorAll(".reveal")];

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
  };

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
      { rootMargin: "0px 0px -6%", threshold: 0.08 }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
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
            const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
            if (isCurrent) link.setAttribute("aria-current", "location");
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

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
})();
