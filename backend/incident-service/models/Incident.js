const db = require("../db");

const createIncident = async (
  title,
  description,
  severity,
  status
) => {

  const result = await db.query(
    `
    INSERT INTO incidents(
      title,
      description,
      severity,
      status
    )
    VALUES($1,$2,$3,$4)
    RETURNING *
    `,
    [
      title,
      description,
      severity,
      status
    ]
  );

  return result.rows[0];
};

const getAllIncidents = async () => {

  const result = await db.query(
    `
    SELECT *
    FROM incidents
    ORDER BY id DESC
    `
  );

  return result.rows;
};

module.exports = {
  createIncident,
  getAllIncidents
};