const { query, run, get } = require('../db');

const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await run(
      `INSERT INTO projects (name, description, organization_id, created_by) 
       VALUES (?, ?, ?, ?)`,
      [name, description, req.user.organization_id, req.user.id]
    );

    const project = await get('SELECT * FROM projects WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE organization_id = ?';
    const params = [req.user.organization_id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Get projects with creator info
    const projects = await query(
      `SELECT p.*, u.full_name as creator_name 
       FROM projects p 
       LEFT JOIN users u ON p.created_by = u.id 
       ${whereClause}
       ORDER BY p.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count for pagination
    const countResult = await get(
      `SELECT COUNT(*) as total FROM projects ${whereClause}`,
      params
    );

    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProject = async (req, res, next) => {
  try {
    const project = await get(
      `SELECT p.*, u.full_name as creator_name 
       FROM projects p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = ? AND p.organization_id = ?`,
      [req.params.id, req.user.organization_id]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.user.organization_id);

    const result = await run(
      `UPDATE projects 
       SET ${updates.join(', ')} 
       WHERE id = ? AND organization_id = ?`,
      params
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found or not accessible' });
    }

    const updatedProject = await get(
      'SELECT * FROM projects WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const result = await run(
      'DELETE FROM projects WHERE id = ? AND organization_id = ?',
      [req.params.id, req.user.organization_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found or not accessible' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
};