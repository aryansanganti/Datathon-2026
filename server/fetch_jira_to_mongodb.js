/**
 * Jira Two-Way Connection - Fetch and Push to MongoDB
 * 
 * This script fetches ALL users and their tickets from actual Jira API
 * and stores them in MongoDB collection: jira_all_data_Datathon
 * 
 * NO MOCKS - Uses actual Jira API
 * 
 * Run: node fetch_jira_to_mongodb.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');
const mongoose = require('mongoose');

// ============= CONFIGURATION =============
const REQUIRED_ENV_VARS = ['JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_DOMAIN', 'MONGODB_URI'];

const JIRA_DOMAIN = process.env.JIRA_DOMAIN ||
    (process.env.JIRA_BASE_URL ? process.env.JIRA_BASE_URL.replace('https://', '').replace(/\/$/, '') : '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';

const auth = {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN,
};

const baseURL = `https://${JIRA_DOMAIN}/rest/api/3`;

// ============= UTILITIES =============
const colors = {
    info: '\x1b[36m',    // Cyan
    pass: '\x1b[32m',    // Green
    fail: '\x1b[31m',    // Red
    warn: '\x1b[33m',    // Yellow
    header: '\x1b[35m',  // Magenta
    reset: '\x1b[0m'
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function logHeader(message) {
    console.log('\n' + colors.header + '═'.repeat(60) + colors.reset);
    console.log(colors.header + '   ' + message + colors.reset);
    console.log(colors.header + '═'.repeat(60) + colors.reset + '\n');
}

// ============= PHASE 1: ENVIRONMENT VERIFICATION =============
function checkEnvironmentVariables() {
    logHeader('PHASE 1: ENVIRONMENT VERIFICATION');

    // Check if .env file exists
    const envPath = path.resolve(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        log('❌ .env file NOT found!', 'fail');
        log('Please create a .env file in the server directory', 'fail');
        log('You can copy .env.example and fill in your actual credentials', 'warn');
        return false;
    }
    log('✅ .env file found', 'pass');

    // Check all required environment variables
    let allSet = true;
    for (const varName of REQUIRED_ENV_VARS) {
        let value;
        if (varName === 'JIRA_DOMAIN') {
            value = JIRA_DOMAIN;
        } else {
            value = process.env[varName];
        }

        if (value) {
            const displayValue = varName.includes('TOKEN') || varName.includes('URI')
                ? value.substring(0, 12) + '...'
                : value;
            log(`  ${varName}: ${displayValue}`, 'info');
        } else {
            log(`  ${varName}: NOT SET`, 'fail');
            allSet = false;
        }
    }

    if (!allSet) {
        log('\n❌ Some required environment variables are missing!', 'fail');
        return false;
    }

    log('\n✅ All environment variables are set', 'pass');
    return true;
}

async function testJiraAuthentication() {
    try {
        log('\nTesting Jira authentication...', 'info');
        const res = await axios.get(`${baseURL}/myself`, { auth });
        const user = res.data;

        log(`✅ Authenticated as: ${user.displayName}`, 'pass');
        log(`   Email: ${user.emailAddress}`, 'info');
        log(`   Account ID: ${user.accountId}`, 'info');

        return user;
    } catch (err) {
        log(`❌ Jira authentication failed: ${err.message}`, 'fail');
        if (err.response) {
            log(`   Status: ${err.response.status}`, 'fail');
            log(`   Error: ${JSON.stringify(err.response.data)}`, 'fail');
        }
        return null;
    }
}

async function testMongoDBConnection() {
    try {
        log('\nTesting MongoDB connection...', 'info');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'mern-app'  // Explicitly specify database name
        });

        const dbName = mongoose.connection.db.databaseName;
        log(`✅ MongoDB connected successfully`, 'pass');
        log(`   Database: ${dbName}`, 'info');
        log(`   URI: ${MONGODB_URI.substring(0, 30)}...`, 'info');
        return true;
    } catch (err) {
        log(`❌ MongoDB connection failed: ${err.message}`, 'fail');
        return false;
    }
}

// ============= PHASE 2: FETCH DATA FROM JIRA =============
async function fetchAllProjects() {
    try {
        log('\nFetching all Jira projects...', 'info');
        const res = await axios.get(`${baseURL}/project`, { auth });
        const projects = Array.isArray(res.data) ? res.data : (res.data.values || []);

        log(`✅ Found ${projects.length} projects:`, 'pass');
        projects.forEach(p => log(`   - [${p.key}] ${p.name}`, 'info'));

        return projects;
    } catch (err) {
        log(`❌ Failed to fetch projects: ${err.message}`, 'fail');
        return [];
    }
}

async function fetchAllUsers() {
    try {
        log('\nFetching all Jira users...', 'info');

        // Fetch users using search endpoint with empty query to get all users
        const res = await axios.get(`${baseURL}/users/search`, {
            auth,
            params: { maxResults: 1000 }
        });

        const users = res.data || [];
        log(`✅ Found ${users.length} users`, 'pass');

        return users;
    } catch (err) {
        log(`❌ Failed to fetch users: ${err.message}`, 'fail');
        return [];
    }
}

async function fetchAllIssuesForProject(projectKey) {
    try {
        const jql = `project = ${projectKey} ORDER BY created DESC`;
        log(`\n  Fetching issues for project ${projectKey}...`, 'info');

        let allIssues = [];
        let nextPageToken = undefined;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore) {
            const payload = {
                jql,
                maxResults: 100,
                fields: ['key', 'summary', 'status', 'assignee', 'created', 'updated', 'priority', 'reporter']
            };

            if (nextPageToken) {
                payload.nextPageToken = nextPageToken;
            }

            const res = await axios.post(`${baseURL}/search/jql`, payload, { auth });
            const issues = res.data.issues || [];

            allIssues = allIssues.concat(issues);
            pageCount++;

            log(`    Page ${pageCount}: Fetched ${issues.length} issues (Total: ${allIssues.length})`, 'info');

            if (res.data.nextPageToken) {
                nextPageToken = res.data.nextPageToken;
            } else {
                hasMore = false;
            }

            // Safety check
            if (issues.length === 0 && !res.data.nextPageToken) {
                hasMore = false;
            }
        }

        log(`  ✅ Total issues fetched for ${projectKey}: ${allIssues.length}`, 'pass');
        return allIssues;
    } catch (err) {
        log(`  ❌ Failed to fetch issues for ${projectKey}: ${err.message}`, 'fail');
        return [];
    }
}

// ============= PHASE 3: TRANSFORM AND STORE DATA =============
async function storeDataInMongoDB(users, allIssues) {
    logHeader('PHASE 3: STORING DATA IN MONGODB');

    try {
        // Define schema for jira_all_data_Datathon collection
        const JiraDataSchema = new mongoose.Schema({
            user_id: { type: String, required: true, unique: true },
            name: { type: String },
            email: { type: String },
            timestamp: { type: Date, default: Date.now },
            tickets: [{
                ticket_id: { type: String },
                key: { type: String },
                summary: { type: String },
                status: { type: String },
                priority: { type: String },
                created: { type: Date },
                updated: { type: Date }
            }]
        }, { collection: 'jira_all_data_Datathon' });

        // Create or get model
        const JiraData = mongoose.models.JiraData || mongoose.model('JiraData', JiraDataSchema);

        log('Processing users and their tickets...', 'info');

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                // Find all tickets assigned to this user
                const userTickets = allIssues.filter(issue => {
                    return issue.fields?.assignee?.accountId === user.accountId;
                });

                // Transform tickets to our schema
                const tickets = userTickets.map(issue => ({
                    ticket_id: issue.id,
                    key: issue.key,
                    summary: issue.fields?.summary || '',
                    status: issue.fields?.status?.name || 'Unknown',
                    priority: issue.fields?.priority?.name || 'None',
                    created: issue.fields?.created ? new Date(issue.fields.created) : new Date(),
                    updated: issue.fields?.updated ? new Date(issue.fields.updated) : new Date()
                }));

                // Upsert user data with tickets
                await JiraData.findOneAndUpdate(
                    { user_id: user.accountId },
                    {
                        user_id: user.accountId,
                        name: user.displayName,
                        email: user.emailAddress || 'N/A',
                        timestamp: new Date(),
                        tickets: tickets
                    },
                    { upsert: true, new: true }
                );

                log(`  ✅ Stored user: ${user.displayName} (${tickets.length} tickets)`, 'pass');
                successCount++;

            } catch (err) {
                log(`  ❌ Failed to store user ${user.displayName}: ${err.message}`, 'fail');
                failCount++;
            }
        }

        log(`\n✅ Successfully stored ${successCount} users`, 'pass');
        if (failCount > 0) {
            log(`⚠️  Failed to store ${failCount} users`, 'warn');
        }

        return { successCount, failCount };

    } catch (err) {
        log(`❌ Error during MongoDB storage: ${err.message}`, 'fail');
        throw err;
    }
}

// ============= PHASE 4: VERIFICATION =============
async function verifyStoredData() {
    logHeader('PHASE 4: VERIFICATION');

    try {
        const JiraData = mongoose.models.JiraData;

        if (!JiraData) {
            log('⚠️  No data model found', 'warn');
            return;
        }

        const totalUsers = await JiraData.countDocuments();
        log(`✅ Total users in MongoDB: ${totalUsers}`, 'pass');

        // Get sample document
        const sampleDoc = await JiraData.findOne();
        if (sampleDoc) {
            log('\n📄 Sample document:', 'info');
            log(`   User: ${sampleDoc.name}`, 'info');
            log(`   Email: ${sampleDoc.email}`, 'info');
            log(`   Tickets: ${sampleDoc.tickets.length}`, 'info');
            if (sampleDoc.tickets.length > 0) {
                log(`   Sample ticket: ${sampleDoc.tickets[0].key} - ${sampleDoc.tickets[0].summary.substring(0, 40)}...`, 'info');
            }
        }

        // Get statistics
        const usersWithTickets = await JiraData.countDocuments({ 'tickets.0': { $exists: true } });
        const usersWithoutTickets = totalUsers - usersWithTickets;

        log(`\n📊 Statistics:`, 'info');
        log(`   Users with tickets: ${usersWithTickets}`, 'info');
        log(`   Users without tickets: ${usersWithoutTickets}`, 'info');

        // Calculate total tickets
        const allDocs = await JiraData.find();
        const totalTickets = allDocs.reduce((sum, doc) => sum + doc.tickets.length, 0);
        log(`   Total tickets: ${totalTickets}`, 'info');

    } catch (err) {
        log(`❌ Verification failed: ${err.message}`, 'fail');
    }
}

// ============= MAIN EXECUTION =============
async function main() {
    const startTime = Date.now();

    console.log('\n');
    logHeader('JIRA TWO-WAY CONNECTION - FETCH & PUSH TO MONGODB');
    log('Using ACTUAL Jira API (NO MOCKS)', 'info');
    log(`Target Collection: jira_all_data_Datathon`, 'info');

    try {
        // Phase 1: Environment Verification
        const envOk = checkEnvironmentVariables();
        if (!envOk) {
            log('\n❌ Environment check failed. Exiting.', 'fail');
            process.exit(1);
        }

        const authUser = await testJiraAuthentication();
        if (!authUser) {
            log('\n❌ Jira authentication failed. Exiting.', 'fail');
            process.exit(1);
        }

        const mongoOk = await testMongoDBConnection();
        if (!mongoOk) {
            log('\n❌ MongoDB connection failed. Exiting.', 'fail');
            process.exit(1);
        }

        // Phase 2: Fetch Data
        logHeader('PHASE 2: FETCHING DATA FROM JIRA');

        const projects = await fetchAllProjects();
        if (projects.length === 0) {
            log('⚠️  No projects found. Exiting.', 'warn');
            await mongoose.disconnect();
            process.exit(0);
        }

        const users = await fetchAllUsers();
        if (users.length === 0) {
            log('⚠️  No users found. Exiting.', 'warn');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Fetch all issues from all projects
        log('\nFetching issues from all projects...', 'info');
        let allIssues = [];
        for (const project of projects) {
            const issues = await fetchAllIssuesForProject(project.key);
            allIssues = allIssues.concat(issues);
        }

        log(`\n✅ Total issues fetched across all projects: ${allIssues.length}`, 'pass');

        // Phase 3: Store Data
        await storeDataInMongoDB(users, allIssues);

        // Phase 4: Verification
        await verifyStoredData();

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logHeader('EXECUTION SUMMARY');
        log(`✅ Script completed successfully in ${duration} seconds`, 'pass');
        log(`   Users processed: ${users.length}`, 'info');
        log(`   Issues processed: ${allIssues.length}`, 'info');
        log(`   Collection: jira_all_data_Datathon`, 'info');

    } catch (err) {
        log(`\n💥 Unexpected error: ${err.message}`, 'fail');
        console.error(err.stack);
    } finally {
        // Disconnect from MongoDB
        await mongoose.disconnect();
        log('\n👋 MongoDB disconnected. Exiting.', 'info');
    }
}

// Run the script
main();
