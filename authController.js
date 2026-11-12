const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { success, error } = require('../utils/response');

async function register(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return error(res, 'VALIDATION_ERROR', 'full_name, email and password are required', 422);
    }
    if (password.length < 6) {
      return error(res, 'VALIDATION_ERROR', 'Password must be at least 6 characters', 422);
    }

    const hash = await bcrypt.hash(password, 10);
    const allowedRoles = ['admin', 'operator', 'viewer'];
    const userRole = allowedRoles.includes(role) ? role : 'operator';

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [full_name, email.toLowerCase().trim(), hash, userRole]
    );

    return success(res, {
      id: result.insertId,
      full_name,
      email: email.toLowerCase().trim(),
      role: userRole
    }, 'User registered', 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return error(res, 'DUPLICATE_EMAIL', 'Email already registered', 409);
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return error(res, 'VALIDATION_ERROR', 'email and password are required', 422);
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.SESSION_SECRET || 'dev-secret-change-me',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return success(res, {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  return success(res, { user: req.user });
}

async function logout(req, res) {
  // Stateless JWT – client discards the token
  return success(res, null, 'Logged out');
}

module.exports = { register, login, me, logout };
