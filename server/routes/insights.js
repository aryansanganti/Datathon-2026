const express = require('express');
const router = express.Router();
const Commit = require('../models/Commit');

// GET /api/insights/user-activity
// Aggregates total commits and lines of code changes per user
router.get('/user-activity', async (req, res) => {
    try {
        const stats = await Commit.aggregate([
            {
                $group: {
                    _id: '$author_id',
                    totalCommits: { $sum: 1 },
                    totalAdditions: { $sum: '$stats.additions' },
                    totalDeletions: { $sum: '$stats.deletions' },
                    totalChanges: { $sum: '$stats.total' },
                    lastCommit: { $max: '$timestamp' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 0,
                    userId: '$user.user_id',
                    displayName: '$user.display_name',
                    email: '$user.email',
                    totalCommits: 1,
                    totalAdditions: 1,
                    totalDeletions: 1,
                    totalChanges: 1,
                    lastCommit: 1
                }
            },
            { $sort: { totalCommits: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/insights/repo-activity
// Overall repository statistics
router.get('/repo-activity', async (req, res) => {
    try {
        const stats = await Commit.aggregate([
            {
                $group: {
                    _id: null,
                    totalCommits: { $sum: 1 },
                    totalAdditions: { $sum: '$stats.additions' },
                    totalDeletions: { $sum: '$stats.deletions' },
                    firstCommit: { $min: '$timestamp' },
                    lastCommit: { $max: '$timestamp' }
                }
            },
            { $project: { _id: 0 } }
        ]);
        res.json(stats[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
