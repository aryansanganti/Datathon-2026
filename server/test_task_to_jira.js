/**
 * Test: Fetch Tasks from MongoDB and Create Jira Issues
 * Assigns tasks to the 4 team members
 * 
 * Run: node test_task_to_jira.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');
const mongoose = require('mongoose');
const Task = require('./models/Task');

// ============= TEAM MEMBERS =============
const TEAM = [
    { name: 'Aryan', accountId: '712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04', role: 'frontend' },
    { name: 'Ritwik', accountId: '712020:88eb9ecb-d9f0-40ee-a5d0-9cbe35c6ac8f', role: 'backend' },
    { name: 'Mohak', accountId: '712020:27f806c7-3623-4153-bb5b-0f60bb121dec', role: 'devops' },
    { name: 'Manu', accountId: '712020:a0876b3e-cc7b-403e-8aac-a8929a1c080e', role: 'qa' }
];

// ============= JIRA CONFIG =============
const JIRA_DOMAIN = process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = 'SCRUM';

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

// ============= UTILITIES =============
function log(message, type = 'info') {
    const colors = {
        info: '\x1b[36m',
        pass: '\x1b[32m',
        fail: '\x1b[31m',
        warn: '\x1b[33m',
        header: '\x1b[35m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
}

function mapRoleToTeamMember(roleRequired) {
    // Map task roles to team members
    const roleMap = {
        'frontend': 'Aryan',
        'senior frontend developer': 'Aryan',
        'backend': 'Ritwik',
        'backend engineer': 'Ritwik',
        'devops': 'Mohak',
        'devops engineer': 'Mohak',
        'qa': 'Manu',
        'qa engineer': 'Manu',
        // Default mappings for other roles
        'marketing manager': 'Aryan',
        'social media specialist': 'Ritwik',
        'digital marketer': 'Mohak',
        'senior editor': 'Manu'
    };

    const normalizedRole = roleRequired?.toLowerCase() || '';
    const memberName = roleMap[normalizedRole];

    if (memberName) {
        return TEAM.find(m => m.name === memberName);
    }

    // Round-robin if no match
    return TEAM[Math.floor(Math.random() * TEAM.length)];
}

async function createJiraIssue(task, assignee) {
    const body = {
        fields: {
            project: { key: PROJECT_KEY },
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

    const res = await axios.post(`${baseURL}/issue`, body, { auth });
    return res.data;
}

async function main() {
    log('\n╔══════════════════════════════════════════════════════════════╗', 'header');
    log('║     FETCH TASKS & CREATE JIRA ISSUES FOR 4 USERS           ║', 'header');
    log('╚══════════════════════════════════════════════════════════════╝\n', 'header');

    // Connect to MongoDB
    log('Connecting to MongoDB...', 'info');
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ MongoDB connected\n', 'pass');

    // Fetch all pending tasks
    log('Fetching pending tasks from MongoDB...', 'info');
    const tasks = await Task.find({ status: 'pending' }).sort({ deadline: 1 }).lean();
    log(`Found ${tasks.length} pending tasks\n`, 'info');

    if (tasks.length === 0) {
        log('No pending tasks found. Exiting.', 'warn');
        await mongoose.disconnect();
        return;
    }

    // Display team
    log('═══════════════════════════════════════════', 'header');
    log('   TEAM MEMBERS', 'header');
    log('═══════════════════════════════════════════\n', 'header');
    TEAM.forEach(m => log(`  👤 ${m.name} (${m.role}) - ${m.accountId}`, 'info'));

    // Process each task
    log('\n═══════════════════════════════════════════', 'header');
    log('   CREATING JIRA ISSUES', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    let created = 0;
    let failed = 0;

    for (const task of tasks) {
        // Skip if already synced
        if (task.jira_issue_key) {
            log(`⏭️  ${task.task_id}: Already synced as ${task.jira_issue_key}`, 'warn');
            continue;
        }

        // Find team member for this task
        const assignee = mapRoleToTeamMember(task.role_required);

        try {
            log(`📝 Creating issue: ${task.title}`, 'info');
            log(`   Task ID: ${task.task_id} | Role: ${task.role_required} → ${assignee.name}`, 'info');

            const issue = await createJiraIssue(task, assignee);

            // Update task in MongoDB with Jira info
            await Task.findByIdAndUpdate(task._id, {
                jira_issue_key: issue.key,
                jira_issue_id: issue.id,
                synced_to_jira: true,
                status: 'allocated'
            });

            log(`   ✅ Created: ${issue.key} → Assigned to ${assignee.name}`, 'pass');
            created++;
        } catch (err) {
            log(`   ❌ Failed: ${err.message}`, 'fail');
            if (err.response?.data) {
                log(`   Error: ${JSON.stringify(err.response.data.errors || err.response.data)}`, 'fail');
            }
            failed++;
        }

        console.log('');
    }

    // Summary
    log('═══════════════════════════════════════════', 'header');
    log('   SUMMARY', 'header');
    log('═══════════════════════════════════════════\n', 'header');
    log(`Total Tasks: ${tasks.length}`, 'info');
    log(`Created: ${created}`, 'pass');
    log(`Failed: ${failed}`, failed > 0 ? 'fail' : 'pass');

    await mongoose.disconnect();
    log('\n✅ Done!', 'pass');
}

main().catch(err => {
    console.error('Fatal error:', err);
    mongoose.disconnect();
    process.exit(1);
});
