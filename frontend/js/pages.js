const Pages = {

  home() {
    return `
      <div class="landing">
        <div class="hero">
          <h1>Incident War Room</h1>
          <p>SLA tracking, analytics, and real-time response</p>
          <p class="hero-hint">
            API &amp; app on
            <strong>http://localhost:9000</strong>
          </p>
          <div class="hero-buttons">
            <button type="button" class="btn-primary" onclick="navigate('/login')">Login</button>
            <button type="button" class="btn-ghost" onclick="navigate('/register')">Register</button>
          </div>
        </div>
      </div>
    `;
  },

  login() {
    return `
      <div class="auth-container">
        <h1>War Room</h1>
        <p>Sign in to manage incidents</p>
        <input type="email" id="email" placeholder="Email" />
        <input type="password" id="password" placeholder="Password" />
        <button type="button" class="btn-primary" onclick="login()">Login</button>
        <div class="auth-link">
          <a href="#/register" onclick="event.preventDefault(); navigate('/register')">Create account</a>
        </div>
      </div>
    `;
  },

  register() {
    return `
      <div class="auth-container">
        <h1>Create account</h1>
        <p>Join the incident war room</p>
        <input type="text" id="name" placeholder="Full name" />
        <input type="email" id="email" placeholder="Email" />
        <input type="password" id="password" placeholder="Password" />
        <button type="button" class="btn-primary" onclick="register()">Register</button>
        <div class="auth-link">
          <a href="#/login" onclick="event.preventDefault(); navigate('/login')">Already have an account?</a>
        </div>
      </div>
    `;
  },

  dashboard(activeTab) {
    const tab = activeTab || "incidents";

    return `
      <header class="app-nav">
        <div class="logo" role="button" tabindex="0" onclick="navigate('/dashboard/incidents')">
          <span class="logo-icon">◆</span> War Room
        </div>
        <nav class="nav-tabs">
          <button type="button" class="nav-tab ${tab === "incidents" ? "active" : ""}" onclick="navigate('/dashboard/incidents')">Incidents</button>
          <button type="button" class="nav-tab ${tab === "analytics" ? "active" : ""}" onclick="navigate('/dashboard/analytics')">Analytics</button>
          <button type="button" class="nav-tab ${tab === "profile" ? "active" : ""}" onclick="navigate('/dashboard/profile')">My Dashboard</button>
        </nav>
        <div class="nav-right">
          <button id="theme-toggle" type="button" class="btn-ghost" onclick="toggleTheme()">Theme</button>
          <span id="username" class="nav-user"></span>
          <button type="button" class="logout-btn" onclick="logout()">Logout</button>
        </div>
      </header>
      <main class="app-main">
        <section id="view-incidents" class="view ${tab === "incidents" ? "view-active" : ""}">
          <div id="api-status" class="api-status hidden"></div>
          <div class="page-header">
            <div>
              <h1>Incidents</h1>
              <p class="subtitle">Click an incident to open the war room</p>
            </div>
            <button type="button" class="btn-ghost" onclick="toggleCreateForm()">+ New incident</button>
          </div>
          <div class="stats-grid">
            <div class="stat-card"><h2 id="total-count">0</h2><p>Total</p></div>
            <div class="stat-card"><h2 id="open-count">0</h2><p>Open</p></div>
            <div class="stat-card"><h2 id="resolved-count">0</h2><p>Resolved</p></div>
            <div class="stat-card sla-ok"><h2 id="sla-within-count">0</h2><p>Within SLA</p></div>
            <div class="stat-card sla-bad"><h2 id="sla-breached-count">0</h2><p>SLA Breached</p></div>
          </div>
          <div id="create-form-wrap" class="create-form-wrap hidden">
            <div class="panel create-form">
              <h3>Create incident</h3>
              <input type="text" id="title" placeholder="Title" />
              <textarea id="description" placeholder="Description" rows="3"></textarea>
              <select id="severity">
                <option value="P1">P1 — 1h SLA</option>
                <option value="P2">P2 — 4h SLA</option>
                <option value="P3">P3 — 24h SLA</option>
              </select>
              <button type="button" class="btn-primary" onclick="createIncident()">Create</button>
            </div>
          </div>
          <div class="toolbar">
            <input type="text" id="search" class="search-input" placeholder="Search incidents..." onkeyup="renderIncidents()" />
            <div class="filters">
              <button type="button" class="filter-btn active-filter" data-filter="ALL" onclick="filterSeverity('ALL')">All</button>
              <button type="button" class="filter-btn" data-filter="P1" onclick="filterSeverity('P1')">P1</button>
              <button type="button" class="filter-btn" data-filter="P2" onclick="filterSeverity('P2')">P2</button>
              <button type="button" class="filter-btn" data-filter="P3" onclick="filterSeverity('P3')">P3</button>
              <button type="button" class="filter-btn" data-filter="SLA_BREACH" onclick="filterSla('SLA_BREACH')">SLA Breached</button>
            </div>
          </div>
          <div class="incidents-grid" id="incident-list"></div>
        </section>
        <section id="view-analytics" class="view ${tab === "analytics" ? "view-active" : ""}">
          <div id="analytics-content"></div>
        </section>
        <section id="view-profile" class="view ${tab === "profile" ? "view-active" : ""}">
          <div id="profile-content"></div>
        </section>
      </main>
    `;
  }
};
