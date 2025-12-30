const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { query, run, get } = require('../db');

const getUsers = async (req, res, next) => {
  try {
    const users = await query(
      `SELECT id, email, full_name, role, is_active, created_at, last_login 
       FROM users 
       WHERE organization_id = ? 
       ORDER BY created_at DESC`,
      [req.user.organization_id]
    );

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, full_name, role = 'member' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Check if email exists in this organization
    const existingUser = await get(
      'SELECT id FROM users WHERE email = ? AND organization_id = ?',
      [email, req.user.organization_id]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists in this organization' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (email, password_hash, full_name, role, organization_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, full_name, role, req.user.organization_id]
    );

    const user = await get(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { full_name, role, is_active } = req.body;
    const targetUserId = req.params.id;

    // Admins can update any user in their org, users can only update themselves
    if (req.user.role !== 'admin' && req.user.id !== parseInt(targetUserId)) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Admins cannot change their own role or deactivate themselves
    if (req.user.id === parseInt(targetUserId)) {
      if (role && role !== req.user.role) {
        return res.status(400).json({ error: 'You cannot change your own role' });
      }
      if (is_active === false) {
        return res.status(400).json({ error: 'You cannot deactivate yourself' });
      }
    }

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (role !== undefined && req.user.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined && req.user.role === 'admin') {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(targetUserId, req.user.organization_id);

    const result = await run(
      `UPDATE users 
       SET ${updates.join(', ')} 
       WHERE id = ? AND organization_id = ?`,
      params
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found or not accessible' });
    }

    const updatedUser = await get(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = ?',
      [targetUserId]
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

router.use(authenticate);
router.get('/', authorize('admin'), getUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', updateUser);

module.exports = router;