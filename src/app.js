require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { setupDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const orgRoutes = require('./routes/organizations');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database initialization
setupDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`Multi-tenant SaaS API running on port ${PORT}`);
});