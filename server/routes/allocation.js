const express = require('express');
const router = express.Router();
const { previewAllocation, runAllocation } = require('../services/allocationEngine');
const AllocationRun = require('../models/AllocationRun');

router.post('/run', async (req, res) => {
    try {
        const { project_key, board_id, sprint_name, sprint_duration_days } = req.body || {};
        if (!project_key || board_id == null || !sprint_name) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'project_key, board_id, and sprint_name are required',
            });
        }
        const result = await runAllocation({
            project_key,
            board_id,
            sprint_name,
            sprint_duration_days,
        });
        return res.status(200).json(result);
    } catch (err) {
        if (err.response) {
            const status = err.response.status;
            if (status === 401) {
                return res.status(401).json({ error: 'Jira auth failed', message: err.message });
            }
            if (status === 400) {
                return res.status(400).json({ error: 'Bad request to Jira', message: err.message });
            }
            return res.status(502).json({ error: 'Jira API error', message: err.message });
        }
        return res.status(500).json({ error: err.message });
    }
});

router.get('/preview', async (req, res) => {
    try {
        const projectKey = req.query.project_key;
        const result = await previewAllocation(projectKey);
        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
        const runs = await AllocationRun.find({})
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();
        return res.json(runs);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
