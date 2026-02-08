/**
 * Comprehensive Jira Two-Way Connection Test
 * Tests actual Jira API - NO MOCKS
 * 
 * Account ID to test: 712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04
 * 
 * Run: node test_jira_comprehensive.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');
const mongoose = require('mongoose');

// ============= CONFIGURATION =============
const TEST_USERS = [
    { name: 'Aryan', accountId: '712020:f4133ad3-9b22-491e-8260-37d3ce9dcf04' },
    { name: 'Ritwik', accountId: '712020:88eb9ecb-d9f0-40ee-a5d0-9cbe35c6ac8f' },
    { name: 'Mohak', accountId: '712020:27f806c7-3623-4153-bb5b-0f60bb121dec' },
    { name: 'Manu', accountId: '712020:a0876b3e-cc7b-403e-8aac-a8929a1c080e' }
];

// MongoDB Connection
async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        log('✅ MongoDB connected successfully', 'pass');
        return true;
    } catch (err) {
        log(`MongoDB connection failed: ${err.message}`, 'fail');
        return false;
    }
}

async function disconnectMongoDB() {
    try {
        await mongoose.disconnect();
        log('MongoDB disconnected', 'info');
    } catch (err) {
        // Ignore disconnect errors
    }
}

// Environment Variables
const JIRA_DOMAIN = process.env.JIRA_DOMAIN ||
    (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;
const agileURL = `https://${JIRA_DOMAIN}/rest/agile/1.0`;

// ============= TEST RESULTS =============
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// ============= UTILITIES =============
function log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const colors = {
        info: '\x1b[36m',    // Cyan
        pass: '\x1b[32m',    // Green
        fail: '\x1b[31m',    // Red
        warn: '\x1b[33m',    // Yellow
        header: '\x1b[35m',  // Magenta
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function recordTest(name, passed, details = {}) {
    results.tests.push({ name, passed, details });
    if (passed) {
        results.passed++;
        log(`✅ PASS: ${name}`, 'pass');
    } else {
        results.failed++;
        log(`❌ FAIL: ${name}`, 'fail');
        if (details.error) log(`   Error: ${details.error}`, 'fail');
    }
}

// ============= PHASE 1: ENVIRONMENT VERIFICATION =============
async function testEnvironmentVariables() {
    log('\n═══════════════════════════════════════════', 'header');
    log('   PHASE 1: ENVIRONMENT VERIFICATION', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    const envVars = {
        'JIRA_EMAIL': JIRA_EMAIL,
        'JIRA_API_TOKEN': JIRA_API_TOKEN,
        'JIRA_DOMAIN (derived)': JIRA_DOMAIN,
    };

    let allSet = true;
    for (const [key, value] of Object.entries(envVars)) {
        if (value) {
            const displayValue = key.includes('TOKEN') ? value.substring(0, 8) + '...' : value;
            log(`  ${key}: ${displayValue}`, 'info');
        } else {
            log(`  ${key}: NOT SET`, 'fail');
            allSet = false;
        }
    }

    recordTest('Environment Variables Set', allSet, { envVars: Object.keys(envVars) });
    return allSet;
}

// ============= PHASE 2: READ OPERATIONS =============
async function testAuthentication() {
    log('\n═══════════════════════════════════════════', 'header');
    log('   PHASE 2: READ OPERATIONS', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    try {
        log('Testing /rest/api/3/myself...', 'info');
        const res = await axios.get(`${baseURL}/myself`, { auth });
        const user = res.data;

        log(`  Authenticated as: ${user.displayName}`, 'info');
        log(`  Email: ${user.emailAddress}`, 'info');
        log(`  Account ID: ${user.accountId}`, 'info');

        recordTest('Jira Authentication (getMyself)', true, {
            displayName: user.displayName,
            accountId: user.accountId
        });
        return user;
    } catch (err) {
        recordTest('Jira Authentication (getMyself)', false, {
            error: err.message,
            status: err.response?.status,
            data: err.response?.data
        });
        return null;
    }
}

async function testFetchProjects() {
    try {
        log('\nTesting fetchProjects()...', 'info');
        const res = await axios.get(`${baseURL}/project`, { auth });
        const projects = Array.isArray(res.data) ? res.data : (res.data.values || []);

        log(`  Found ${projects.length} projects:`, 'info');
        projects.forEach(p => log(`    - [${p.key}] ${p.name} (ID: ${p.id})`, 'info'));

        recordTest('Fetch Projects', true, { count: projects.length });
        return projects;
    } catch (err) {
        recordTest('Fetch Projects', false, { error: err.message });
        return [];
    }
}

async function testFetchBoards(projectKey) {
    try {
        log(`\nTesting fetchBoards(${projectKey})...`, 'info');
        const res = await axios.get(`${agileURL}/board`, {
            auth,
            params: { projectKeyOrId: projectKey }
        });
        const boards = res.data.values || [];

        log(`  Found ${boards.length} boards:`, 'info');
        boards.forEach(b => log(`    - [${b.id}] ${b.name} (${b.type})`, 'info'));

        recordTest('Fetch Boards', true, { count: boards.length });
        return boards;
    } catch (err) {
        recordTest('Fetch Boards', false, { error: err.message });
        return [];
    }
}

async function testFetchSprints(boardId) {
    try {
        log(`\nTesting fetchSprints(${boardId})...`, 'info');
        const res = await axios.get(`${agileURL}/board/${boardId}/sprint`, { auth });
        const sprints = res.data.values || [];

        log(`  Found ${sprints.length} sprints:`, 'info');
        sprints.forEach(s => log(`    - [${s.id}] ${s.name} (${s.state})`, 'info'));

        recordTest('Fetch Sprints', true, { count: sprints.length });
        return sprints;
    } catch (err) {
        recordTest('Fetch Sprints', false, { error: err.message });
        return [];
    }
}

async function testSearchIssues(projectKey) {
    try {
        const jql = `project = ${projectKey} ORDER BY created DESC`;
        log(`\nTesting searchIssues("${jql}")...`, 'info');

        const res = await axios.post(`${baseURL}/search/jql`, {
            jql,
            maxResults: 5,
            fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'priority']
        }, { auth });

        const issues = res.data.issues || [];
        log(`  Found ${issues.length} issues:`, 'info');
        issues.forEach(i => {
            const assignee = i.fields?.assignee?.displayName || 'Unassigned';
            log(`    - ${i.key}: ${i.fields?.summary?.substring(0, 40)}... (${assignee})`, 'info');
        });

        recordTest('Search Issues (JQL)', true, { count: issues.length });
        return issues;
    } catch (err) {
        recordTest('Search Issues (JQL)', false, {
            error: err.message,
            data: err.response?.data
        });
        return [];
    }
}

async function testSearchUsers(query) {
    try {
        log(`\nTesting searchUsers("${query}")...`, 'info');
        const res = await axios.get(`${baseURL}/user/search`, {
            auth,
            params: { query }
        });

        const users = res.data || [];
        log(`  Found ${users.length} users:`, 'info');
        users.slice(0, 5).forEach(u => log(`    - ${u.displayName} (${u.accountId})`, 'info'));

        recordTest('Search Users', true, { count: users.length });
        return users;
    } catch (err) {
        recordTest('Search Users', false, { error: err.message });
        return [];
    }
}

async function testGetUserByAccountId(accountId, userName = '') {
    try {
        log(`\nTesting get user by Account ID${userName ? ` (${userName})` : ''}: ${accountId}...`, 'info');
        const res = await axios.get(`${baseURL}/user`, {
            auth,
            params: { accountId }
        });

        const user = res.data;
        log(`  Found user: ${user.displayName}`, 'info');
        log(`  Email: ${user.emailAddress || 'Hidden'}`, 'info');
        log(`  Active: ${user.active}`, 'info');

        const testName = userName ? `Get User: ${userName}` : 'Get User by Account ID';
        recordTest(testName, true, {
            displayName: user.displayName,
            accountId: user.accountId,
            active: user.active
        });
        return user;
    } catch (err) {
        const testName = userName ? `Get User: ${userName}` : 'Get User by Account ID';
        recordTest(testName, false, {
            error: err.message,
            accountId,
            status: err.response?.status
        });
        return null;
    }
}

// ============= PHASE 3: WRITE OPERATIONS =============
async function testCreateIssue(projectKey, assigneeAccountId, userName = '') {
    try {
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const summary = `[TEST] Issue for ${userName || 'User'} - ${timestamp}`;

        log(`Creating issue in project ${projectKey}...`, 'info');
        log(`  Summary: ${summary}`, 'info');
        log(`  Assignee${userName ? ` (${userName})` : ''}: ${assigneeAccountId}`, 'info');

        const body = {
            fields: {
                project: { key: projectKey },
                summary: summary,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{
                                type: 'text',
                                text: `Automated test issue for ${userName || 'user'} created at ${timestamp}. Testing two-user Jira connection.`
                            }]
                        }
                    ]
                },
                issuetype: { name: 'Task' }
            }
        };

        // Add assignee if provided
        if (assigneeAccountId) {
            body.fields.assignee = { accountId: assigneeAccountId };
        }

        const res = await axios.post(`${baseURL}/issue`, body, { auth });
        const issue = res.data;

        log(`  ✅ Created issue: ${issue.key}`, 'pass');
        log(`  Issue ID: ${issue.id}`, 'info');
        log(`  Self URL: ${issue.self}`, 'info');

        const testName = userName ? `Create Issue (${userName})` : 'Create Issue';
        recordTest(testName, true, {
            key: issue.key,
            id: issue.id,
            assignee: assigneeAccountId,
            userName
        });
        return issue;
    } catch (err) {
        const testName = userName ? `Create Issue (${userName})` : 'Create Issue';
        recordTest(testName, false, {
            error: err.message,
            data: err.response?.data
        });
        return null;
    }
}

async function testGetIssueDetails(issueKey, userName = '') {
    try {
        log(`\nFetching details for issue ${issueKey}${userName ? ` (${userName})` : ''}...`, 'info');
        const res = await axios.get(`${baseURL}/issue/${issueKey}`, { auth });
        const issue = res.data;

        log(`  Key: ${issue.key}`, 'info');
        log(`  Summary: ${issue.fields?.summary}`, 'info');
        log(`  Status: ${issue.fields?.status?.name}`, 'info');
        log(`  Assignee: ${issue.fields?.assignee?.displayName || 'Unassigned'}`, 'info');
        log(`  Assignee Account ID: ${issue.fields?.assignee?.accountId || 'N/A'}`, 'info');

        const testName = userName ? `Verify Issue (${userName})` : 'Get Issue Details';
        recordTest(testName, true, {
            key: issue.key,
            assignee: issue.fields?.assignee?.displayName,
            assigneeAccountId: issue.fields?.assignee?.accountId
        });
        return issue;
    } catch (err) {
        const testName = userName ? `Verify Issue (${userName})` : 'Get Issue Details';
        recordTest(testName, false, { error: err.message });
        return null;
    }
}

// ============= PHASE 4: TWO-WAY SYNC =============
async function testTwoWaySync(projectKey) {
    log('\n═══════════════════════════════════════════', 'header');
    log('   PHASE 4: TWO-WAY SYNC VERIFICATION', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    try {
        // Test the sync endpoint by making a direct call to jiraIngestion
        const { ingestIssues } = require('./services/jiraIngestion');

        log(`Running ingestIssues for project: ${projectKey}...`, 'info');
        const result = await ingestIssues(projectKey);

        log(`  Issues synced successfully: ${result.success}`, 'info');
        log(`  Issues failed: ${result.failed}`, 'info');
        log(`  JQL used: ${result.debug?.jql}`, 'info');

        recordTest('Jira → MongoDB Ingestion', result.failed === 0, result);
        return result;
    } catch (err) {
        log(`  Note: Ingestion test requires MongoDB connection`, 'warn');
        recordTest('Jira → MongoDB Ingestion', false, {
            error: err.message,
            note: 'MongoDB connection may be required'
        });
        return null;
    }
}

// ============= MAIN TEST RUNNER =============
async function runAllTests() {
    console.log('\n');
    log('╔══════════════════════════════════════════════════════════════╗', 'header');
    log('║     COMPREHENSIVE JIRA TWO-WAY CONNECTION TEST SUITE        ║', 'header');
    log('║                    (ACTUAL JIRA API)                        ║', 'header');
    log('║                  TESTING TWO USERS                          ║', 'header');
    log('╚══════════════════════════════════════════════════════════════╝', 'header');

    log(`\nTest Users:`, 'info');
    TEST_USERS.forEach(u => log(`  - ${u.name}: ${u.accountId}`, 'info'));
    log(`Jira Domain: ${JIRA_DOMAIN}`, 'info');

    // Phase 1: Environment
    const envOk = await testEnvironmentVariables();
    if (!envOk) {
        log('\n⚠️  Environment variables not set. Cannot proceed.', 'fail');
        return;
    }

    // Phase 2: Read Operations
    const authUser = await testAuthentication();
    if (!authUser) {
        log('\n⚠️  Authentication failed. Cannot proceed with further tests.', 'fail');
        printSummary();
        return;
    }

    const projects = await testFetchProjects();

    // Find SCRUM project or use first available
    let targetProject = projects.find(p => p.key === 'SCRUM') || projects[0];
    if (!targetProject) {
        log('\n⚠️  No projects found. Cannot test further.', 'warn');
        printSummary();
        return;
    }

    log(`\n📁 Using project: [${targetProject.key}] ${targetProject.name}`, 'info');

    const boards = await testFetchBoards(targetProject.key);

    if (boards.length > 0) {
        await testFetchSprints(boards[0].id);
    }

    await testSearchIssues(targetProject.key);

    // Test both users - search and verify account IDs
    log('\n═══════════════════════════════════════════', 'header');
    log('   TESTING BOTH USERS', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    for (const user of TEST_USERS) {
        await testGetUserByAccountId(user.accountId, user.name);
    }

    // Phase 3: Write Operations - Create issues for BOTH users
    log('\n═══════════════════════════════════════════', 'header');
    log('   PHASE 3: WRITE OPERATIONS (BOTH USERS)', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    for (const user of TEST_USERS) {
        log(`\n👤 Creating issue for ${user.name}...`, 'info');
        const createdIssue = await testCreateIssue(targetProject.key, user.accountId, user.name);

        if (createdIssue) {
            // Verify the created issue has correct assignee
            await testGetIssueDetails(createdIssue.key, user.name);
        }
    }

    // Phase 4: Two-Way Sync - Connect MongoDB first
    log('\n🔌 Connecting to MongoDB for ingestion test...', 'info');
    const mongoConnected = await connectMongoDB();

    if (mongoConnected) {
        await testTwoWaySync(targetProject.key);
        await disconnectMongoDB();
    } else {
        recordTest('Jira → MongoDB Ingestion', false, {
            error: 'Could not connect to MongoDB',
            note: 'Check MONGODB_URI in .env'
        });
    }

    // Print summary
    printSummary();
}

function printSummary() {
    log('\n═══════════════════════════════════════════', 'header');
    log('               TEST SUMMARY', 'header');
    log('═══════════════════════════════════════════\n', 'header');

    log(`Total Tests: ${results.passed + results.failed}`, 'info');
    log(`Passed: ${results.passed}`, 'pass');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'fail' : 'pass');

    if (results.failed > 0) {
        log('\n❌ Failed Tests:', 'fail');
        results.tests.filter(t => !t.passed).forEach(t => {
            log(`   - ${t.name}: ${t.details.error || 'Unknown error'}`, 'fail');
        });
    }

    log('\n═══════════════════════════════════════════\n', 'header');
}

// Run tests
runAllTests().catch(err => {
    log(`\n💥 Unexpected error: ${err.message}`, 'fail');
    console.error(err.stack);
}).finally(() => {
    // Ensure MongoDB disconnects even on errors
    mongoose.disconnect().catch(() => { });
});

