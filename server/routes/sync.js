const express = require('express');
const router = express.Router();
const { runIngestion } = require('../services/ingestion');
const config = require('../config/env');

// POST /api/sync/github/commits
// POST /api/sync/github/commits
router.post('/github/commits', async (req, res) => {
    try {
        const repo = req.body.repo || config.GITHUB_DEFAULT_REPO;
        if (!repo) {
            return res.status(400).json({ error: 'Repository not configured' });
        }

        const result = await runIngestion(repo);
        res.json({ status: 'success', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sync/jira/issues
router.post('/jira/issues', async (req, res) => {
    try {
        const { ingestIssues } = require('../services/jiraIngestion');
        const projectKey = req.body.projectKey;

        if (!projectKey) {
            return res.status(400).json({ error: 'projectKey is required' });
        }

        const result = await ingestIssues(projectKey);
        res.json({ status: 'jira_ingestion_triggered', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
