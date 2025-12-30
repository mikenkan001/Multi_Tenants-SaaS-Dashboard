const tenantMiddleware = (req, res, next) => {
  // This ensures users can only access data from their own organization
  // It's automatically applied by checking req.user.organization_id
  // This is the core of multi-tenancy data isolation
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Add tenant context to request
  req.tenant = {
    id: req.user.organization_id,
    subdomain: req.user.subdomain
  };

  next();
};

const enforceTenantAccess = (tableName) => {
  return async (req, res, next) => {
    // This is a helper for resource-specific tenant checking
    // It's used when we need to verify a resource belongs to user's tenant
    const resourceId = req.params.id;
    
    if (!resourceId) {
      return next();
    }

    try {
      const { get } = require('../db');
      const resource = await get(
        `SELECT * FROM ${tableName} WHERE id = ? AND organization_id = ?`,
        [resourceId, req.user.organization_id]
      );

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found or not accessible' });
      }

      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  tenantMiddleware,
  enforceTenantAccess
};