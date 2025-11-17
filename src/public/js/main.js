// CollabSpace - Main JavaScript File

class CollabSpace {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.currentTeam = null;
    this.isAuthenticated = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthentication();
    this.initializeSocket();
    this.setupGlobalFunctions();
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Mobile sidebar toggle
    const sidebarToggle = document.querySelector(".navbar-toggler");
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar) {
          sidebar.classList.toggle("show");
        }
      });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar");
        const navbar = document.querySelector(".navbar");
        if (
          sidebar &&
          !sidebar.contains(e.target) &&
          !navbar.contains(e.target)
        ) {
          sidebar.classList.remove("show");
        }
      }
    });

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      setTimeout(() => {
        if (alert.parentNode) {
          alert.style.transition = "opacity 0.5s ease";
          alert.style.opacity = "0";
          setTimeout(() => {
            if (alert.parentNode) {
              alert.remove();
            }
          }, 500);
        }
      }, 5000);
    });
  }

  checkAuthentication() {
    const token = localStorage.getItem("token");
    if (token) {
      this.isAuthenticated = true;
      this.currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      this.setupAuthenticatedUI();
    } else {
      this.setupUnauthenticatedUI();
    }
  }

  setupAuthenticatedUI() {
    // Update UI elements for authenticated users
    const authElements = document.querySelectorAll('[data-auth="required"]');
    authElements.forEach((element) => {
      element.style.display = "block";
    });

    const unauthElements = document.querySelectorAll(
      '[data-auth="unauthorized"]'
    );
    unauthElements.forEach((element) => {
      element.style.display = "none";
    });
  }

  setupUnauthenticatedUI() {
    // Update UI elements for unauthenticated users
    const authElements = document.querySelectorAll('[data-auth="required"]');
    authElements.forEach((element) => {
      element.style.display = "none";
    });

    const unauthElements = document.querySelectorAll(
      '[data-auth="unauthorized"]'
    );
    unauthElements.forEach((element) => {
      element.style.display = "block";
    });
  }

  initializeSocket() {
    if (!this.isAuthenticated) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Initialize Socket.IO connection
    this.socket = io({
      auth: {
        token: token,
      },
    });

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to CollabSpace server");
      this.showNotification("Connected to server", "success");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from CollabSpace server");
      this.showNotification("Disconnected from server", "warning");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.showNotification("Connection error", "danger");
    });

    // Handle real-time events
    this.socket.on("new_message", (message) => {
      this.handleNewMessage(message);
    });

    this.socket.on("task_updated", (data) => {
      this.handleTaskUpdate(data);
    });

    this.socket.on("user_status_change", (data) => {
      this.handleUserStatusChange(data);
    });

    this.socket.on("user_typing", (data) => {
      this.handleUserTyping(data);
    });

    this.socket.on("user_stopped_typing", (data) => {
      this.handleUserStoppedTyping(data);
    });
  }

  handleNewMessage(message) {
    // Handle new chat message
    if (window.location.pathname.includes("/chat")) {
      this.addMessageToChat(message);
    }

    // Show notification
    this.showNotification(
      `New message from ${message.sender.username}`,
      "info"
    );
  }

  handleTaskUpdate(data) {
    // Handle task updates
    if (window.location.pathname.includes("/tasks")) {
      this.updateTaskInUI(data);
    }

    // Show notification
    this.showNotification(`Task updated by ${data.updatedBy}`, "info");
  }

  handleUserStatusChange(data) {
    // Update user status in UI
    this.updateUserStatus(data.userId, data.status);
  }

  handleUserTyping(data) {
    // Show typing indicator
    this.showTypingIndicator(data.userId, data.username);
  }

  handleUserStoppedTyping(data) {
    // Hide typing indicator
    this.hideTypingIndicator(data.userId);
  }

  setupGlobalFunctions() {
    // Make utility functions globally available
    window.showNotification = this.showNotification.bind(this);
    window.formatDate = this.formatDate.bind(this);
    window.formatTime = this.formatTime.bind(this);
    window.truncateText = this.truncateText.bind(this);
    window.getStatusColor = this.getStatusColor.bind(this);
    window.getPriorityColor = this.getPriorityColor.bind(this);
  }

  // Utility Functions
  showNotification(message, type = "info", duration = 5000) {
    const alertId = "alert-" + Date.now();
    const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                ${message}
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", alertHtml);

    // Auto-remove after duration
    setTimeout(() => {
      const alert = document.getElementById(alertId);
      if (alert) {
        alert.remove();
      }
    }, duration);

    return alertId;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  getStatusColor(status) {
    const colors = {
      todo: "#6c757d",
      in_progress: "#007bff",
      review: "#ffc107",
      completed: "#28a745",
      cancelled: "#dc3545",
    };
    return colors[status] || "#6c757d";
  }

  getPriorityColor(priority) {
    const colors = {
      low: "#28a745",
      medium: "#ffc107",
      high: "#fd7e14",
      urgent: "#dc3545",
    };
    return colors[priority] || "#ffc107";
  }

  // Authentication Functions
  async login(email, password) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        this.isAuthenticated = true;
        this.currentUser = data.data.user;

        this.showNotification("Login successful", "success");
        window.location.href = "/dashboard";
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      this.showNotification(error.message || "Login failed", "danger");
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        this.isAuthenticated = true;
        this.currentUser = data.data.user;

        this.showNotification("Registration successful", "success");
        window.location.href = "/dashboard";
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      this.showNotification(error.message || "Registration failed", "danger");
      throw error;
    }
  }

  logout() {
    // Use the auth persistence system for logout if available
    if (window.authPersistence) {
      window.authPersistence.logout();
      return;
    }

    // Fallback logout
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    this.isAuthenticated = false;
    this.currentUser = null;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Call logout API
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch((error) => {
      console.error("Logout API error:", error);
    });

    this.showNotification("Logged out successfully", "success");
    window.location.href = "/login";
  }

  // API Helper Functions
  async apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(endpoint, finalOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "API request failed");
      }

      return data;
    } catch (error) {
      this.showNotification(error.message, "danger");
      throw error;
    }
  }

  // Chat Functions
  addMessageToChat(message) {
    const chatMessages = document.querySelector(".chat-messages");
    if (!chatMessages) return;

    const messageElement = this.createMessageElement(message);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  createMessageElement(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${
      message.sender._id === this.currentUser._id ? "own" : ""
    }`;

    const isOwn = message.sender._id === this.currentUser._id;

    messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.sender.username}</span>
                <span class="message-time">${this.formatTime(
                  message.createdAt
                )}</span>
            </div>
            <div class="message-content">${message.content}</div>
        `;

    return messageDiv;
  }

  // Task Functions
  updateTaskInUI(data) {
    // Update task in the current view
    const taskElement = document.querySelector(
      `[data-task-id="${data.taskId}"]`
    );
    if (taskElement) {
      // Update task display based on the updates
      Object.keys(data.updates).forEach((key) => {
        const updateElement = taskElement.querySelector(`[data-task-${key}]`);
        if (updateElement) {
          updateElement.textContent = data.updates[key];
        }
      });
    }
  }

  // User Status Functions
  updateUserStatus(userId, status) {
    const userElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (userElement) {
      const statusIndicator = userElement.querySelector(".user-status");
      if (statusIndicator) {
        statusIndicator.className = `user-status ${status}`;
        statusIndicator.textContent = status;
      }
    }
  }

  // Typing Indicator Functions
  showTypingIndicator(userId, username) {
    const typingElement = document.querySelector(".typing-indicator");
    if (typingElement) {
      typingElement.textContent = `${username} is typing...`;
      typingElement.style.display = "block";
    }
  }

  hideTypingIndicator(userId) {
    const typingElement = document.querySelector(".typing-indicator");
    if (typingElement) {
      typingElement.style.display = "none";
    }
  }

  // Socket Functions
  sendMessage(teamId, content, messageType = "text") {
    if (!this.socket) return;

    this.socket.emit("send_message", {
      teamId,
      content,
      messageType,
    });
  }

  updateTask(taskId, updates) {
    if (!this.socket) return;

    this.socket.emit("task_update", {
      taskId,
      updates,
    });
  }

  startTyping(teamId) {
    if (!this.socket) return;

    this.socket.emit("typing_start", { teamId });
  }

  stopTyping(teamId) {
    if (!this.socket) return;

    this.socket.emit("typing_stop", { teamId });
  }
}

// Initialize CollabSpace when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.collabSpace = new CollabSpace();
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = CollabSpace;
}
