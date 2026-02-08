/**
 * Create Jira Tickets from JSON File
 * 
 * This script reads tasks from a JSON file and creates Jira issues
 * 
 * Run: node create_jira_from_json.js [path/to/tasks.json]
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');

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
        'tester': 'Manu'
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

        // Add due date if available
        if (task.deadline) {
            body.fields.duedate = task.deadline;
        }

        const res = await axios.post(`${baseURL}/issue`, body, { auth });
        return res.data;
    } catch (err) {
        throw err;
    }
}

async function main() {
    logHeader('CREATE JIRA TICKETS FROM JSON FILE');

    // Get JSON file path from command line or use default
    const jsonFilePath = process.argv[2] || path.join(__dirname, 'sample_tasks.json');

    log(`Reading tasks from: ${jsonFilePath}`, 'info');
    log(`Target Jira Project: ${PROJECT_KEY}\n`, 'info');

    try {
        // Read JSON file
        if (!fs.existsSync(jsonFilePath)) {
            log(`❌ File not found: ${jsonFilePath}`, 'fail');
            log('\nUsage: node create_jira_from_json.js [path/to/tasks.json]', 'info');
            log('Default: sample_tasks.json', 'info');
            process.exit(1);
        }

        const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
        const tasks = JSON.parse(fileContent);

        log(`✅ Loaded ${tasks.length} tasks from JSON file\n`, 'pass');

        if (!Array.isArray(tasks) || tasks.length === 0) {
            log('❌ Invalid JSON format or empty array', 'fail');
            process.exit(1);
        }

        // Display sample tasks
        log('📋 Sample tasks:', 'info');
        tasks.slice(0, 3).forEach(task => {
            log(`   - ${task.title || task.task_id} (${task.role_required || 'No role'}) - ${task.priority || 'N/A'}`, 'info');
        });

        // Display team
        logHeader('TEAM MEMBERS');
        TEAM.forEach(m => log(`  👤 ${m.name} (${m.role}) - ${m.accountId}`, 'info'));

        // Process each task
        logHeader('CREATING JIRA ISSUES');

        let created = 0;
        let failed = 0;
        const createdIssues = [];

        for (const task of tasks) {
            // Find team member for this task
            const assignee = mapRoleToTeamMember(task.role_required);

            try {
                log(`\n📝 Creating issue: ${task.title || task.task_id}`, 'info');
                log(`   Task ID: ${task.task_id || 'N/A'} | Role: ${task.role_required || 'N/A'} → ${assignee.name}`, 'info');
                log(`   Priority: ${task.priority || 'N/A'} | Deadline: ${task.deadline || 'N/A'}`, 'info');

                const issue = await createJiraIssue(task, assignee);

                log(`   ✅ Created: ${issue.key} → ${assignee.name}`, 'pass');
                log(`   🔗 View: https://${JIRA_DOMAIN}/browse/${issue.key}`, 'info');

                createdIssues.push({
                    task_id: task.task_id,
                    jira_key: issue.key,
                    jira_id: issue.id,
                    assignee: assignee.name
                });

                created++;

            } catch (err) {
                log(`   ❌ Failed: ${err.message}`, 'fail');
                if (err.response?.data) {
                    const errorDetails = err.response.data.errors || err.response.data;
                    log(`   Error details: ${JSON.stringify(errorDetails)}`, 'fail');
                }
                failed++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Save created issues to file
        if (createdIssues.length > 0) {
            const outputFile = path.join(__dirname, 'created_jira_issues.json');
            fs.writeFileSync(outputFile, JSON.stringify(createdIssues, null, 2));
            log(`\n💾 Saved created issues to: ${outputFile}`, 'info');
        }

        // Summary
        logHeader('EXECUTION SUMMARY');
        log(`Total Tasks: ${tasks.length}`, 'info');
        log(`✅ Created: ${created}`, created > 0 ? 'pass' : 'info');
        log(`❌ Failed: ${failed}`, failed > 0 ? 'fail' : 'info');

        if (created > 0) {
            log(`\n🎉 Successfully created ${created} Jira issues!`, 'pass');
            log(`   View them at: https://${JIRA_DOMAIN}/projects/${PROJECT_KEY}`, 'info');
        }

    } catch (err) {
        log(`\n💥 Unexpected error: ${err.message}`, 'fail');
        console.error(err.stack);
        process.exit(1);
    }
}

// Run the script
main();
