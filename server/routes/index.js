const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { getMetrics } = require('../utils/metricsStore');
const SyncState = require('../models/SyncState');

// Import route files
const taskRoutes = require('./tasks');
const transcriptRoutes = require('./transcript');
const jiraRoutes = require('./jira');

// Use routes
router.use('/tasks', taskRoutes);
router.use('/transcript', transcriptRoutes);
router.use('/jira', jiraRoutes);
const oauthRoutes = require('./oauth');
const fetchRoutes = require('./fetch');
const syncRoutes = require('./sync');
const rolesRoutes = require('./roles');
const graphRoutes = require('./graph');
const insightsRoutes = require('./insights');

router.use('/oauth', oauthRoutes);
router.use('/fetch', fetchRoutes);
router.use('/sync', syncRoutes);
router.use('/allocation', require('./allocation'));
router.use('/roles', rolesRoutes);
router.use('/graph', graphRoutes);
router.use('/webhooks', require('./webhooks'));
router.use('/insights', insightsRoutes);
router.use('/smart-allocate', require('./smartAllocate'));
router.use('/finance', require('./finance'));
router.use('/hr', require('./hr'));

// Health: include DB check
router.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
});

// Metrics: in-memory counts + last sync times from SyncState
router.get('/metrics', async (req, res) => {
  try {
    const inMemory = getMetrics();
    const syncStates = await SyncState.find({}).lean();
    const lastSyncBySourceEntity = {};
    syncStates.forEach((s) => {
      lastSyncBySourceEntity[`${s.source}:${s.entity}`] = {
        last_sync_at: s.last_sync_at,
        last_cursor: s.last_cursor,
      };
    });
    res.json({
      by_source_entity: inMemory,
      last_sync: lastSyncBySourceEntity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
