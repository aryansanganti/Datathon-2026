const express = require('express');
const router = express.Router();
const Commit = require('../models/Commit');
const Task = require('../models/Task');
const User = require('../models/User');
const SyncState = require('../models/SyncState');
const {
    fetchProjects,
    fetchBoards,
    fetchSprints,
    searchIssues,
} = require('../services/jiraClient');

// GET /api/fetch/tasks
router.get('/tasks', async (req, res) => {
    try {
        const { status, role, limit = 50, page = 1 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (role) query.role_required = role;
        const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
        const skip = (parseInt(page, 10) - 1) * limitNum;
        const tasks = await Task.find(query)
            .sort({ deadline: 1 })
            .skip(skip)
            .limit(limitNum)
            .populate('allocated_to', 'display_name email user_id')
            .lean();
        const total = await Task.countDocuments(query);
        res.json({ tasks, total, page: parseInt(page, 10) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/tasks/:task_id
router.get('/tasks/:task_id', async (req, res) => {
    try {
        const task = await Task.findOne({ task_id: req.params.task_id })
            .populate('allocated_to', 'display_name email user_id role jira_account_id')
            .lean();
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/users
router.get('/users', async (req, res) => {
    try {
        const { role, source } = req.query;
        const query = {};
        if (role) query.role = role;
        if (source) query.source = source;
        const users = await User.find(query)
            .select('user_id display_name email role jira_account_id capacity_hours_per_sprint source')
            .lean();
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/jira/projects
router.get('/jira/projects', async (req, res) => {
    try {
        const list = await fetchProjects();
        const projects = Array.isArray(list) ? list : (list.values || []);
        res.json({ projects: projects.map((p) => ({ id: p.id, key: p.key, name: p.name })) });
    } catch (err) {
        if (err.response && err.response.status === 401) return res.status(401).json({ error: 'Jira auth failed' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/jira/boards
router.get('/jira/boards', async (req, res) => {
    try {
        const projectKey = req.query.project_key;
        if (!projectKey) return res.status(400).json({ error: 'project_key required' });
        const boards = await fetchBoards(projectKey);
        res.json({ boards: boards.map((b) => ({ id: b.id, name: b.name, type: b.type })) });
    } catch (err) {
        if (err.response && err.response.status === 401) return res.status(401).json({ error: 'Jira auth failed' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/jira/sprints
router.get('/jira/sprints', async (req, res) => {
    try {
        const boardId = req.query.board_id;
        if (!boardId) return res.status(400).json({ error: 'board_id required' });
        const data = await fetchSprints(boardId);
        const values = data.values || (Array.isArray(data) ? data : []);
        res.json({ sprints: values.map((s) => ({ id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate })) });
    } catch (err) {
        if (err.response && err.response.status === 401) return res.status(401).json({ error: 'Jira auth failed' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/jira/issues
router.get('/jira/issues', async (req, res) => {
    try {
        const { project_key, sprint_id } = req.query;
        if (!project_key) return res.status(400).json({ error: 'project_key required' });
        let jql = `project = "${project_key}"`;
        if (sprint_id) jql += ` AND sprint = ${sprint_id}`;
        const out = await searchIssues(jql, undefined, 50);
        res.json({ issues: (out.issues || []).map((i) => ({ key: i.key, summary: i.fields?.summary, status: i.fields?.status?.name, assignee: i.fields?.assignee, priority: i.fields?.priority?.name })) });
    } catch (err) {
        if (err.response && err.response.status === 401) return res.status(401).json({ error: 'Jira auth failed' });
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/users/:user_id/workload
router.get('/users/:user_id/workload', async (req, res) => {
    try {
        const uid = req.params.user_id;
        const user = await User.findOne({ $or: [{ user_id: uid }, { _id: uid }] }).lean();
        if (!user) return res.status(404).json({ error: 'User not found' });
        const tasks = await Task.find({
            allocated_to: user._id,
            status: { $in: ['allocated', 'in_progress'] },
        }).lean();
        const total_estimated_hours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
        const capacity_hours = user.capacity_hours_per_sprint ?? 40;
        const availability_percentage = capacity_hours > 0 ? Math.round((total_estimated_hours / capacity_hours) * 100) : 0;
        res.json({
            user_id: user.user_id || user._id.toString(),
            allocated_tasks: tasks.length,
            total_estimated_hours,
            capacity_hours,
            availability_percentage,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fetch/dashboard/summary
router.get('/dashboard/summary', async (req, res) => {
    try {
        const pending_tasks = await Task.countDocuments({ status: 'pending' });
        const allocated_tasks = await Task.countDocuments({ status: { $in: ['allocated', 'in_progress'] } });
        const distinctSprints = await Task.distinct('sprint_id', { sprint_id: { $exists: true, $ne: null, $ne: '' } });
        const active_sprints = distinctSprints.filter(Boolean).length;
        const usersByRole = await User.aggregate([{ $match: { role: { $exists: true, $ne: null } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]);
        const users_by_role = usersByRole.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});
        res.json({ pending_tasks, allocated_tasks, active_sprints, users_by_role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
