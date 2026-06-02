const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
  findUserByEmail,
  createUser
} = require("../models/User");

/*
 REGISTER
*/
const register = async (req, res) => {

  try {

    console.log("BODY:", req.body);

    const {
      name,
      email,
      password
    } = req.body;

    const existingUser =
      await findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);
  
    const user = await createUser(
      name,
      email,
      hashedPassword
    );

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

  } catch (err) {

    console.log("FULL ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message
    });
  }
};

/*
 LOGIN
*/
const login = async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const user =
      await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid password"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
  } catch (err) {

    console.log("FULL ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message
    });
  }
};

module.exports = {
  register,
  login
};