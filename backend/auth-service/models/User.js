const db = require("../db");

const findUserByEmail = async (email) => {

  const result = await db.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  return result.rows[0];
};

const createUser = async (
  name,
  email,
  password
) => {

  const result = await db.query(
    `
    INSERT INTO users(
      name,
      email,
      password,
      role
    )
    VALUES($1,$2,$3,$4)
    RETURNING *
    `,
    [
      name,
      email,
      password,
      "engineer"
    ]
  );

  return result.rows[0];
};

module.exports = {
  findUserByEmail,
  createUser
};