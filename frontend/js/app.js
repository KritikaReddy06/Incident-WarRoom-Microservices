let incidents = [];

let currentFilter = "ALL";

let currentSlaFilter = null;

let selectedIncidentId = null;

let warRoomUsers = [];

let incidentsLoadError = null;

/*
 HELPERS
*/

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders(extra = {}) {
  return {
  Authorization: `Bearer ${getToken()}`,
  ...extra
  };
}

function resolveUserName(role) {
  if (!role) {
    return "Unknown user";
  }
  if (role.user_name) {
    return role.user_name;
  }
  if (role.name) {
    return role.name;
  }
  const userId = role.user_id ?? role.id;
  const u = warRoomUsers.find(
    (x) => Number(x.id) === Number(userId)
  );
  if (u) {
    return u.name;
  }
  if (userId != null && userId !== "") {
    return `User #${userId}`;
  }
  return "Unknown user";
}

function resolveUserDisplayName(value) {
  if (!value && value !== 0) {
    return "Unknown user";
  }

  if (typeof value === "object") {
    return resolveUserName(value);
  }

  const numericId = Number(value);
  if (!Number.isNaN(numericId) && String(value).trim() !== "") {
    const user = warRoomUsers.find((x) => Number(x.id) === numericId);
    if (user) {
      return user.name;
    }
    return `User #${numericId}`;
  }

  return String(value);
}

function setTheme(theme) {
  const body = document.body;
  if (theme === "light") {
    body.classList.add("light-theme");
  } else {
    body.classList.remove("light-theme");
  }
  localStorage.setItem("theme", theme);
  const button = document.getElementById("theme-toggle");
  if (button) {
    button.textContent = theme === "light" ? "🌙 Dark" : "☀️ Light";
  }
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("light-theme")
    ? "dark"
    : "light";
  setTheme(nextTheme);
}

function loadTheme() {
  const storedTheme = localStorage.getItem("theme");
  const prefersLight = window.matchMedia
    && window.matchMedia("(prefers-color-scheme: light)").matches;
  const initialTheme = storedTheme || (prefersLight ? "light" : "dark");
  setTheme(initialTheme);
}

function escapeHtml(text) {
  if (text == null) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function requireAuth() {
  if (!getToken()) {
    navigate("/login");
    return false;
  }
  return true;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Invalid server response" };
  }
}

/*
 LOGIN
*/

