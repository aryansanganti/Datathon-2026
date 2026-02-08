/**
 * Create Jira Tickets from Tasks in /test Database
 * 
 * This script fetches ALL tasks from the MongoDB 'test' database
 * and creates corresponding Jira issues for them
 * 
 * Run: node create_jira_from_test_tasks.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');
const mongoose = require('mongoose');

// ============= TEAM MEMBERS =============
const TEAM = [
    { name: 'Aryan', accountId: '712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04', role: 'frontend' },
    { name: 'Ritwik', accountId: '712020:88eb9ecb-d9f0-40ee-a5d0-9cbe35c6ac8f', role: 'backend' },
    { name: 'Mohak', accountId: '712020:27f806c7-3623-4153-bb5b-0f60bb121dec', role: 'devops' },
    { name: 'Manu', accountId: '712020:a0876b3e-cc7b-403e-8aac-a8929a1c080e', role: 'qa' }
];

// ============= JIRA CONFIG =============
const JIRA_DOMAIN = process.env.JIRA_DOMAIN ||
    (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = 'SCRUM'; // Change this to your project key

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

// ============= MONGODB CONFIG =============
const MONGODB_URI = process.env.MONGODB_URI;

// ============= UTILITIES =============
const colors = {
    info: '\x1b[36m',
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    warn: '\x1b[33m',
    header: '\x1b[35m',
    reset: '\x1b[0m'
};

function log(message, type = 'info') {
    console.log(`${colors[type]}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log('\n' + colors.header + '═'.repeat(60) + colors.reset);
    console.log(colors.header + '   ' + message + colors.reset);
    console.log(colors.header + '═'.repeat(60) + colors.reset + '\n');
}

function mapRoleToTeamMember(roleRequired) {
    const roleMap = {
        'frontend': 'Aryan',
        'senior frontend developer': 'Aryan',
        'frontend developer': 'Aryan',
        'backend': 'Ritwik',
        'backend engineer': 'Ritwik',
        'backend developer': 'Ritwik',
        'devops': 'Mohak',
        'devops engineer': 'Mohak',
        'qa': 'Manu',
        'qa engineer': 'Manu',
        'tester': 'Manu',
        // Additional role mappings
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
    try {
        const body = {
            fields: {
                project: { key: PROJECT_KEY },
                summary: task.title || task.task_id || 'Untitled Task',
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: task.description ||
                                    `Task ID: ${task.task_id || 'N/A'}\n` +
                                    `Deadline: ${task.deadline || 'N/A'}\n` +
                                    `Priority: ${task.priority || 'Medium'}\n` +
                                    `Role: ${task.role_required || 'N/A'}`
                            }]
                        }
                    ]
                },
                issuetype: { name: 'Task' },
                assignee: { accountId: assignee.accountId }
            }
        };

        // Add priority if available
        if (task.priority) {
            const priorityMap = {
                'high': 'High',
                'medium': 'Medium',
                'low': 'Low',
                'critical': 'Highest',
                'urgent': 'High'
            };
            const jiraPriority = priorityMap[task.priority.toLowerCase()] || 'Medium';
            body.fields.priority = { name: jiraPriority };
        }

        const res = await axios.post(`${baseURL}/issue`, body, { auth });
        return res.data;
    } catch (err) {
        throw err;
    }
}

async function main() {
    logHeader('CREATE JIRA TICKETS FROM TEST DATABASE TASKS');
    log('Using MongoDB test database', 'info');
    log(`Target Jira Project: ${PROJECT_KEY}`, 'info');

    try {
        // Connect to MongoDB test database
        log('\nConnecting to MongoDB test database...', 'info');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'test'  // Explicitly use test database
        });

        const dbName = mongoose.connection.db.databaseName;
        log(`✅ Connected to database: ${dbName}`, 'pass');

        // Get the tasks collection directly
        const db = mongoose.connection.db;
        const tasksCollection = db.collection('tasks');

        // Fetch all tasks
        log('\nFetching tasks from test database...', 'info');
        const tasks = await tasksCollection.find({}).toArray();
        log(`✅ Found ${tasks.length} tasks`, 'pass');

        if (tasks.length === 0) {
            log('\n⚠️  No tasks found in test database. Exiting.', 'warn');
            await mongoose.disconnect();
            return;
        }

        // Display sample tasks
        log('\n📋 Sample tasks:', 'info');
        tasks.slice(0, 3).forEach(task => {
            log(`   - ${task.title || task.task_id || 'Untitled'} (${task.role_required || 'No role'})`, 'info');
        });

        // Display team
        logHeader('TEAM MEMBERS');
        TEAM.forEach(m => log(`  👤 ${m.name} (${m.role}) - ${m.accountId}`, 'info'));

        // Process each task
        logHeader('CREATING JIRA ISSUES');

        let created = 0;
        let skipped = 0;
        let failed = 0;

        for (const task of tasks) {
            // Skip if already has Jira key
            if (task.jira_issue_key) {
                log(`⏭️  ${task.title || task.task_id}: Already synced as ${task.jira_issue_key}`, 'warn');
                skipped++;
                continue;
            }

            // Find team member for this task
            const assignee = mapRoleToTeamMember(task.role_required);

            try {
                log(`\n📝 Creating issue: ${task.title || task.task_id}`, 'info');
                log(`   Role: ${task.role_required || 'N/A'} → Assigned to: ${assignee.name}`, 'info');

                const issue = await createJiraIssue(task, assignee);

                // Update task in MongoDB with Jira info
                await tasksCollection.updateOne(
                    { _id: task._id },
                    {
                        $set: {
                            jira_issue_key: issue.key,
                            jira_issue_id: issue.id,
                            synced_to_jira: true,
                            status: 'allocated',
                            updated_at: new Date()
                        }
                    }
                );

                log(`   ✅ Created: ${issue.key} → ${assignee.name}`, 'pass');
                log(`   🔗 View: https://${JIRA_DOMAIN}/browse/${issue.key}`, 'info');
                created++;

            } catch (err) {
                log(`   ❌ Failed: ${err.message}`, 'fail');
                if (err.response?.data) {
                    const errorDetails = err.response.data.errors || err.response.data;
                    log(`   Error details: ${JSON.stringify(errorDetails)}`, 'fail');
                }
                failed++;
            }
        }

        // Summary
        logHeader('EXECUTION SUMMARY');
        log(`Total Tasks: ${tasks.length}`, 'info');
        log(`✅ Created: ${created}`, created > 0 ? 'pass' : 'info');
        log(`⏭️  Skipped: ${skipped}`, 'warn');
        log(`❌ Failed: ${failed}`, failed > 0 ? 'fail' : 'info');

        if (created > 0) {
            log(`\n🎉 Successfully created ${created} Jira issues!`, 'pass');
            log(`   View them at: https://${JIRA_DOMAIN}/projects/${PROJECT_KEY}`, 'info');
        }

    } catch (err) {
        log(`\n💥 Unexpected error: ${err.message}`, 'fail');
        console.error(err.stack);
    } finally {
        await mongoose.disconnect();
        log('\n👋 MongoDB disconnected. Exiting.', 'info');
    }
}

// Run the script
main();
