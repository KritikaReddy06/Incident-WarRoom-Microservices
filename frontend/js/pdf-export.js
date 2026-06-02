function exportIncidentsPdf(incidentList) {

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library still loading. Try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const summary = computeSlaSummary(incidentList);
  const user = getCurrentUser();
  const now = new Date().toLocaleString();

  let y = 18;

  doc.setFontSize(18);
  doc.text("Incident War Room — Report", 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${now}`, 14, y);
  y += 5;

  if (user) {
    doc.text(
      `Exported by: ${user.name} (${user.email})`,
      14,
      y
    );
    y += 8;
  }

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(
    `Total: ${summary.total}  |  Within SLA: ${summary.within}  |  Breached: ${summary.breached}  |  Compliance: ${summary.compliance}%`,
    14,
    y
  );
  y += 12;

  doc.setFontSize(9);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, 182, 8, "F");
  doc.setFont(undefined, "bold");
  doc.text("ID", 14, y);
  doc.text("Title", 28, y);
  doc.text("Sev", 100, y);
  doc.text("Status", 115, y);
  doc.text("SLA", 140, y);
  doc.text("Created", 165, y);
  doc.setFont(undefined, "normal");
  y += 8;

  incidentList.forEach((inc) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const sla = getSlaLabel(getSlaStatus(inc));
    const title =
      (inc.title || "").length > 42
        ? inc.title.slice(0, 39) + "..."
        : inc.title || "";

    doc.text(String(inc.id), 14, y);
    doc.text(title, 28, y);
    doc.text(inc.severity || "", 100, y);
    doc.text(inc.status || "", 115, y);
    doc.text(sla, 140, y);
    doc.text(
      new Date(inc.created_at).toLocaleDateString(),
      165,
      y
    );
    y += 7;
  });

  doc.save(
    `incidents-report-${Date.now()}.pdf`
  );
}

function exportSingleIncidentPdf(incident) {

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library still loading. Try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const sla = getSlaLabel(getSlaStatus(incident));
  let y = 18;

  doc.setFontSize(16);
  doc.text(`Incident #${incident.id}`, 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Title: ${incident.title || ""}`, 14, y);
  y += 7;
  doc.text(`Severity: ${incident.severity}`, 14, y);
  y += 7;
  doc.text(`Status: ${incident.status}`, 14, y);
  y += 7;
  doc.text(`SLA: ${sla}`, 14, y);
  y += 7;
  doc.text(
    `Deadline: ${formatSlaDeadline(incident)}`,
    14,
    y
  );
  y += 10;

  doc.text("Description:", 14, y);
  y += 6;
  const desc = doc.splitTextToSize(
    incident.description || "—",
    180
  );
  doc.text(desc, 14, y);
  y += desc.length * 5 + 8;

  if (incident.timeline && incident.timeline.length) {
    doc.setFont(undefined, "bold");
    doc.text("Timeline", 14, y);
    doc.setFont(undefined, "normal");
    y += 7;
    incident.timeline.forEach((t) => {
      const line = `• [${t.event_type}] ${t.message}`;
      const lines = doc.splitTextToSize(line, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 2;
    });
  }

  doc.save(`incident-${incident.id}-report.pdf`);
}
