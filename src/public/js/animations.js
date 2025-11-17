/**
 * CollabSpace Animation System
 * Provides scroll-triggered animations and interactive effects
 */

class CollabSpaceAnimations {
  constructor(options = {}) {
    this.options = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
      animateClass: "animate",
      scrollClass: "animate-on-scroll",
      ...options,
    };

    this.observer = null;
    this.isInitialized = false;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.setupAnimations()
      );
    } else {
      this.setupAnimations();
    }

    this.isInitialized = true;
  }

  setupAnimations() {
    this.initScrollAnimations();
    this.initPageTransition();
    this.initHoverEffects();
    this.initFormAnimations();
    this.initButtonEffects();
  }

  // Scroll-triggered animations
  initScrollAnimations() {
    const animateElements = document.querySelectorAll(
      `.${this.options.scrollClass}`
    );

    if (animateElements.length === 0) return;

    // Check for Intersection Observer support
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(this.options.animateClass);
            // Optional: unobserve after animation to improve performance
            // this.observer.unobserve(entry.target);
          }
        });
      }, this.options);

      animateElements.forEach((element) => {
        this.observer.observe(element);
      });
    } else {
      // Fallback for browsers without Intersection Observer
      this.initScrollFallback(animateElements);
    }

    // Initialize floating animations
    const floatingElements = document.querySelectorAll(".float-animation");
    floatingElements.forEach((element) => {
      element.classList.add(this.options.animateClass);
    });
  }

  // Fallback scroll animation for older browsers
  initScrollFallback(elements) {
    const checkScroll = () => {
      const windowHeight = window.innerHeight;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      elements.forEach((element) => {
        if (element.classList.contains(this.options.animateClass)) return;

        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;

        if (
          elementBottom >= scrollTop &&
          elementTop <= scrollTop + windowHeight
        ) {
          element.classList.add(this.options.animateClass);
        }
      });
    };

    window.addEventListener("scroll", this.throttle(checkScroll, 16));
    checkScroll(); // Initial check
  }

  // Page transition animations
  initPageTransition() {
    // Add entrance animation to page content
    const pageContent =
      document.querySelector("main") ||
      document.querySelector(".main-content") ||
      document.body;
    if (pageContent && !pageContent.classList.contains("page-animated")) {
      pageContent.style.opacity = "0";
      pageContent.style.transform = "translateY(20px)";
      pageContent.style.transition = "opacity 0.6s ease, transform 0.6s ease";

      setTimeout(() => {
        pageContent.style.opacity = "1";
        pageContent.style.transform = "translateY(0)";
        pageContent.classList.add("page-animated");
      }, 100);
    }
  }

  // Hover effects for cards and interactive elements
  initHoverEffects() {
    // Auto-detect cards and apply hover effects
    const cards = document.querySelectorAll(
      ".card, .pricing-card, .feature-card, .team-card, .project-card"
    );
    cards.forEach((card) => {
      if (!card.classList.contains("hover-effect-applied")) {
        card.classList.add("hover-lift");
        card.classList.add("hover-effect-applied");
      }
    });

    // Auto-detect buttons and apply hover effects
    const buttons = document.querySelectorAll(
      '.btn, button[type="submit"], .cta-button'
    );
    buttons.forEach((button) => {
      if (!button.classList.contains("hover-effect-applied")) {
        button.classList.add("btn-animate");
        button.classList.add("hover-effect-applied");
      }
    });
  }

  // Form field animations
  initFormAnimations() {
    const formFields = document.querySelectorAll("input, textarea, select");
    formFields.forEach((field) => {
      if (!field.classList.contains("form-animated")) {
        field.classList.add("form-field-animate");
        field.classList.add("form-animated");

        // Add focus/blur animations
        field.addEventListener("focus", () => {
          field.parentElement?.classList.add("field-focused");
        });

        field.addEventListener("blur", () => {
          field.parentElement?.classList.remove("field-focused");
        });

        // Add error shake animation on invalid input
        field.addEventListener("invalid", () => {
          field.classList.add("form-error-shake");
          setTimeout(() => field.classList.remove("form-error-shake"), 820);
        });
      }
    });

    // Form submission animations
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      form.addEventListener("submit", (e) => {
        const submitButton = form.querySelector(
          'button[type="submit"], input[type="submit"]'
        );
        if (submitButton && !submitButton.disabled) {
          submitButton.classList.add("loading");
          this.addLoadingSpinner(submitButton);
        }
      });
    });
  }

  // Button click effects
  initButtonEffects() {
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Create ripple effect
        this.createRippleEffect(e, button);

        // Add click animation
        button.classList.add("clicked");
        setTimeout(() => button.classList.remove("clicked"), 150);
      });
    });
  }

  // Create ripple effect on button click
  createRippleEffect(event, element) {
    const ripple = document.createElement("span");
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.classList.add("ripple");

    // Add ripple styles if not already present
    if (!document.querySelector("#ripple-styles")) {
      const style = document.createElement("style");
      style.id = "ripple-styles";
      style.textContent = `
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: rippleEffect 0.6s linear;
          pointer-events: none;
        }
        @keyframes rippleEffect {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        button, .btn {
          position: relative;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);
    }

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // Add loading spinner to button
  addLoadingSpinner(button) {
    const originalContent = button.innerHTML;
    const spinner = '<span class="loading-spinner"></span>';

    button.innerHTML = spinner + " Loading...";
    button.disabled = true;

    // Remove spinner after form submission (you might want to handle this based on your form logic)
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.disabled = false;
      button.classList.remove("loading");
    }, 3000);
  }

  // Utility: throttle function for performance
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Animate element programmatically
  animateElement(element, animationType = "fadeIn", options = {}) {
    if (typeof element === "string") {
      element = document.querySelector(element);
    }

    if (!element) return;

    const { duration = "0.8s", delay = "0s", easing = "ease-out" } = options;

    // Remove existing animation classes
    element.classList.remove(
      "fade-in",
      "slide-in-left",
      "slide-in-right",
      "slide-in-up",
      "scale-in"
    );

    // Set animation properties
    element.style.animationDuration = duration;
    element.style.animationDelay = delay;
    element.style.animationTimingFunction = easing;

    // Add animation class
    element.classList.add(animationType);

    return new Promise((resolve) => {
      const handleAnimationEnd = () => {
        element.removeEventListener("animationend", handleAnimationEnd);
        resolve();
      };
      element.addEventListener("animationend", handleAnimationEnd);
    });
  }

  // Show success message with animation
  showSuccess(message, container = document.body) {
    const successEl = document.createElement("div");
    successEl.className = "success-message animate-on-scroll fade-in";
    successEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      font-weight: 500;
    `;
    successEl.textContent = message;

    container.appendChild(successEl);
    successEl.classList.add("success-bounce", this.options.animateClass);

    setTimeout(() => {
      successEl.style.opacity = "0";
      successEl.style.transform = "translateY(-20px)";
      setTimeout(() => successEl.remove(), 300);
    }, 3000);
  }

  // Show error message with animation
  showError(message, container = document.body) {
    const errorEl = document.createElement("div");
    errorEl.className = "error-message animate-on-scroll fade-in";
    errorEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      font-weight: 500;
    `;
    errorEl.textContent = message;

    container.appendChild(errorEl);
    errorEl.classList.add("error-shake", this.options.animateClass);

    setTimeout(() => {
      errorEl.style.opacity = "0";
      errorEl.style.transform = "translateY(-20px)";
      setTimeout(() => errorEl.remove(), 300);
    }, 4000);
  }

  // Destroy animations (cleanup)
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.isInitialized = false;
  }

  // Static method to initialize animations globally
  static init(options = {}) {
    if (window.collabSpaceAnimations) {
      window.collabSpaceAnimations.destroy();
    }
    window.collabSpaceAnimations = new CollabSpaceAnimations(options);
    return window.collabSpaceAnimations;
  }
}

// Auto-initialize if not in a module environment
if (typeof window !== "undefined" && !window.collabSpaceAnimations) {
  CollabSpaceAnimations.init();
}

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = CollabSpaceAnimations;
}

// Also make it available globally
if (typeof window !== "undefined") {
  window.CollabSpaceAnimations = CollabSpaceAnimations;
}
