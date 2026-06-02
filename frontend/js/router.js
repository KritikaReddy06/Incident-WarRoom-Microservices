let dashboardBooted = false;

function getRoutePath() {
  let path = window.location.hash.slice(1) || "/";

  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  path = path.split("?")[0].replace(/\/+$/, "") || "/";

  if (path === "/dashboard") {
    return "/dashboard/incidents";
  }

  return path;
}

function navigate(path) {
  const normalized =
    path.startsWith("/") ? path : `/${path}`;

  if (window.location.hash.slice(1) === normalized) {
    renderRoute();
    return;
  }

  window.location.hash = normalized;
}

function setPageTitle(path) {
  const titles = {
    "/": "Incident War Room",
    "/login": "Login — War Room",
    "/register": "Register — War Room",
    "/dashboard/incidents": "Incidents — War Room",
    "/dashboard/analytics": "Analytics — War Room",
    "/dashboard/profile": "My Dashboard — War Room"
  };

  document.title =
    titles[path] || "Incident War Room";
}

function renderRoute() {
  const path = getRoutePath();
  const app = document.getElementById("app");

  if (!app) {
    return;
  }

  setPageTitle(path);
  closeWarRoom();

  const isDashboard = path.startsWith("/dashboard");

  if (isDashboard && !getToken()) {
    navigate("/login");
    return;
  }

  if (
    (path === "/login" || path === "/register") &&
    getToken()
  ) {
    navigate("/dashboard/incidents");
    return;
  }

  if (path === "/") {
    dashboardBooted = false;
    stopLiveTimers();
    app.innerHTML = Pages.home();
    app.className = "";
    return;
  }

  if (path === "/login") {
    dashboardBooted = false;
    stopLiveTimers();
    app.innerHTML = Pages.login();
    app.className = "";
    return;
  }

  if (path === "/register") {
    dashboardBooted = false;
    stopLiveTimers();
    app.innerHTML = Pages.register();
    app.className = "";
    return;
  }

  if (isDashboard) {
    const tab = path.split("/")[2] || "incidents";
    const validTabs = [
      "incidents",
      "analytics",
      "profile"
    ];
    const activeTab = validTabs.includes(tab)
      ? tab
      : "incidents";

    if (tab !== activeTab) {
      navigate(`/dashboard/${activeTab}`);
      return;
    }

    app.className = "app-body";
    app.innerHTML = Pages.dashboard(activeTab);

    bootDashboard(activeTab);
    return;
  }

  app.innerHTML = Pages.home();
  navigate("/");
}

function bootDashboard(activeTab) {
  const user = getCurrentUser();
  const usernameEl =
    document.getElementById("username");

  if (usernameEl && user?.name) {
    usernameEl.innerText = user.name;
  }

  if (activeTab === "analytics") {
    renderAnalytics();
  }

  if (activeTab === "profile") {
    renderProfile();
  }

  if (!dashboardBooted) {
    dashboardBooted = true;
    initSocket();

    loadWarRoomUsers().then(() => {
      loadIncidents();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeWarRoom();
      }
    });
  } else if (activeTab === "incidents") {
    renderIncidents();
    updateLiveTimers();
  } else {
    loadIncidents();
  }

  if (activeTab === "incidents") {
    const allBtn = document.querySelector(
      '.filter-btn[data-filter="ALL"]'
    );
    if (allBtn) {
      allBtn.classList.add("active-filter");
    }
  }
}

function initRouter() {
  loadTheme();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}
