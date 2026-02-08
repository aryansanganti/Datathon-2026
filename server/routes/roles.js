const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Role definitions with hierarchy
const ROLES = {
    'Executive': { level: 5, canManage: ['all'] },
    'HR': { level: 4, canManage: ['Developer', 'Senior Developer', 'QA Engineer', 'DevOps Engineer', 'Intern'] },
    'Finance': { level: 4, canManage: [] },
    'Project Manager': { level: 4, canManage: ['Developer', 'Senior Developer', 'Tech Lead', 'QA Engineer', 'DevOps Engineer', 'Product Manager'] },
    'Product Manager': { level: 3, canManage: ['Developer', 'Senior Developer', 'QA Engineer'] },
    'Tech Lead': { level: 3, canManage: ['Developer', 'Senior Developer', 'QA Engineer', 'DevOps Engineer'] },
    'Senior Developer': { level: 2, canManage: ['Developer'] },
    'Developer': { level: 1, canManage: [] },
    'QA Engineer': { level: 2, canManage: [] },
    'DevOps Engineer': { level: 2, canManage: [] },
    'Unassigned': { level: 0, canManage: [] }
};

const DEPARTMENTS = ['Engineering', 'Product', 'HR', 'Finance', 'Executive', 'Operations', 'QA'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];

// GET /api/roles/config - Get role configuration
router.get('/config', (req, res) => {
    res.json({
        roles: Object.keys(ROLES),
        roleHierarchy: ROLES,
        departments: DEPARTMENTS,
        employmentTypes: EMPLOYMENT_TYPES,
        seniorityLevels: [1, 2, 3, 4, 5], // 1=Junior, 5=Principal
    });
});

// GET /api/roles/users - Get all users with their roles
router.get('/users', async (req, res) => {
    try {
        const { role, department, team, source } = req.query;
        const query = {};
        
        if (role) query.role = role;
        if (department) query.department = department;
        if (team) query.team = team;
        if (source) query.source = source;

        const users = await User.find(query)
            .select('-__v')
            .sort({ role: 1, display_name: 1 });

        res.json({ users, total: users.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/roles/users/:userId - Get single user
router.get('/users/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ user_id: req.params.userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/roles/users/:userId - Update user role and details
router.put('/users/:userId', async (req, res) => {
    try {
        const { role, department, team, salary_band, hourly_rate, employment_type, skills, seniority_level } = req.body;
        
        const updateFields = {};
        if (role && ROLES[role]) updateFields.role = role;
        if (department) updateFields.department = department;
        if (team) updateFields.team = team;
        if (salary_band) updateFields.salary_band = salary_band;
        if (hourly_rate !== undefined) updateFields.hourly_rate = hourly_rate;
        if (employment_type && EMPLOYMENT_TYPES.includes(employment_type)) {
            updateFields.employment_type = employment_type;
        }
        if (skills && Array.isArray(skills)) updateFields.skills = skills;
        if (seniority_level !== undefined && seniority_level >= 1 && seniority_level <= 5) {
            updateFields.seniority_level = seniority_level;
        }

        const user = await User.findOneAndUpdate(
            { user_id: req.params.userId },
            { $set: updateFields },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated successfully', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/roles/users/bulk-assign - Bulk assign roles
router.post('/users/bulk-assign', async (req, res) => {
    try {
        const { assignments } = req.body;
        // assignments: [{ user_id, role, department, team }, ...]

        if (!Array.isArray(assignments)) {
            return res.status(400).json({ error: 'assignments must be an array' });
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (const assignment of assignments) {
            try {
                const updateFields = {};
                if (assignment.role && ROLES[assignment.role]) {
                    updateFields.role = assignment.role;
                }
                if (assignment.department) updateFields.department = assignment.department;
                if (assignment.team) updateFields.team = assignment.team;
                if (assignment.hourly_rate) updateFields.hourly_rate = assignment.hourly_rate;

                await User.findOneAndUpdate(
                    { user_id: assignment.user_id },
                    { $set: updateFields }
                );
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ user_id: assignment.user_id, error: err.message });
            }
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/roles/teams - Get team structure
router.get('/teams', async (req, res) => {
    try {
        const teams = await User.aggregate([
            { $match: { team: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: { team: '$team', department: '$department' },
                    members: { $push: { 
                        user_id: '$user_id', 
                        display_name: '$display_name', 
                        role: '$role',
                        seniority_level: '$seniority_level'
                    }},
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.department': 1, '_id.team': 1 } }
        ]);

        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/roles/org-structure - Get organizational hierarchy
router.get('/org-structure', async (req, res) => {
    try {
        const structure = await User.aggregate([
            {
                $group: {
                    _id: '$department',
                    teams: { $addToSet: '$team' },
                    roleBreakdown: { $push: '$role' },
                    totalMembers: { $sum: 1 }
                }
            },
            {
                $project: {
                    department: '$_id',
                    teams: 1,
                    totalMembers: 1,
                    roleBreakdown: 1,
                    _id: 0
                }
            },
            { $sort: { department: 1 } }
        ]);

        // Also get role summary for cost estimation prep
        const roleSummary = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    avgHourlyRate: { $avg: '$hourly_rate' },
                    avgSeniority: { $avg: '$seniority_level' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({ structure, roleSummary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/roles/auto-assign - Auto-assign roles based on activity patterns
router.post('/auto-assign', async (req, res) => {
    try {
        const Commit = require('../models/Commit');
        const Issue = require('../models/Issue');
        
        // Get users with their activity stats
        const commitStats = await Commit.aggregate([
            {
                $group: {
                    _id: '$author_id',
                    totalCommits: { $sum: 1 },
                    totalAdditions: { $sum: '$stats.additions' },
                    totalDeletions: { $sum: '$stats.deletions' }
                }
            }
        ]);

        const issueStats = await Issue.aggregate([
            {
                $group: {
                    _id: '$assignee_id',
                    totalIssues: { $sum: 1 },
                    totalStoryPoints: { $sum: '$story_points' }
                }
            }
        ]);

        // Create maps for quick lookup
        const commitMap = new Map(commitStats.map(c => [c._id?.toString(), c]));
        const issueMap = new Map(issueStats.map(i => [i._id?.toString(), i]));

        // Get all unassigned users
        const unassignedUsers = await User.find({ role: 'Unassigned' });
        
        const assignments = [];
        for (const user of unassignedUsers) {
            const commits = commitMap.get(user._id.toString()) || { totalCommits: 0 };
            const issues = issueMap.get(user._id.toString()) || { totalIssues: 0 };

            // Simple heuristic for auto-assignment
            let suggestedRole = 'Developer';
            let suggestedSeniority = 1;

            if (commits.totalCommits > 100) {
                suggestedRole = 'Senior Developer';
                suggestedSeniority = 3;
            } else if (commits.totalCommits > 50) {
                suggestedRole = 'Developer';
                suggestedSeniority = 2;
            }

            // Update user
            await User.findByIdAndUpdate(user._id, {
                role: suggestedRole,
                seniority_level: suggestedSeniority,
                department: 'Engineering',
                team: 'Development Team'
            });

            assignments.push({
                user_id: user.user_id,
                display_name: user.display_name,
                assigned_role: suggestedRole,
                seniority_level: suggestedSeniority,
                based_on: { commits: commits.totalCommits, issues: issues.totalIssues }
            });
        }

        res.json({
            message: `Auto-assigned ${assignments.length} users`,
            assignments
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
