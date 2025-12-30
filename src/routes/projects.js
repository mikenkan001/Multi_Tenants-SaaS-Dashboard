const express = require('express');
const router = express.Router();
const { 
  createProject, 
  getProjects, 
  getProject, 
  updateProject, 
  deleteProject 
} = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const { tenantMiddleware, enforceTenantAccess } = require('../middleware/tenant');

// All project routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

router.post('/', authorize('admin', 'member'), createProject);
router.get('/', authorize('admin', 'member'), getProjects);
router.get('/:id', authorize('admin', 'member'), enforceTenantAccess('projects'), getProject);
router.put('/:id', authorize('admin'), enforceTenantAccess('projects'), updateProject);
router.delete('/:id', authorize('admin'), enforceTenantAccess('projects'), deleteProject);

module.exports = router;