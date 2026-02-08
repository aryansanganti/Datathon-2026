const express = require('express');
const router = express.Router();
const axios = require('axios');
const Task = require('../models/Task');

// ============= TEAM MEMBERS =============
const TEAM = [
    { name: 'Aryan', accountId: '712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04', role: 'AWS Solutions Architect' },
    { name: 'Ritwik', accountId: '712020:88eb9ecb-d9f0-40ee-a5d0-9cbe35c6ac8f', role: 'AWS Backend Developer' },
    { name: 'Mohak', accountId: '712020:27f806c7-3623-4153-bb5b-0f60bb121dec', role: 'AWS DevOps Engineer' },
    { name: 'Manu', accountId: '712020:a0876b3e-cc7b-403e-8aac-a8929a1c080e', role: 'AWS Cloud Engineer' }
];

/**
 * Map task role to team member
 */
function mapRoleToTeamMember(roleRequired) {
    const roleMap = {
        // AWS roles
        'aws solutions architect': 'Aryan',
        'aws architect': 'Aryan',
        'solutions architect': 'Aryan',
        'cloud architect': 'Aryan',
        'aws backend developer': 'Ritwik',
        'backend developer': 'Ritwik',
        'backend engineer': 'Ritwik',
        'aws developer': 'Ritwik',
        'backend': 'Ritwik',
        'aws devops engineer': 'Mohak',
        'devops engineer': 'Mohak',
        'devops': 'Mohak',
        'cloud devops': 'Mohak',
        'aws cloud engineer': 'Manu',
        'cloud engineer': 'Manu',
        'infrastructure engineer': 'Manu',
        'sre': 'Manu',
        // Generic AWS - distribute among team
        'aws': 'Aryan',
        // Fallback mappings
        'frontend': 'Aryan',
        'qa': 'Manu'
    };

    const normalizedRole = roleRequired?.toLowerCase() || '';
    const memberName = roleMap[normalizedRole];

    if (memberName) {
        return TEAM.find(m => m.name === memberName);
    }

    // Round-robin if no match
    return TEAM[Math.floor(Math.random() * TEAM.length)];
}

/**
 * Create a Jira issue
 */
async function createJiraIssue(task, assignee, jiraConfig) {
    const body = {
        fields: {
            project: { key: jiraConfig.projectKey },
            summary: task.title,
            description: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [{
                            type: 'text',
                            text: task.description || `Task ID: ${task.task_id}\nDeadline: ${task.deadline}\nPriority: ${task.priority}`
                        }]
                    }
                ]
            },
            issuetype: { name: 'Task' },
            assignee: { accountId: assignee.accountId }
        }
    };

    const auth = {
        username: jiraConfig.email,
        password: jiraConfig.apiToken,
    };

    const res = await axios.post(`${jiraConfig.baseUrl}/rest/api/3/issue`, body, { auth });
    return res.data;
}

/**
 * POST /api/jira/sync-tasks
 * Sync pending tasks to Jira (creates issues and assigns to team members)
 */
router.post('/sync-tasks', async (req, res) => {
    try {
        // Get Jira config from env
        const JIRA_DOMAIN = process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '');
        const JIRA_EMAIL = process.env.JIRA_EMAIL;
        const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
        const PROJECT_KEY = 'SCRUM';

        if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
            return res.status(400).json({ 
                success: false, 
                error: 'Jira credentials not configured' 
            });
        }

        const jiraConfig = {
            baseUrl: `https://${JIRA_DOMAIN}`,
            email: JIRA_EMAIL,
            apiToken: JIRA_API_TOKEN,
            projectKey: PROJECT_KEY
        };

        // Fetch all pending tasks that are not synced to Jira
        const tasks = await Task.find({ 
            status: 'pending',
            $or: [
                { synced_to_jira: false },
                { synced_to_jira: { $exists: false } }
            ]
        }).sort({ deadline: 1 });

        console.log(`Found ${tasks.length} tasks to sync to Jira`);

        const results = {
            total: tasks.length,
            created: 0,
            skipped: 0,
            failed: 0,
            tickets: []
        };

        for (const task of tasks) {
            // Skip if already synced (double check)
            if (task.synced_to_jira && task.jira_issue_key) {
                console.log(`⏭️  ${task.task_id}: Already synced as ${task.jira_issue_key}`);
                results.skipped++;
                continue;
            }

            // Find team member for this task
            const assignee = mapRoleToTeamMember(task.role_required);

            try {
                console.log(`📝 Creating Jira issue: ${task.title} for ${assignee.name}`);
                
                const issue = await createJiraIssue(task, assignee, jiraConfig);

                // Update task in MongoDB with Jira info
                await Task.findByIdAndUpdate(task._id, {
                    jira_issue_key: issue.key,
                    jira_issue_id: issue.id,
                    synced_to_jira: true,
                    status: 'allocated'
                });

                results.created++;
                results.tickets.push({
                    task_id: task.task_id,
                    jira_key: issue.key,
                    jira_id: issue.id,
                    assignee: assignee.name,
                    title: task.title
                });

                console.log(`   ✅ Created: ${issue.key} → Assigned to ${assignee.name}`);
            } catch (err) {
                console.error(`   ❌ Failed to create Jira issue for ${task.task_id}:`, err.message);
                results.failed++;
                results.tickets.push({
                    task_id: task.task_id,
                    error: err.message,
                    assignee: assignee.name,
                    title: task.title
                });
            }
        }

        res.json({
            success: true,
            message: `Synced ${results.created} tasks to Jira`,
            results
        });

    } catch (error) {
        console.error('Error syncing tasks to Jira:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/jira/sync-status
 * Get sync status of tasks
 */
router.get('/sync-status', async (req, res) => {
    try {
        const total = await Task.countDocuments({});
        const synced = await Task.countDocuments({ synced_to_jira: true });
        const pending = await Task.countDocuments({ 
            status: 'pending',
            $or: [
                { synced_to_jira: false },
                { synced_to_jira: { $exists: false } }
            ]
        });

        res.json({
            success: true,
            status: {
                total,
                synced,
                pending,
                syncedPercent: total > 0 ? Math.round((synced / total) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Error getting sync status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