async function login() {

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  try {

    const response = await fetch(
      API.AUTH.LOGIN,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    navigate("/dashboard/incidents");

  } catch (err) {

    console.error(err);
    alert("Login failed");
  }
}

/*
 REGISTER
*/

async function register() {

  const name =
    document.getElementById("name").value.trim();

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  if (!name || !email || !password) {
    alert("All fields are required");
    return;
  }

  try {

    const response = await fetch(
      API.AUTH.REGISTER,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Registration failed");
      return;
    }

    alert("Registration successful");
    navigate("/login");

  } catch (err) {

    console.error(err);
    alert("Registration failed");
  }
}

/*
 LOGOUT
*/

function logout() {

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  dashboardBooted = false;
  stopLiveTimers();
  navigate("/login");
}

/*
 LOAD INCIDENTS
*/

function showApiStatus(message, isError) {

  const el =
    document.getElementById("api-status");

  if (!el) {
    return;
  }

  if (!message) {
    el.classList.add("hidden");
    el.innerText = "";
    return;
  }

  el.classList.remove("hidden");
  el.classList.toggle("error-msg", !!isError);
  el.innerText = message;
}

async function loadIncidents() {

  if (!requireAuth()) {
    return;
  }

  incidentsLoadError = null;
  showApiStatus("Loading incidents...", false);

  try {

    const response = await fetch(
      API.INCIDENTS,
      {
        headers: authHeaders()
      }
    );

    const data =
      await parseJsonResponse(response);

    if (response.status === 401) {
      showApiStatus(null);
      logout();
      return;
    }

    if (!response.ok) {
      incidentsLoadError =
        data.error ||
        `Could not load incidents (HTTP ${response.status}). Start gateway on port 9000.`;
      incidents = [];
      showApiStatus(incidentsLoadError, true);
      renderStats();
      renderIncidents();
      return;
    }

    incidents = Array.isArray(data) ? data : [];
    incidentsLoadError = null;

    if (!incidents.length) {
      showApiStatus(
        "No incidents yet. Use + New incident to create one.",
        false
      );
    } else {
      showApiStatus(null);
    }

    renderStats();
    renderIncidents();
    renderAnalytics();
    renderProfile();
    startLiveTimers();

  } catch (err) {

    console.error(err);
    incidentsLoadError =
      "Cannot reach API at " + API.BASE_URL +
      ". Start gateway (9000), auth (9001), and incident (9002) services.";
    incidents = [];
    showApiStatus(incidentsLoadError, true);
    renderStats();
    renderIncidents();
  }
}

/*
 STATS
*/

function renderStats() {

  const totalEl =
    document.getElementById("total-count");

  if (!totalEl) {
    return;
  }

  totalEl.innerText = incidents.length;

  document.getElementById("open-count").innerText =
    incidents.filter(i => i.status === "OPEN").length;

  document.getElementById("resolved-count").innerText =
    incidents.filter(i => i.status === "RESOLVED").length;

  const sla = computeSlaSummary(incidents);
  const withinEl =
    document.getElementById("sla-within-count");
  const breachedEl =
    document.getElementById("sla-breached-count");

  if (withinEl) {
    withinEl.innerText = sla.within;
  }
  if (breachedEl) {
    breachedEl.innerText = sla.breached;
  }
}

function toggleCreateForm() {
  const wrap =
    document.getElementById("create-form-wrap");
  if (wrap) {
    wrap.classList.toggle("hidden");
  }
}

function filterSla(mode) {
  currentSlaFilter = mode;
  currentFilter = "ALL";
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active-filter");
  });
  const active = document.querySelector(
    `.filter-btn[data-filter="${mode}"]`
  );
  if (active) {
    active.classList.add("active-filter");
  }
  renderIncidents();
}

/*
 FILTER
*/

function filterSeverity(level) {

  currentFilter = level;
  currentSlaFilter = null;

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active-filter");
  });

  const active = document.querySelector(
    `.filter-btn[data-filter="${level}"]`
  );

  if (active) {
    active.classList.add("active-filter");
  }

  renderIncidents();
}

/*
 RENDER INCIDENTS
*/

function renderIncidents() {

  const container =
    document.getElementById("incident-list");

  if (!container) {
    return;
  }

  const searchInput =
    document.getElementById("search");

  const search = searchInput
    ? searchInput.value.toLowerCase()
    : "";

  container.innerHTML = "";

  const filtered = incidents.filter(i => {

    const matchFilter =
      currentFilter === "ALL" ||
      i.severity === currentFilter;

    const matchSla =
      !currentSlaFilter ||
      (currentSlaFilter === "SLA_BREACH" &&
        getSlaStatus(i) === "BREACHED");

    const title = (i.title || "").toLowerCase();

    const matchSearch =
      title.includes(search);

    return matchFilter && matchSla && matchSearch;
  });

  if (!filtered.length) {
    const msg = incidentsLoadError
      ? escapeHtml(incidentsLoadError)
      : incidents.length
        ? "No incidents match your search or filter."
        : "No incidents yet. Use the form above to create one.";
    container.innerHTML =
      `<p class="empty-msg">${msg}</p>`;
    return;
  }

  filtered.forEach(incident => {

    const card = document.createElement("div");

    const slaStatus = getSlaStatus(incident);
    const slaClass =
      slaStatus === "WITHIN_SLA" ? "sla-ok" : "sla-bad";

    card.className = "incident-card clickable";

    if (selectedIncidentId === incident.id) {
      card.classList.add("incident-card-active");
    }

    card.innerHTML = `
      <div class="card-top">
        <span class="badge ${escapeHtml(incident.severity)}">${escapeHtml(incident.severity)}</span>
        <span class="badge ${escapeHtml(incident.status)}">${escapeHtml(incident.status)}</span>
        <span class="sla-badge ${slaClass}">${escapeHtml(getSlaLabel(slaStatus))}</span>
      </div>
      <h3>${escapeHtml(incident.title)}</h3>
      <p class="card-desc">${escapeHtml(incident.description || "")}</p>
      <div class="card-meta">
        <small>${escapeHtml(new Date(incident.created_at).toLocaleString())}</small>
      </div>
      <div class="live-timer ${getLiveTimerClass(incident)}" data-live-timer data-incident-id="${incident.id}" data-timer-source="list">
        ${escapeHtml(getLiveTimerText(incident))}
      </div>
    `;

    card.onclick = () => openIncident(incident.id);

    container.appendChild(card);
  });

  updateLiveTimers();
}

