const express = require('express');
const router = express.Router();

/**
 * Knowledge Graph Routes - Stub
 * This will be implemented as the core feature for:
 * - Building commit history based knowledge graph
 * - Node expansion and relationship visualization
 * - Integration with Neo4j or similar graph database
 */

// GET /api/graph/status - Check graph database connection status
router.get('/status', async (req, res) => {
    // Stub - will be replaced with actual graph DB status
    res.json({
        status: 'pending_implementation',
        message: 'Knowledge Graph feature pending implementation',
        features: [
            'Commit-based knowledge graph',
            'User-Task-Project relationships',
            'Skill inference from code',
            'Dependency mapping'
        ]
    });
});

// POST /api/graph/sync - Trigger graph synchronization
router.post('/sync', async (req, res) => {
    // Stub - will sync data to graph database
    res.json({
        status: 'pending_implementation',
        message: 'Graph sync will populate nodes and relationships from MongoDB data'
    });
});

// GET /api/graph/nodes - Get graph nodes (users, projects, tasks)
router.get('/nodes', async (req, res) => {
    try {
        const User = require('../models/User');
        const Issue = require('../models/Issue');
        
        // Get data that will become nodes
        const users = await User.find({}).select('user_id display_name role department team skills').lean();
        const issues = await Issue.find({}).select('key title status priority assignee_id project_id').lean();

        // Format as nodes for visualization
        const userNodes = users.map(u => ({
            id: u.user_id,
            type: 'user',
            label: u.display_name || u.user_id,
            data: {
                role: u.role,
                department: u.department,
                team: u.team,
                skills: u.skills || []
            }
        }));

        const issueNodes = issues.map(i => ({
            id: i.key,
            type: 'issue',
            label: i.key,
            data: {
                title: i.title,
                status: i.status,
                priority: i.priority,
                project: i.project_id
            }
        }));

        res.json({
            nodes: [...userNodes, ...issueNodes],
            meta: {
                userCount: userNodes.length,
                issueCount: issueNodes.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/edges - Get relationships between nodes
router.get('/edges', async (req, res) => {
    try {
        const Issue = require('../models/Issue');
        const Commit = require('../models/Commit');
        const User = require('../models/User');

        // Get assignee relationships (user -> issue)
        const issues = await Issue.find({ assignee_id: { $exists: true, $ne: null } })
            .populate('assignee_id', 'user_id')
            .lean();

        const assigneeEdges = issues
            .filter(i => i.assignee_id)
            .map(i => ({
                source: i.assignee_id.user_id,
                target: i.key,
                type: 'ASSIGNED_TO',
                data: { status: i.status }
            }));

        // Get commit relationships (user -> commits for issues)
        const commits = await Commit.find({ author_id: { $exists: true, $ne: null } })
            .populate('author_id', 'user_id')
            .lean();

        const commitEdges = commits
            .filter(c => c.author_id)
            .map(c => ({
                source: c.author_id.user_id,
                target: c.repo_id || 'main-repo',
                type: 'CONTRIBUTED_TO',
                data: { 
                    additions: c.stats?.additions || 0,
                    deletions: c.stats?.deletions || 0
                }
            }));

        res.json({
            edges: [...assigneeEdges, ...commitEdges],
            meta: {
                assignmentEdges: assigneeEdges.length,
                commitEdges: commitEdges.length
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/graph/user/:userId - Get graph centered on a user
router.get('/user/:userId', async (req, res) => {
    try {
        const User = require('../models/User');
        const Issue = require('../models/Issue');
        const Commit = require('../models/Commit');

        const user = await User.findOne({ user_id: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's issues
        const issues = await Issue.find({ assignee_id: user._id }).lean();
        
        // Get user's commits
        const commits = await Commit.find({ author_id: user._id })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        // Build mini-graph for this user
        const nodes = [
            {
                id: user.user_id,
                type: 'user',
                label: user.display_name || user.user_id,
                data: {
                    role: user.role,
                    department: user.department,
                    team: user.team,
                    skills: user.skills || []
                }
            },
            ...issues.map(i => ({
                id: i.key,
                type: 'issue',
                label: i.key,
                data: { title: i.title, status: i.status }
            }))
        ];

        const edges = issues.map(i => ({
            source: user.user_id,
            target: i.key,
            type: 'ASSIGNED_TO'
        }));

        res.json({
            user: user.toObject(),
            graph: { nodes, edges },
            stats: {
                totalIssues: issues.length,
                totalCommits: commits.length,
                recentCommits: commits.slice(0, 10)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
