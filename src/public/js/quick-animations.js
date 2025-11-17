/**
 * Quick Animation Setup for CollabSpace Pages
 * Automatically adds animations to common elements
 */

document.addEventListener("DOMContentLoaded", function () {
  // Auto-animate common elements if they don't already have animation classes
  const elementsToAnimate = [
    { selector: "h1, h2, h3", animation: "fade-in", delay: 0.1 },
    { selector: ".btn, button", animation: "hover-lift hover-scale", delay: 0 },
    {
      selector: ".card, .panel, .box",
      animation: "slide-in-up hover-lift",
      delay: 0.2,
    },
    { selector: ".nav, .navbar", animation: "slide-in-down", delay: 0 },
    {
      selector: ".form-group, .form-field",
      animation: "slide-in-left",
      delay: 0.1,
    },
    { selector: ".alert", animation: "slide-in-down", delay: 0 },
    {
      selector: ".list-group-item, .table tr",
      animation: "fade-in",
      delay: 0.05,
    },
  ];

  elementsToAnimate.forEach(({ selector, animation, delay }, groupIndex) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      // Only add animations if element doesn't already have them
      if (
        !el.classList.contains("animate-on-scroll") &&
        !el.classList.contains("animated") &&
        !el.parentElement?.classList.contains("animate-on-scroll")
      ) {
        el.classList.add("animate-on-scroll");

        // Add the animation class
        const animationClasses = animation.split(" ");
        animationClasses.forEach((cls) => el.classList.add(cls));

        // Add staggered delay
        const totalDelay = delay + index * 0.05;
        if (totalDelay > 0) {
          el.style.animationDelay = `${totalDelay}s`;
        }
      }
    });
  });

  // Add page entrance animation
  document.body.style.opacity = "0";
  document.body.style.transform = "translateY(20px)";
  document.body.style.transition = "opacity 0.6s ease, transform 0.6s ease";

  setTimeout(() => {
    document.body.style.opacity = "1";
    document.body.style.transform = "translateY(0)";
  }, 100);
});
