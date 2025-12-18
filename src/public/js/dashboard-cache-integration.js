/**
 * CollabSpace Dashboard Cache Integration
 *
 * Example implementation showing how to integrate the cache system
 * with dashboard data loading and updates
 */

// Dashboard data management with caching
class DashboardCacheIntegration {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen for cache events
    document.addEventListener("cacheUserLoaded", (event) => {
      console.log("👤 User loaded from cache:", event.detail.user);
      this.updateUserUI(event.detail.user);
    });

    document.addEventListener("cacheTeamsLoaded", (event) => {
      console.log("👥 Teams loaded from cache:", event.detail.teams);
      this.updateTeamsUI(event.detail.teams);
    });

    // Setup data refresh handlers
    this.setupDataRefreshHandlers();
  }

  setupDataRefreshHandlers() {
    // Refresh teams data every 5 minutes if not cached or cache expired
    setInterval(async () => {
      await this.refreshTeamsData();
    }, 5 * 60 * 1000);

    // Refresh tasks data every 2 minutes
    setInterval(async () => {
      await this.refreshTasksData();
    }, 2 * 60 * 1000);
  }

  // ====================
  // DASHBOARD DATA LOADING
  // ====================

  async loadDashboardData() {
    console.log("📊 Loading dashboard data...");

    try {
      // Load user data (from cache or API)
      await this.loadUserData();

      // Load teams data (from cache or API)
      await this.loadTeamsData();

      // Load dashboard stats (from cache or API)
      await this.loadDashboardStats();

      console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
      this.showError("Failed to load dashboard data");
    }
  }

  async loadUserData() {
    if (!window.collabCache) {
      console.warn("Cache not available, skipping user cache check");
      return;
    }

    let userData = await window.collabCache.getUser();

    if (!userData) {
      console.log("📡 Fetching user data from API...");
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            userData = result.data;
            await window.collabCache.cacheUser(userData);
            console.log("💾 User data cached");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    if (userData) {
      this.updateUserUI(userData);
    }
  }

  async loadTeamsData() {
    if (!window.collabCache) return;

    let teams = await window.collabCache.getTeams();

    if (!teams || teams.length === 0) {
      console.log("📡 Fetching teams data from API...");
      try {
        const response = await this.makeApiRequest("/api/teams");
        if (response.success) {
          teams = response.data.teams || [];
          await window.collabCache.cacheTeams(teams);
          console.log(`💾 ${teams.length} teams cached`);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        return;
      }
    }

    this.updateTeamsUI(teams);

    // Load tasks for each team
    for (const team of teams) {
      await this.loadTeamTasks(team._id);
    }
  }

  async loadTeamTasks(teamId) {
    if (!window.collabCache || !teamId) return;

    let tasks = await window.collabCache.getTasks(teamId);

    if (!tasks || tasks.length === 0) {
      console.log(`📡 Fetching tasks for team ${teamId}...`);
      try {
        const response = await this.makeApiRequest(`/api/tasks?team=${teamId}`);
        if (response.success) {
          tasks = response.data.tasks || [];
          await window.collabCache.cacheTasks(tasks, teamId);
          console.log(`💾 ${tasks.length} tasks cached for team ${teamId}`);
        }
      } catch (error) {
        console.error(`Error fetching tasks for team ${teamId}:`, error);
      }
    }

    if (tasks && tasks.length > 0) {
      this.updateTasksUI(tasks, teamId);
    }
  }

  async loadDashboardStats() {
    if (!window.collabCache) return;

    const userRole =
      window.collabSpace?.currentUser?.role === "Organiser"
        ? "organiser"
        : "member";
    let stats = await window.collabCache.getDashboardStats(userRole);

    if (!stats) {
      console.log("📡 Fetching dashboard stats from API...");
      try {
        const endpoint =
          userRole === "organiser"
            ? "/api/dashboard/stats"
            : "/api/member/stats";
        const response = await this.makeApiRequest(endpoint);
        if (response.success) {
          stats = response.data;
          await window.collabCache.cacheDashboardStats(stats, userRole);
          console.log("💾 Dashboard stats cached");
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }
    }

    if (stats) {
      this.updateStatsUI(stats);
    }
  }

  // ====================
  // DATA REFRESH METHODS
  // ====================

  async refreshTeamsData() {
    console.log("🔄 Refreshing teams data...");

    try {
      const response = await this.makeApiRequest("/api/teams");
      if (response.success) {
        const teams = response.data.teams || [];
        await window.collabCache.cacheTeams(teams);
        this.updateTeamsUI(teams);

        // Dispatch event for other components
        document.dispatchEvent(
          new CustomEvent("teamsRefreshed", {
            detail: { teams },
          })
        );

        console.log("✅ Teams data refreshed");
      }
    } catch (error) {
      console.error("Error refreshing teams:", error);
    }
  }

  async refreshTasksData() {
    if (!window.collabCache) return;

    const teams = await window.collabCache.getTeams();
    if (!teams) return;

    console.log("🔄 Refreshing tasks data...");

    for (const team of teams) {
      try {
        const response = await this.makeApiRequest(
          `/api/tasks?team=${team._id}`
        );
        if (response.success) {
          const tasks = response.data.tasks || [];
          await window.collabCache.cacheTasks(tasks, team._id);
          this.updateTasksUI(tasks, team._id);
        }
      } catch (error) {
        console.error(`Error refreshing tasks for team ${team._id}:`, error);
      }
    }

    console.log("✅ Tasks data refreshed");
  }

  // ====================
  // UI UPDATE METHODS
  // ====================

  updateUserUI(userData) {
    // Update user avatar
    const avatarElements = document.querySelectorAll(".user-avatar");
    avatarElements.forEach((element) => {
      if (userData.avatar) {
        element.src = userData.avatar;
      }
    });

    // Update user name
    const nameElements = document.querySelectorAll(".user-name");
    nameElements.forEach((element) => {
      element.textContent =
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        userData.username;
    });

    // Update user email
    const emailElements = document.querySelectorAll(".user-email");
    emailElements.forEach((element) => {
      element.textContent = userData.email;
    });

    console.log("✅ User UI updated");
  }

  updateTeamsUI(teams) {
    const teamsContainer = document.querySelector("#teams-list");
    if (!teamsContainer) return;

    teamsContainer.innerHTML = "";

    teams.forEach((team) => {
      const teamElement = this.createTeamElement(team);
      teamsContainer.appendChild(teamElement);
    });

    // Update teams count
    const countElement = document.querySelector("#teams-count");
    if (countElement) {
      countElement.textContent = teams.length;
    }

    console.log(`✅ Teams UI updated (${teams.length} teams)`);
  }

  createTeamElement(team) {
    const div = document.createElement("div");
    div.className =
      "team-card bg-teams-sidebar border border-teams-border rounded-lg p-4 hover:bg-teams-hover cursor-pointer transition-colors";
    div.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold text-teams-text">${this.escapeHtml(
          team.name
        )}</h3>
        <span class="text-sm text-teams-muted">${
          team.members?.length || 0
        } members</span>
      </div>
      <p class="text-teams-muted text-sm mb-3">${this.escapeHtml(
        team.description || "No description"
      )}</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-teams-muted">
          Created ${this.formatDate(team.createdAt)}
        </span>
        <button class="text-teams-purple hover:text-teams-blue transition-colors" onclick="window.location.href='/teams/${
          team._id
        }'">
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `;
    return div;
  }

  updateTasksUI(tasks, teamId) {
    const tasksContainer = document.querySelector(`#tasks-${teamId}`);
    if (!tasksContainer) return;

    // Group tasks by status
    const tasksByStatus = {
      pending: [],
      "in-progress": [],
      completed: [],
      cancelled: [],
    };

    tasks.forEach((task) => {
      const status = task.status || "pending";
      if (tasksByStatus[status]) {
        tasksByStatus[status].push(task);
      }
    });

    tasksContainer.innerHTML = Object.entries(tasksByStatus)
      .map(([status, statusTasks]) => {
        if (statusTasks.length === 0) return "";

        return `
        <div class="task-column bg-teams-sidebar rounded-lg p-4">
          <h4 class="font-semibold text-teams-text mb-3 capitalize">${status.replace(
            "-",
            " "
          )}</h4>
          <div class="space-y-2">
            ${statusTasks.map((task) => this.createTaskHTML(task)).join("")}
          </div>
        </div>
      `;
      })
      .join("");

    console.log(
      `✅ Tasks UI updated for team ${teamId} (${tasks.length} tasks)`
    );
  }

  createTaskHTML(task) {
    const priorityColor = this.getPriorityColor(task.priority);
    return `
      <div class="task-card bg-teams-dark border border-teams-border rounded p-3 hover:bg-teams-hover transition-colors cursor-pointer" onclick="window.location.href='/tasks/${
        task._id
      }'">
        <div class="flex items-center justify-between mb-2">
          <h5 class="text-sm font-medium text-teams-text">${this.escapeHtml(
            task.title
          )}</h5>
          <span class="w-3 h-3 rounded-full" style="background-color: ${priorityColor}"></span>
        </div>
        ${
          task.description
            ? `<p class="text-xs text-teams-muted mb-2">${this.escapeHtml(
                task.description.substring(0, 50)
              )}${task.description.length > 50 ? "..." : ""}</p>`
            : ""
        }
        <div class="flex items-center justify-between text-xs text-teams-muted">
          <span>${task.assignedTo?.firstName || "Unassigned"}</span>
          ${task.dueDate ? `<span>${this.formatDate(task.dueDate)}</span>` : ""}
        </div>
      </div>
    `;
  }

  updateStatsUI(stats) {
    // Update stat cards
    const statElements = {
      "total-teams": stats.totalTeams,
      "total-tasks": stats.totalTasks,
      "completed-tasks": stats.completedTasks,
      "pending-tasks": stats.pendingTasks,
      "total-members": stats.totalMembers,
    };

    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.querySelector(`#${id}`);
      if (element && value !== undefined) {
        element.textContent = value;
      }
    });

    console.log("✅ Stats UI updated");
  }

  // ====================
  // UTILITY METHODS
  // ====================

  async makeApiRequest(endpoint) {
    if (window.collabSpace && window.collabSpace.apiRequest) {
      return await window.collabSpace.apiRequest(endpoint);
    }

    // Fallback direct fetch
    const response = await fetch(endpoint, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  }

  getPriorityColor(priority) {
    const colors = {
      low: "#28a745",
      medium: "#ffc107",
      high: "#fd7e14",
      urgent: "#dc3545",
    };
    return colors[priority] || colors.medium;
  }

  showError(message) {
    console.error(message);

    // Show notification if available
    if (window.collabSpace && window.collabSpace.showNotification) {
      window.collabSpace.showNotification(message, "danger");
    } else {
      alert(message);
    }
  }

  // ====================
  // MANUAL REFRESH METHODS
  // ====================

  async forceRefreshAllData() {
    console.log("🔄 Force refreshing all data...");

    // Clear relevant caches
    if (window.collabCache) {
      await window.collabCache.invalidate("team");
      await window.collabCache.invalidate("task");
      await window.collabCache.invalidate("dashboard");
    }

    // Reload all data
    await this.loadDashboardData();

    console.log("✅ All data force refreshed");
  }

  async refreshSpecificTeam(teamId) {
    console.log(`🔄 Refreshing team ${teamId}...`);

    // Invalidate team cache
    if (window.collabCache) {
      await window.collabCache.invalidate("team", teamId);
    }

    // Reload team data
    await this.loadTeamTasks(teamId);

    console.log(`✅ Team ${teamId} refreshed`);
  }
}

// Initialize dashboard cache integration when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Wait for cache system to be ready
  setTimeout(() => {
    if (window.collabCache) {
      window.dashboardCache = new DashboardCacheIntegration();

      // Auto-load dashboard data if we're on a dashboard page
      if (window.location.pathname.includes("dashboard")) {
        window.dashboardCache.loadDashboardData();
      }

      console.log("🎯 Dashboard Cache Integration ready");
    } else {
      console.warn(
        "⚠️ Cache system not available, dashboard integration disabled"
      );
    }
  }, 2000);
});

// Export for manual usage
window.DashboardCacheIntegration = DashboardCacheIntegration;
