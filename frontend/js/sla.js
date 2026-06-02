const SLA_HOURS = {
  P1: 1,
  P2: 4,
  P3: 24
};

function getSlaHours(severity) {
  return SLA_HOURS[severity] || 24;
}

function getSlaDeadline(incident) {
  const created = new Date(incident.created_at);
  const hours = getSlaHours(incident.severity);
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

function getSlaEndTime(incident) {
  if (
    incident.status === "RESOLVED" &&
    incident.resolved_at
  ) {
    return new Date(incident.resolved_at);
  }
  return new Date();
}

function getSlaStatus(incident) {
  const deadline = getSlaDeadline(incident);
  const end = getSlaEndTime(incident);

  if (end.getTime() <= deadline.getTime()) {
    return "WITHIN_SLA";
  }
  return "BREACHED";
}

function getSlaLabel(status) {
  if (status === "WITHIN_SLA") {
    return "Within SLA";
  }
  return "SLA Breached";
}

function formatSlaDeadline(incident) {
  return getSlaDeadline(incident).toLocaleString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDurationParts(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

function formatDurationClock(ms) {
  const { h, m, s } = formatDurationParts(ms);
  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  return `${pad2(m)}:${pad2(s)}`;
}

function getSlaTimeRemaining(incident) {
  if (incident.status === "RESOLVED") {
    return null;
  }

  const ms =
    getSlaDeadline(incident).getTime() - Date.now();

  if (ms <= 0) {
    return "Overdue";
  }

  const { h, m } = formatDurationParts(ms);

  if (h > 0) {
    return `${h}h ${m}m left`;
  }
  return `${m}m left`;
}

function getLiveTimerText(incident) {
  if (!incident || !incident.created_at) {
    return "--:--";
  }

  if (incident.status === "RESOLVED") {
    const deadline = getSlaDeadline(incident);
    const resolved = getSlaEndTime(incident);
    const diff = Math.abs(
      deadline.getTime() - resolved.getTime()
    );
    const status = getSlaStatus(incident);
    const label =
      status === "WITHIN_SLA" ? "Met SLA" : "Missed SLA";
    return `${label} · ${formatDurationClock(diff)}`;
  }

  const ms =
    getSlaDeadline(incident).getTime() - Date.now();

  if (ms <= 0) {
    return `OVERDUE ${formatDurationClock(Math.abs(ms))}`;
  }

  return formatDurationClock(ms);
}

function getLiveTimerClass(incident) {
  if (incident.status === "RESOLVED") {
    return getSlaStatus(incident) === "WITHIN_SLA"
      ? "timer-ok"
      : "timer-bad";
  }

  const ms =
    getSlaDeadline(incident).getTime() - Date.now();

  if (ms <= 0) {
    return "timer-bad";
  }

  if (ms < 15 * 60 * 1000) {
    return "timer-warn";
  }

  return "timer-live";
}

function computeSlaSummary(incidentList) {
  const list = incidentList || [];
  let within = 0;
  let breached = 0;

  list.forEach((inc) => {
    if (getSlaStatus(inc) === "WITHIN_SLA") {
      within += 1;
    } else {
      breached += 1;
    }
  });

  const total = list.length;
  const compliance =
    total > 0
      ? Math.round((within / total) * 100)
      : 100;

  return { within, breached, total, compliance };
}

let liveTimerInterval = null;

function startLiveTimers() {
  stopLiveTimers();
  updateLiveTimers();
  liveTimerInterval = setInterval(
    updateLiveTimers,
    1000
  );
}

function stopLiveTimers() {
  if (liveTimerInterval) {
    clearInterval(liveTimerInterval);
    liveTimerInterval = null;
  }
}

function updateLiveTimers() {
  document
    .querySelectorAll("[data-live-timer]")
    .forEach((el) => {
      const id = el.dataset.incidentId;
      const source =
        el.dataset.timerSource || "list";
      let incident = incidents.find(
        (i) => String(i.id) === String(id)
      );

      if (
        source === "warroom" &&
        window.__currentWarRoomIncident &&
        String(window.__currentWarRoomIncident.id) ===
          String(id)
      ) {
        incident = window.__currentWarRoomIncident;
      }

      if (!incident) {
        return;
      }

      el.textContent = getLiveTimerText(incident);
      el.className = `live-timer ${getLiveTimerClass(incident)}`;
    });
}