/*
 INCIDENT DETAIL / WAR ROOM
*/

async function loadWarRoomUsers() {

  try {

    const response = await fetch(
      API.metaUsers(),
      { headers: authHeaders() }
    );

    const data =
      await parseJsonResponse(response);

    if (response.ok && Array.isArray(data)) {
      warRoomUsers = data;
    }

  } catch (err) {
    console.error(err);
  }
}

async function openIncident(id) {

  if (!requireAuth()) {
    return;
  }

  if (!getRoutePath().startsWith("/dashboard")) {
    navigate("/dashboard/incidents");
    await new Promise((r) =>
      requestAnimationFrame(r)
    );
  }

  selectedIncidentId = id;

  joinIncidentRoom(id);
  renderIncidents();

  const overlay =
    document.getElementById("war-room-overlay");
  const panel =
    document.getElementById("war-room-panel");

  if (!panel || !overlay) {
    return;
  }

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  panel.innerHTML =
    `<div class="war-room-loading">Loading incident #${escapeHtml(id)}…</div>`;

  try {

    const response = await fetch(
      API.incident(id),
      { headers: authHeaders() }
    );

    const incident =
      await parseJsonResponse(response);

    if (!response.ok) {
      panel.innerHTML =
        `<p class="error-msg">${escapeHtml(incident.error || "Failed to load")}</p>`;
      return;
    }

    renderWarRoom(incident);

  } catch (err) {

    console.error(err);
    panel.innerHTML =
      `<p class="error-msg">Failed to load incident</p>`;
  }
}

