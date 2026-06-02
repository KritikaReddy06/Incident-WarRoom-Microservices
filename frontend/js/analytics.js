function renderAnalytics() {

  const container =
    document.getElementById("analytics-content");

  if (!container || !Array.isArray(incidents)) {
    return;
  }

  const summary = computeSlaSummary(incidents);
  const open = incidents.filter(
    (i) => i.status === "OPEN"
  ).length;
  const resolved = incidents.filter(
    (i) => i.status === "RESOLVED"
  ).length;
  const p1 = incidents.filter(
    (i) => i.severity === "P1"
  ).length;
  const p2 = incidents.filter(
    (i) => i.severity === "P2"
  ).length;
  const p3 = incidents.filter(
    (i) => i.severity === "P3"
  ).length;

  const maxBar = Math.max(open, resolved, p1, p2, p3, 1);

  const breachedList = incidents
    .filter((i) => getSlaStatus(i) === "BREACHED")
    .slice(0, 8);

  container.innerHTML = `
    <div class="analytics-header">
      <div>
        <h2>Analytics</h2>
        <p class="subtitle">SLA compliance and incident trends</p>
      </div>
      <button type="button" class="btn-primary" onclick="exportIncidentsPdf(incidents)">
        Export PDF Report
      </button>
    </div>

    <div class="stats-grid analytics-stats">
      <div class="stat-card accent">
        <h2>${summary.compliance}%</h2>
        <p>SLA Compliance</p>
      </div>
      <div class="stat-card sla-ok">
        <h2>${summary.within}</h2>
        <p>Within SLA</p>
      </div>
      <div class="stat-card sla-bad">
        <h2>${summary.breached}</h2>
        <p>SLA Breached</p>
      </div>
      <div class="stat-card">
        <h2>${incidents.length}</h2>
        <p>Total Incidents</p>
      </div>
    </div>

    <div class="analytics-grid">
      <div class="panel">
        <h3>Status breakdown</h3>
        <div class="bar-chart">
          <div class="bar-row">
            <span>Open</span>
            <div class="bar-track"><div class="bar-fill open" style="width:${(open / maxBar) * 100}%"></div></div>
            <span class="bar-val">${open}</span>
          </div>
          <div class="bar-row">
            <span>Resolved</span>
            <div class="bar-track"><div class="bar-fill resolved" style="width:${(resolved / maxBar) * 100}%"></div></div>
            <span class="bar-val">${resolved}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>By severity</h3>
        <div class="bar-chart">
          <div class="bar-row">
            <span>P1</span>
            <div class="bar-track"><div class="bar-fill p1" style="width:${(p1 / maxBar) * 100}%"></div></div>
            <span class="bar-val">${p1}</span>
          </div>
          <div class="bar-row">
            <span>P2</span>
            <div class="bar-track"><div class="bar-fill p2" style="width:${(p2 / maxBar) * 100}%"></div></div>
            <span class="bar-val">${p2}</span>
          </div>
          <div class="bar-row">
            <span>P3</span>
            <div class="bar-track"><div class="bar-fill p3" style="width:${(p3 / maxBar) * 100}%"></div></div>
            <span class="bar-val">${p3}</span>
          </div>
        </div>
      </div>

      <div class="panel panel-wide">
        <h3>SLA targets</h3>
        <ul class="sla-legend">
          <li><strong>P1</strong> — resolve within 1 hour</li>
          <li><strong>P2</strong> — resolve within 4 hours</li>
          <li><strong>P3</strong> — resolve within 24 hours</li>
        </ul>
      </div>

      <div class="panel panel-wide">
        <h3>Recent SLA breaches</h3>
        ${
          breachedList.length
            ? `<ul class="breach-list">${breachedList.map((i) => `
              <li>
                <span class="badge ${escapeHtml(i.severity)}">${escapeHtml(i.severity)}</span>
                <strong>${escapeHtml(i.title)}</strong>
                <span class="muted">#${i.id} · ${escapeHtml(i.status)}</span>
              </li>
            `).join("")}</ul>`
            : `<p class="empty-msg">No SLA breaches — great work.</p>`
        }
      </div>
    </div>
  `;
}

function renderProfile() {

  const container =
    document.getElementById("profile-content");

  if (!container) {
    return;
  }

  const user = getCurrentUser();

  if (!user) {
    container.innerHTML =
      `<p class="empty-msg">Not signed in.</p>`;
    return;
  }

  const myIncidents = (incidents || []).filter(
    (i) =>
      i.created_by &&
      user.name &&
      i.created_by.toLowerCase() ===
        user.name.toLowerCase()
  );

  const myOpen = myIncidents.filter(
    (i) => i.status === "OPEN"
  ).length;
  const mySla = computeSlaSummary(myIncidents);

  container.innerHTML = `
    <div class="profile-header">
      <div class="avatar">${escapeHtml(
        (user.name || "U").charAt(0).toUpperCase()
      )}</div>
      <div>
        <h2>${escapeHtml(user.name)}</h2>
        <p class="subtitle">${escapeHtml(user.email)}</p>
        <span class="role-pill">${escapeHtml(user.role || "engineer")}</span>
      </div>
    </div>

    <div class="stats-grid profile-stats">
      <div class="stat-card">
        <h2>${myIncidents.length}</h2>
        <p>Incidents created</p>
      </div>
      <div class="stat-card">
        <h2>${myOpen}</h2>
        <p>Open (mine)</p>
      </div>
      <div class="stat-card sla-ok">
        <h2>${mySla.within}</h2>
        <p>Within SLA</p>
      </div>
      <div class="stat-card sla-bad">
        <h2>${mySla.breached}</h2>
        <p>SLA Breached</p>
      </div>
    </div>

    <div class="panel">
      <h3>My incidents</h3>
      ${
        myIncidents.length
          ? `<div class="profile-incident-list">${myIncidents.map((i) => {
              const sla = getSlaStatus(i);
              return `
              <div class="profile-incident-row" onclick="openIncident(${i.id})">
                <div>
                  <strong>${escapeHtml(i.title)}</strong>
                  <span class="muted">#${i.id}</span>
                </div>
                <div>
                  <span class="badge ${escapeHtml(i.severity)}">${escapeHtml(i.severity)}</span>
                  <span class="sla-badge ${sla === "WITHIN_SLA" ? "sla-ok" : "sla-bad"}">${escapeHtml(getSlaLabel(sla))}</span>
                </div>
              </div>`;
            }).join("")}</div>`
          : `<p class="empty-msg">No incidents attributed to you yet. Create one from the Incidents tab.</p>`
      }
    </div>
  `;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function switchView(viewName) {
  const routes = {
    incidents: "/dashboard/incidents",
    analytics: "/dashboard/analytics",
    profile: "/dashboard/profile"
  };

  navigate(routes[viewName] || "/dashboard/incidents");
}
