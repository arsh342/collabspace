// Authentication Persistence Handler
// Manages session persistence, automatic login checks, and session extension

class AuthPersistence {
  constructor() {
    this.extendInterval = null;
    this.checkInterval = null;
    this.isExtending = false;

    // Check authentication status on page load
    this.init();
  }

  init() {
    console.log("🔐 AuthPersistence initialized");

    // Check if user should remain logged in
    this.checkAuthenticationStatus();

    // Set up periodic session extension for persistent sessions
    this.setupSessionExtension();

    // Set up periodic authentication check
    this.setupAuthCheck();
  }

  async checkAuthenticationStatus() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include", // Include session cookies
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log("✅ User authenticated via session:", result.data.email);

          // Store user data in localStorage for client-side access
          localStorage.setItem("user", JSON.stringify(result.data));

          // Update UI if needed
          if (typeof window.collabSpace !== "undefined") {
            window.collabSpace.isAuthenticated = true;
            window.collabSpace.currentUser = result.data;
            window.collabSpace.setupAuthenticatedUI();
          }

          return true;
        }
      } else if (response.status === 401) {
        console.log("❌ User not authenticated - clearing stored data");
        this.clearAuthData();
        return false;
      }
    } catch (error) {
      console.error("Error checking authentication status:", error);
      return false;
    }
  }

  setupSessionExtension() {
    // Extend session every 7 days (well before 30-day expiry)
    const extensionInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

    this.extendInterval = setInterval(() => {
      this.extendSession();
    }, extensionInterval);
  }

  async extendSession() {
    if (this.isExtending) return;

    this.isExtending = true;

    try {
      const response = await fetch("/api/auth/extend-session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("✅ Session extended:", result.message);
          if (result.expiresAt) {
            console.log("📅 Session expires at:", result.expiresAt);
          }
        }
      } else if (response.status === 401) {
        console.log("❌ Session extension failed - user not authenticated");
        this.clearAuthData();
        this.cleanup();
        // Optionally redirect to login
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Error extending session:", error);
    } finally {
      this.isExtending = false;
    }
  }

  setupAuthCheck() {
    // Check authentication status every 10 minutes
    const checkInterval = 10 * 60 * 1000; // 10 minutes

    this.checkInterval = setInterval(() => {
      this.checkAuthenticationStatus();
    }, checkInterval);
  }

  clearAuthData() {
    // Clear all authentication-related data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    // Update client-side state
    if (typeof window.collabSpace !== "undefined") {
      window.collabSpace.isAuthenticated = false;
      window.collabSpace.currentUser = null;
      window.collabSpace.setupUnauthenticatedUI();
    }
  }

  cleanup() {
    // Clear intervals
    if (this.extendInterval) {
      clearInterval(this.extendInterval);
      this.extendInterval = null;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log("🔐 AuthPersistence cleanup completed");
  }

  // Manual logout - call this when user explicitly logs out
  async logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        console.log("✅ Logout successful");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear everything regardless of API response
      this.clearAuthData();
      this.cleanup();

      // Redirect to login
      window.location.href = "/login";
    }
  }

  // Check if user is currently authenticated
  isAuthenticated() {
    const userData = localStorage.getItem("user");
    return !!userData;
  }

  // Get current user data
  getCurrentUser() {
    const userData = localStorage.getItem("user");
    try {
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }
}

// Initialize authentication persistence
let authPersistence = null;

document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on pages that need authentication persistence
  const publicPages = [
    "/login",
    "/register",
    "/",
    "/about",
    "/contact",
    "/pricing",
  ];
  const currentPath = window.location.pathname;

  if (!publicPages.includes(currentPath)) {
    authPersistence = new AuthPersistence();

    // Make it globally available
    window.authPersistence = authPersistence;
  }
});

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (authPersistence) {
    authPersistence.cleanup();
  }
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthPersistence;
}
