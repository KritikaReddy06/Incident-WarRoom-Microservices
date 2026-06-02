const db = require("../db");

const USER_DIRECTORY = {
  1: "Sharan",
  2: "Rahul"
};

function handleError(res, err) {
  console.error(err);
  res.status(500).json({ error: err.message });
}

async function enrichRoleRows(rows) {
  if (!rows || rows.length === 0) {
    return [];
  }

  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id) => id != null))];
  const authUsers = userIds.length
    ? await db.authQuery(
        `
        SELECT id, name AS user_name, role AS user_role
        FROM users
        WHERE id = ANY($1)
      `,
        [userIds]
      )
    : { rows: [] };

  const userMap = new Map(authUsers.rows.map((user) => [user.id, user]));

  return rows.map((row) => {
    const userInfo = userMap.get(row.user_id) || {};
    return {
      ...row,
      user_name:
        row.user_name ||
        userInfo.user_name ||
        USER_DIRECTORY[row.user_id] ||
        `User #${row.user_id}`,
      user_role: row.user_role || userInfo.user_role
    };
  });
}

async function getIncidentWithDetails(id) {
  const [incidentResult, timelineResult, roleResult, postmortemResult] = await Promise.all([
    db.query(`SELECT * FROM incidents WHERE id=$1`, [id]),
    db.query(`SELECT * FROM incident_timeline WHERE incident_id=$1 ORDER BY id ASC`, [id]),
    db.query(`SELECT * FROM incident_roles WHERE incident_id=$1 ORDER BY id ASC`, [id]),
    db.query(`SELECT * FROM postmortems WHERE incident_id=$1`, [id])
  ]);

  const incident = incidentResult.rows[0];
  if (!incident) {
    return null;
  }

  incident.timeline = timelineResult.rows;
  incident.roles = await enrichRoleRows(roleResult.rows);
  incident.postmortem = postmortemResult.rows[0] || null;
  return incident;
}

async function insertIncidentRole(incidentId, user_id, role_type, user_name) {
  const queryWithName = `
    INSERT INTO incident_roles (incident_id, user_id, role_type, user_name)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const queryWithoutName = `
    INSERT INTO incident_roles (incident_id, user_id, role_type)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  try {
    return await db.query(queryWithName, [incidentId, user_id, role_type, user_name || null]);
  } catch (err) {
    return await db.query(queryWithoutName, [incidentId, user_id, role_type]);
  }
}

const getAll = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM incidents ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
};

const getById = async (req, res) => {
  try {
    const incident = await getIncidentWithDetails(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json(incident);
  } catch (err) {
    handleError(res, err);
  }
};

const create = async (req, res) => {
  try {
    const { title, description, severity, created_by } = req.body;
    const result = await db.query(
      `
      INSERT INTO incidents (title, description, severity, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [title, description, severity, created_by || "Operator"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const resolveIncident = async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE incidents
      SET status='RESOLVED', resolved_at=NOW()
      WHERE id=$1
      RETURNING *
      `,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const changeSeverity = async (req, res) => {
  try {
    const { severity } = req.body;
    const result = await db.query(
      `
      UPDATE incidents
      SET severity=$1
      WHERE id=$2
      RETURNING *
      `,
      [severity, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const addTimelineEvent = async (req, res) => {
  try {
    const { message, event_type } = req.body;
    const result = await db.query(
      `
      INSERT INTO incident_timeline (incident_id, message, event_type)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [req.params.id, message, event_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const getRoles = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM incident_roles WHERE incident_id=$1 ORDER BY id ASC`,
      [req.params.id]
    );
    res.json(await enrichRoleRows(result.rows));
  } catch (err) {
    handleError(res, err);
  }
};

const assignRole = async (req, res) => {
  try {
    const { user_id, role_type, user_name } = req.body;
    const result = await insertIncidentRole(req.params.id, user_id, role_type, user_name);
    const row = result.rows[0];

    if (user_name && !row.user_name) {
      row.user_name = user_name;
    }

    const [enriched] = await enrichRoleRows([row]);
    res.json(enriched);
  } catch (err) {
    handleError(res, err);
  }
};

const savePostmortem = async (req, res) => {
  try {
    const { root_cause, impact_summary, action_items } = req.body;
    const result = await db.query(
      `
      INSERT INTO postmortems (incident_id, root_cause, impact_summary, action_items)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (incident_id) DO UPDATE SET
        root_cause = EXCLUDED.root_cause,
        impact_summary = EXCLUDED.impact_summary,
        action_items = EXCLUDED.action_items
      RETURNING *
      `,
      [req.params.id, root_cause, impact_summary, action_items]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const getStats = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='OPEN')::int AS open,
        COUNT(*) FILTER (WHERE status='RESOLVED')::int AS resolved,
        COUNT(*) FILTER (WHERE severity='P1')::int AS p1,
        COUNT(*) FILTER (WHERE severity='P2')::int AS p2,
        COUNT(*) FILTER (WHERE severity='P3')::int AS p3
      FROM incidents
      `
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleError(res, err);
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await db.authQuery(`SELECT id, name, role FROM users ORDER BY name ASC`);
    res.json(result.rows);
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  resolveIncident,
  changeSeverity,
  addTimelineEvent,
  getRoles,
  assignRole,
  savePostmortem,
  getStats,
  getUsers
};