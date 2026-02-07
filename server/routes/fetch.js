const express = require('express');
const router = express.Router();
const Commit = require('../models/Commit');
const SyncState = require('../models/SyncState');

// GET /api/fetch/:source/:entity?since=&limit=
router.get('/:source/:entity', async (req, res) => {
    try {
        const { source, entity } = req.params;
        const { since, limit = 50, page = 1 } = req.query;

        if (source === 'github' && entity === 'commits') {
            const query = { source: 'github' };
            if (since) {
                query.timestamp = { $gt: new Date(since) };
            }

            const limitNum = parseInt(limit);
            const skip = (parseInt(page) - 1) * limitNum;

            const data = await Commit.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('author_id', 'display_name email');

            const total = await Commit.countDocuments(query);

            res.json({
                data,
                pagination: {
                    total,
                    limit: limitNum,
                    page: parseInt(page),
                    pages: Math.ceil(total / limitNum),
                },
            });
        } else if (source === 'jira' && entity === 'issues') {
            const Issue = require('../models/Issue');
            const query = {};
            if (since) {
                query.updated_at = { $gt: new Date(since) };
            }

            const limitNum = parseInt(limit);
            const skip = (parseInt(page) - 1) * limitNum;

            const data = await Issue.find(query)
                .sort({ updated_at: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('assignee_id', 'display_name email');

            const total = await Issue.countDocuments(query);

            res.json({
                data,
                pagination: {
                    total,
                    limit: limitNum,
                    page: parseInt(page),
                    pages: Math.ceil(total / limitNum),
                },
            });
        } else {
            res.status(404).json({ error: 'Source/Entity not supported yet' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
