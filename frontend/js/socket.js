let socket = null;

let activeIncidentId = null;

function initSocket() {

  if (typeof io === "undefined") {
    return;
  }

  if (socket) {
    return;
  }

  socket = io(API.SOCKET);

  socket.on("connect", () => {
    console.log("Connected to socket server");

    if (activeIncidentId) {
      socket.emit(
        "join-incident",
        activeIncidentId
      );
    }
  });

  socket.on("timeline:new", () => {

    if (
      activeIncidentId &&
      typeof openIncident === "function"
    ) {
      openIncident(activeIncidentId);
    }

    if (typeof loadIncidents === "function") {
      loadIncidents();
    }
  });

  socket.on("severity:changed", () => {

    if (
      activeIncidentId &&
      typeof openIncident === "function"
    ) {
      openIncident(activeIncidentId);
    }

    if (typeof loadIncidents === "function") {
      loadIncidents();
    }
  });
}

function joinIncidentRoom(incidentId) {

  activeIncidentId = incidentId;

  if (!socket) {
    initSocket();
  }

  if (socket && socket.connected) {
    socket.emit(
      "join-incident",
      String(incidentId)
    );
  }
}

function emitTimelineEvent(incidentId, event) {

  if (!socket) {
    initSocket();
  }

  if (socket && socket.connected) {
    socket.emit("timeline-event", {
      incidentId: String(incidentId),
      event
    });
  }
}

function emitSeverityChange(incidentId, severity) {

  if (!socket) {
    initSocket();
  }

  if (socket && socket.connected) {
    socket.emit("severity-change", {
      incidentId: String(incidentId),
      severity
    });
  }
}