function closeWarRoom() {

  window.__currentWarRoomIncident = null;
  selectedIncidentId = null;

  const overlay =
    document.getElementById("war-room-overlay");
  const panel =
    document.getElementById("war-room-panel");

  if (overlay) {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  document.body.classList.remove("modal-open");

  if (panel) {
    panel.innerHTML = "";
  }

  renderIncidents();
}

function renderWarRoom(incident) {

  const panel =
    document.getElementById("war-room-panel");

  if (!panel) {
    return;
  }

  const timeline = Array.isArray(incident.timeline)
    ? incident.timeline
    : [];
  const roles = Array.isArray(incident.roles)
    ? incident.roles
    : [];
  const pm = incident.postmortem;
  const slaStatus = getSlaStatus(incident);
  const slaClass =
    slaStatus === "WITHIN_SLA" ? "sla-ok" : "sla-bad";

  const userOptions = warRoomUsers.length
    ? [
        `<option value="">Select user</option>`,
        ...warRoomUsers.map(u => `
          <option value="${u.id}">
            ${escapeHtml(u.name)} (${escapeHtml(u.role)})
          </option>
        `)
      ].join("")
    : `<option value="">No users loaded</option>`;

  const timelineHtml = timeline.length
    ? timeline.map(t => `
      <div class="timeline-item">
        <strong>${escapeHtml(t.event_type || "update")}</strong>
        <p>${escapeHtml(t.message)}</p>
        <small>${escapeHtml(
          new Date(t.created_at).toLocaleString()
        )}</small>
      </div>
    `).join("")
    : `<p class="empty-msg">No timeline events yet.</p>`;

  const uniqueWorkers = [];
  const seenUsers = new Set();

  if (incident.created_by) {
    const creatorName = resolveUserDisplayName(incident.created_by);
    uniqueWorkers.push({
      name: creatorName,
      role_type: "Reporter"
    });
    seenUsers.add(`creator-${creatorName}`);
  }

  roles.forEach((r) => {
    const name = resolveUserName(r);
    const key = `role-${r.user_id}-${name}`;
    if (!seenUsers.has(key)) {
      seenUsers.add(key);
      uniqueWorkers.push({
        name,
        role_type: r.role_type
      });
    }
  });

  const workersHtml = uniqueWorkers.length
    ? `<div class="workers-chips">${uniqueWorkers.map((w) => `
        <span class="worker-chip">
          <span class="worker-avatar">${escapeHtml(w.name.charAt(0).toUpperCase())}</span>
          <span>${escapeHtml(w.name)}</span>
          <small>${escapeHtml(w.role_type)}</small>
        </span>
      `).join("")}</div>`
    : `<p class="empty-msg">No one assigned yet.</p>`;

  const rolesHtml = roles.length
    ? roles.map(r => `
      <div class="timeline-item role-row">
        <span class="worker-avatar small">${escapeHtml(resolveUserName(r).charAt(0).toUpperCase())}</span>
        <div>
          <strong>${escapeHtml(resolveUserName(r))}</strong>
          <span class="muted"> — ${escapeHtml(r.role_type)}</span>
        </div>
      </div>
    `).join("")
    : `<p class="empty-msg">No roles assigned.</p>`;

  panel.innerHTML = `
    <div class="war-room-header">
      <div>
        <p class="war-room-id">Incident #${incident.id}</p>
        <h2>${escapeHtml(incident.title)}</h2>
      </div>
      <div class="war-room-header-actions">
        <button type="button" class="btn-ghost" onclick="exportSingleIncidentPdf(window.__currentWarRoomIncident)">PDF</button>
        <button type="button" class="btn-close" onclick="closeWarRoom()" aria-label="Close">×</button>
      </div>
    </div>

    <div class="war-room-timer-wrap">
      <div class="live-timer live-timer-lg ${getLiveTimerClass(incident)}" data-live-timer data-incident-id="${incident.id}" data-timer-source="warroom">
        ${escapeHtml(getLiveTimerText(incident))}
      </div>
      <p class="timer-caption">${incident.status === "RESOLVED" ? "Resolution time" : "SLA countdown · due " + escapeHtml(formatSlaDeadline(incident))}</p>
    </div>

    <div class="war-room-badges">
      <span class="badge ${escapeHtml(incident.severity)}">${escapeHtml(incident.severity)}</span>
      <span class="badge ${escapeHtml(incident.status)}">${escapeHtml(incident.status)}</span>
      <span class="sla-badge ${slaClass}">${escapeHtml(getSlaLabel(slaStatus))}</span>
    </div>

    <div class="panel workers-panel">
      <h3>People on this incident</h3>
      ${workersHtml}
    </div>

    <p class="war-room-desc">${escapeHtml(incident.description || "")}</p>

    <div class="war-room-actions">
      <select id="war-severity">
        <option value="P1" ${incident.severity === "P1" ? "selected" : ""}>P1</option>
        <option value="P2" ${incident.severity === "P2" ? "selected" : ""}>P2</option>
        <option value="P3" ${incident.severity === "P3" ? "selected" : ""}>P3</option>
      </select>
      <button type="button" class="btn-primary" onclick="updateSeverity(${incident.id})">Update Severity</button>
      ${incident.status !== "RESOLVED"
        ? `<button type="button" class="resolve-btn" onclick="resolveIncidentById(${incident.id})">Resolve</button>`
        : `<span class="badge RESOLVED">Resolved</span>`}
    </div>

    <div class="timeline-box">
      <h3>Timeline</h3>
      ${timelineHtml}
      <input type="text" id="timeline-message" placeholder="Timeline message" />
      <input type="text" id="timeline-type" placeholder="Event type (e.g. UPDATE)" value="UPDATE" />
      <button type="button" class="btn-primary" onclick="addTimeline(${incident.id})">Add Event</button>
    </div>

    <div class="timeline-box">
      <h3>Roles</h3>
      ${rolesHtml}
      <select id="role-user">${userOptions}</select>
      <input type="text" id="role-type" placeholder="Role (e.g. Commander)" />
      <button type="button" class="btn-primary" onclick="assignRole(${incident.id})">Assign Role</button>
    </div>

    <div class="timeline-box">
      <h3>Postmortem</h3>
      <textarea id="pm-root" placeholder="Root cause">${escapeHtml(pm?.root_cause || "")}</textarea>
      <textarea id="pm-impact" placeholder="Impact summary">${escapeHtml(pm?.impact_summary || "")}</textarea>
      <textarea id="pm-actions" placeholder="Action items">${escapeHtml(pm?.action_items || "")}</textarea>
      <button type="button" class="btn-primary" onclick="savePostmortem(${incident.id})">Save Postmortem</button>
    </div>
  `;

  window.__currentWarRoomIncident = incident;
  updateLiveTimers();
}

async function resolveIncidentById(id) {

  try {

    const response = await fetch(
      API.resolve(id),
      {
        method: "PATCH",
        headers: authHeaders()
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Resolve failed");
      return;
    }

    await loadIncidents();
    openIncident(id);

  } catch (err) {
    console.error(err);
    alert("Resolve failed");
  }
}

async function updateSeverity(id) {

  const severity =
    document.getElementById("war-severity").value;

  try {

    const response = await fetch(
      API.severity(id),
      {
        method: "PATCH",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ severity })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Severity update failed");
      return;
    }

    emitSeverityChange(id, severity);
    await loadIncidents();
    openIncident(id);

  } catch (err) {
    console.error(err);
    alert("Severity update failed");
  }
}

async function addTimeline(id) {

  const message =
    document.getElementById("timeline-message").value.trim();

  const event_type =
    document.getElementById("timeline-type").value.trim() || "UPDATE";

  if (!message) {
    alert("Timeline message is required");
    return;
  }

  try {

    const response = await fetch(
      API.timeline(id),
      {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          message,
          event_type
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Failed to add timeline event");
      return;
    }

    emitTimelineEvent(id, data);
    openIncident(id);

  } catch (err) {
    console.error(err);
    alert("Failed to add timeline event");
  }
}

async function assignRole(id) {

  const userSelect =
    document.getElementById("role-user");
  const user_id =
    Number(userSelect.value);
  const user_name =
    userSelect.options[userSelect.selectedIndex]
      ?.text?.split(" (")[0]?.trim() || "";

  const role_type =
    document.getElementById("role-type").value.trim();

  if (!user_id) {
    alert("Please select a valid user to assign.");
    return;
  }

  if (!role_type) {
    alert("Role type is required");
    return;
  }

  try {

    const response = await fetch(
      API.roles(id),
      {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          user_id,
          role_type,
          user_name
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Failed to assign role");
      return;
    }

    openIncident(id);

  } catch (err) {
    console.error(err);
    alert("Failed to assign role");
  }
}

async function savePostmortem(id) {

  const root_cause =
    document.getElementById("pm-root").value.trim();

  const impact_summary =
    document.getElementById("pm-impact").value.trim();

  const action_items =
    document.getElementById("pm-actions").value.trim();

  try {

    const response = await fetch(
      API.postmortem(id),
      {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          root_cause,
          impact_summary,
          action_items
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Failed to save postmortem");
      return;
    }

    alert("Postmortem saved");
    await openIncident(id);

  } catch (err) {
    console.error(err);
    alert("Failed to save postmortem");
  }
}

/*
 CREATE INCIDENT
*/

async function createIncident() {

  const title =
    document.getElementById("title").value.trim();

  const description =
    document.getElementById("description").value.trim();

  const severity =
    document.getElementById("severity").value;

  if (!title) {
    alert("Title is required");
    return;
  }

  try {

    const response = await fetch(
      API.INCIDENTS,
      {
        method: "POST",
        headers: authHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          title,
          description,
          severity,
          created_by:
            getCurrentUser()?.name || "Operator"
        })
      }
    );

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {
      alert(data.error || "Create failed");
      return;
    }

    document.getElementById("title").value = "";
    document.getElementById("description").value = "";

    await loadIncidents();

  } catch (err) {

    console.error(err);
    alert("Create failed");
  }
}

