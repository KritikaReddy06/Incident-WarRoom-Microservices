const GATEWAY_PORT = "9000";

const API_HOST =
  window.location.hostname || "localhost";

function resolveApiBase() {
  if (window.location.port === GATEWAY_PORT) {
    return window.location.origin;
  }

  return `${window.location.protocol}//${API_HOST}:${GATEWAY_PORT}`;
}

function resolveSocketBase() {
  return `${window.location.protocol}//${API_HOST}:9003`;
}

const API_BASE = resolveApiBase();
const SOCKET_BASE = resolveSocketBase();

const API = {
  BASE_URL: API_BASE,
  GATEWAY_PORT,

  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    REGISTER: `${API_BASE}/auth/register`
  },

  INCIDENTS: `${API_BASE}/incidents`,

  incident(id) {
    return `${API_BASE}/incidents/${id}`;
  },

  resolve(id) {
    return `${API_BASE}/incidents/${id}/resolve`;
  },

  severity(id) {
    return `${API_BASE}/incidents/${id}/severity`;
  },

  timeline(id) {
    return `${API_BASE}/incidents/${id}/timeline`;
  },

  roles(id) {
    return `${API_BASE}/incidents/${id}/roles`;
  },

  postmortem(id) {
    return `${API_BASE}/incidents/${id}/postmortem`;
  },

  metaStats() {
    return `${API_BASE}/incidents/meta/stats`;
  },

  metaUsers() {
    return `${API_BASE}/incidents/meta/users`;
  },

  SOCKET: SOCKET_BASE
};
