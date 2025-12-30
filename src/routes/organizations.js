const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { get } = require('../db');

const getOrganization = async (req, res, next) => {
  try {
    const org = await get(
      'SELECT id, name, subdomain, created_at FROM organizations WHERE id = ?',
      [req.user.organization_id]
    );

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: org });
  } catch (error) {
    next(error);
  }
};

const getOrganizationStats = async (req, res, next) => {
  try {
    const stats = await get(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE organization_id = ?) as total_users,
        (SELECT COUNT(*) FROM projects WHERE organization_id = ?) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE organization_id = ? AND status = 'active') as active_projects,
        (SELECT COUNT(*) FROM projects WHERE organization_id = ? AND status = 'completed') as completed_projects`,
      [req.user.organization_id, req.user.organization_id, req.user.organization_id, req.user.organization_id]
    );

    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

router.use(authenticate);
router.get('/', getOrganization);
router.get('/stats', authorize('admin'), getOrganizationStats);

module.exports = router;