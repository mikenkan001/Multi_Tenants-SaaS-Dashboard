const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const { run, get } = require('../db');

const SALT_ROUNDS = 10;

const register = async (req, res, next) => {
  try {
    const { email, password, full_name, org_name, subdomain } = req.body;

    if (!email || !password || !full_name || !org_name || !subdomain) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if organization subdomain is unique
    const existingOrg = await get('SELECT id FROM organizations WHERE subdomain = ?', [subdomain]);
    if (existingOrg) {
      return res.status(400).json({ error: 'Subdomain already taken' });
    }

    // Check if user email is unique
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Start transaction-like operation
    // Create organization first
    const orgResult = await run(
      'INSERT INTO organizations (name, subdomain) VALUES (?, ?)',
      [org_name, subdomain]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin user for this organization
    await run(
      `INSERT INTO users (email, password_hash, full_name, role, organization_id) 
       VALUES (?, ?, ?, 'admin', ?)`,
      [email, passwordHash, full_name, orgResult.id]
    );

    res.status(201).json({
      message: 'Organization and admin user created successfully',
      orgId: orgResult.id
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user with organization info
    const user = await get(
      `SELECT u.*, o.name as org_name 
       FROM users u 
       JOIN organizations o ON u.organization_id = o.id 
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Generate token
    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        org_id: user.organization_id,
        org_name: user.org_name
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        org_id: req.user.organization_id,
        org_name: req.user.org_name
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile
};