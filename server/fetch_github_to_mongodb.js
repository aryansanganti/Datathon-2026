/**
 * GitHub Data Fetch - Fetch and Push to MongoDB
 * 
 * This script fetches ALL commits and contributor data from GitHub repository
 * and stores them in MongoDB collection: github_all_data_Datathon
 * 
 * Uses actual GitHub API with OAuth authentication
 * 
 * Run: node fetch_github_to_mongodb.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const axios = require('axios');
const mongoose = require('mongoose');
const OAuthCredential = require('./models/OAuthCredential');

// ============= CONFIGURATION =============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app';
const GITHUB_API = 'https://api.github.com';
const GITHUB_REPO = process.env.GITHUB_DEFAULT_REPO;

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
async function testMongoDBConnection() {
    try {
        log('Testing MongoDB connection...', 'info');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            dbName: 'mern-app'
        });

        const dbName = mongoose.connection.db.databaseName;
        log(`✅ MongoDB connected successfully`, 'pass');
        log(`   Database: ${dbName}`, 'info');
        return true;
    } catch (err) {
        log(`❌ MongoDB connection failed: ${err.message}`, 'fail');
        return false;
    }
}

async function getGitHubToken() {
    try {
        log('Fetching GitHub authentication token...', 'info');

        // Try OAuth token from database first
        const cred = await OAuthCredential.findOne({ source: 'github' });

        if (cred && cred.access_token) {
            log('✅ Using GitHub OAuth token from database', 'pass');
            return cred.access_token;
        }

        // Fallback to personal access token from environment
        const envToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

        if (envToken) {
            log('✅ Using GitHub personal access token from environment', 'pass');
            return envToken;
        }

        log('❌ No GitHub token found', 'fail');
        log('   Option 1: Connect GitHub via OAuth', 'warn');
        log('   Option 2: Set GITHUB_TOKEN in .env file', 'warn');
        log('   Get token from: https://github.com/settings/tokens', 'info');
        return null;
    } catch (err) {
        log(`❌ Failed to fetch GitHub token: ${err.message}`, 'fail');

        // Try environment variable as fallback even if database query fails
        const envToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        if (envToken) {
            log('✅ Using GitHub personal access token from environment', 'pass');
            return envToken;
        }

        return null;
    }
}

function normalizeRepo(repo) {
    if (!repo) return null;

    // Remove protocol and domain
    repo = repo.replace('https://github.com/', '').replace('http://github.com/', '');

    // Remove .git extension
    if (repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
    }

    return repo;
}

async function testGitHubAccess(token, repo) {
    try {
        log(`Testing GitHub API access for repo: ${repo}...`, 'info');

        const res = await axios.get(`${GITHUB_API}/repos/${repo}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            validateStatus: (s) => s === 200 || s === 404 || s === 403,
        });

        if (res.status === 404) {
            log('❌ Repository not found', 'fail');
            return false;
        }

        if (res.status === 403) {
            log('❌ Access forbidden - check token permissions', 'fail');
            return false;
        }

        log(`✅ Repository accessible: ${res.data.full_name}`, 'pass');
        log(`   Stars: ${res.data.stargazers_count}`, 'info');
        log(`   Forks: ${res.data.forks_count}`, 'info');

        return true;
    } catch (err) {
        log(`❌ GitHub API test failed: ${err.message}`, 'fail');
        return false;
    }
}

// ============= PHASE 2: FETCH COMMITS FROM GITHUB =============
async function fetchAllCommits(token, repo) {
    try {
        log('\nFetching all commits from repository...', 'info');

        let allCommits = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const url = `${GITHUB_API}/repos/${repo}/commits`;
            const params = { per_page: 100, page };

            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                params,
                validateStatus: (s) => s === 200 || s === 404 || s === 403,
            });

            if (res.status === 403) {
                const remaining = res.headers['x-ratelimit-remaining'];
                if (remaining === '0') {
                    log('⚠️  GitHub rate limit exceeded', 'warn');
                    break;
                }
            }

            if (res.status === 404) {
                log('⚠️  No commits found', 'warn');
                break;
            }

            const commits = res.data || [];
            allCommits = allCommits.concat(commits);

            log(`  Page ${page}: Fetched ${commits.length} commits (Total: ${allCommits.length})`, 'info');

            // Check for next page
            const link = res.headers.link;
            if (link && link.includes('rel="next"')) {
                page++;
            } else {
                hasMore = false;
            }

            // Safety check
            if (commits.length === 0) {
                hasMore = false;
            }
        }

        log(`\n✅ Total commits fetched: ${allCommits.length}`, 'pass');
        return allCommits;

    } catch (err) {
        log(`❌ Failed to fetch commits: ${err.message}`, 'fail');
        return [];
    }
}

async function fetchCommitDetails(token, repo, sha) {
    try {
        const res = await axios.get(`${GITHUB_API}/repos/${repo}/commits/${sha}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            validateStatus: (s) => s === 200 || s === 404,
        });

        if (res.status === 404) return null;
        return res.data;
    } catch (err) {
        return null;
    }
}

// ============= PHASE 3: PROCESS AND AGGREGATE DATA =============
async function processCommitsWithStats(token, repo, commits) {
    logHeader('PHASE 3: PROCESSING COMMITS WITH STATISTICS');

    log('Fetching detailed statistics for each commit...', 'info');
    log('This may take a while for large repositories...', 'warn');

    const detailedCommits = [];
    let processed = 0;

    for (const commit of commits) {
        try {
            const details = await fetchCommitDetails(token, repo, commit.sha);

            if (details && details.stats) {
                detailedCommits.push({
                    sha: commit.sha,
                    message: commit.commit.message,
                    author_name: commit.commit.author.name,
                    author_email: commit.commit.author.email,
                    committer_name: commit.commit.committer.name,
                    committer_email: commit.commit.committer.email,
                    date: new Date(commit.commit.author.date),
                    lines_added: details.stats.additions || 0,
                    lines_deleted: details.stats.deletions || 0,
                    files_changed: details.files ? details.files.length : 0
                });
            } else {
                // Fallback without stats
                detailedCommits.push({
                    sha: commit.sha,
                    message: commit.commit.message,
                    author_name: commit.commit.author.name,
                    author_email: commit.commit.author.email,
                    committer_name: commit.commit.committer.name,
                    committer_email: commit.commit.committer.email,
                    date: new Date(commit.commit.author.date),
                    lines_added: 0,
                    lines_deleted: 0,
                    files_changed: 0
                });
            }

            processed++;
            if (processed % 10 === 0) {
                log(`  Processed ${processed}/${commits.length} commits...`, 'info');
            }

        } catch (err) {
            log(`  ⚠️  Failed to fetch details for commit ${commit.sha.substring(0, 7)}`, 'warn');
        }
    }

    log(`\n✅ Processed ${detailedCommits.length} commits with statistics`, 'pass');
    return detailedCommits;
}

function aggregateByContributor(detailedCommits) {
    log('\nAggregating data by contributor...', 'info');

    const contributorMap = new Map();

    for (const commit of detailedCommits) {
        const key = commit.author_email; // Use email as unique identifier

        if (!contributorMap.has(key)) {
            contributorMap.set(key, {
                contributor_id: key,
                name: commit.author_name,
                email: commit.author_email,
                github_username: commit.author_name, // GitHub username if available
                total_commits: 0,
                total_lines_added: 0,
                total_lines_deleted: 0,
                total_lines_changed: 0,
                first_commit_date: commit.date,
                last_commit_date: commit.date,
                commits: []
            });
        }

        const contributor = contributorMap.get(key);

        // Update statistics
        contributor.total_commits++;
        contributor.total_lines_added += commit.lines_added;
        contributor.total_lines_deleted += commit.lines_deleted;
        contributor.total_lines_changed += (commit.lines_added + commit.lines_deleted);

        // Update date range
        if (commit.date < contributor.first_commit_date) {
            contributor.first_commit_date = commit.date;
        }
        if (commit.date > contributor.last_commit_date) {
            contributor.last_commit_date = commit.date;
        }

        // Add commit to contributor's list
        contributor.commits.push(commit);
    }

    const contributors = Array.from(contributorMap.values());
    log(`✅ Found ${contributors.length} unique contributors`, 'pass');

    return contributors;
}

// ============= PHASE 4: STORE IN MONGODB =============
async function storeDataInMongoDB(contributors) {
    logHeader('PHASE 4: STORING DATA IN MONGODB');

    try {
        // Define schema
        const GitHubDataSchema = new mongoose.Schema({
            contributor_id: { type: String, required: true, unique: true },
            name: { type: String },
            email: { type: String },
            github_username: { type: String },
            total_commits: { type: Number, default: 0 },
            total_lines_added: { type: Number, default: 0 },
            total_lines_deleted: { type: Number, default: 0 },
            total_lines_changed: { type: Number, default: 0 },
            first_commit_date: { type: Date },
            last_commit_date: { type: Date },
            timestamp: { type: Date, default: Date.now },
            commits: [{
                sha: { type: String },
                message: { type: String },
                author_name: { type: String },
                author_email: { type: String },
                committer_name: { type: String },
                committer_email: { type: String },
                date: { type: Date },
                lines_added: { type: Number },
                lines_deleted: { type: Number },
                files_changed: { type: Number }
            }]
        }, { collection: 'github_all_data_Datathon' });

        const GitHubData = mongoose.models.GitHubData || mongoose.model('GitHubData', GitHubDataSchema);

        log('Storing contributor data...', 'info');

        let successCount = 0;
        let failCount = 0;

        for (const contributor of contributors) {
            try {
                await GitHubData.findOneAndUpdate(
                    { contributor_id: contributor.contributor_id },
                    {
                        ...contributor,
                        timestamp: new Date()
                    },
                    { upsert: true, new: true }
                );

                log(`  ✅ Stored: ${contributor.name} (${contributor.total_commits} commits, +${contributor.total_lines_added}/-${contributor.total_lines_deleted} lines)`, 'pass');
                successCount++;

            } catch (err) {
                log(`  ❌ Failed to store ${contributor.name}: ${err.message}`, 'fail');
                failCount++;
            }
        }

        log(`\n✅ Successfully stored ${successCount} contributors`, 'pass');
        if (failCount > 0) {
            log(`⚠️  Failed to store ${failCount} contributors`, 'warn');
        }

        return { successCount, failCount };

    } catch (err) {
        log(`❌ Error during MongoDB storage: ${err.message}`, 'fail');
        throw err;
    }
}

// ============= PHASE 5: VERIFICATION =============
async function verifyStoredData() {
    logHeader('PHASE 5: VERIFICATION');

    try {
        const GitHubData = mongoose.models.GitHubData;

        if (!GitHubData) {
            log('⚠️  No data model found', 'warn');
            return;
        }

        const totalContributors = await GitHubData.countDocuments();
        log(`✅ Total contributors in MongoDB: ${totalContributors}`, 'pass');

        // Get top contributors
        const topContributors = await GitHubData.find()
            .sort({ total_commits: -1 })
            .limit(5);

        if (topContributors.length > 0) {
            log('\n📊 Top 5 Contributors:', 'info');
            topContributors.forEach((contributor, idx) => {
                log(`   ${idx + 1}. ${contributor.name}`, 'info');
                log(`      Commits: ${contributor.total_commits}`, 'info');
                log(`      Lines Added: ${contributor.total_lines_added}`, 'info');
                log(`      Lines Deleted: ${contributor.total_lines_deleted}`, 'info');
                log(`      Total Lines Changed: ${contributor.total_lines_changed}`, 'info');
            });
        }

        // Calculate totals
        const allDocs = await GitHubData.find();
        const totalCommits = allDocs.reduce((sum, doc) => sum + doc.total_commits, 0);
        const totalLinesAdded = allDocs.reduce((sum, doc) => sum + doc.total_lines_added, 0);
        const totalLinesDeleted = allDocs.reduce((sum, doc) => sum + doc.total_lines_deleted, 0);

        log(`\n📈 Overall Statistics:`, 'info');
        log(`   Total Contributors: ${totalContributors}`, 'info');
        log(`   Total Commits: ${totalCommits}`, 'info');
        log(`   Total Lines Added: ${totalLinesAdded}`, 'info');
        log(`   Total Lines Deleted: ${totalLinesDeleted}`, 'info');
        log(`   Total Lines Changed: ${totalLinesAdded + totalLinesDeleted}`, 'info');

    } catch (err) {
        log(`❌ Verification failed: ${err.message}`, 'fail');
    }
}

// ============= MAIN EXECUTION =============
async function main() {
    const startTime = Date.now();

    console.log('\n');
    logHeader('GITHUB DATA FETCH - FETCH & PUSH TO MONGODB');
    log('Using GitHub API with OAuth authentication', 'info');
    log(`Repository: ${GITHUB_REPO}`, 'info');
    log(`Target Collection: github_all_data_Datathon`, 'info');

    try {
        // Phase 1: Environment Verification
        logHeader('PHASE 1: ENVIRONMENT VERIFICATION');

        const mongoOk = await testMongoDBConnection();
        if (!mongoOk) {
            log('\n❌ MongoDB connection failed. Exiting.', 'fail');
            process.exit(1);
        }

        const token = await getGitHubToken();
        if (!token) {
            log('\n❌ GitHub token not available. Exiting.', 'fail');
            process.exit(1);
        }

        const repo = normalizeRepo(GITHUB_REPO);
        if (!repo) {
            log('\n❌ Invalid repository configuration. Exiting.', 'fail');
            process.exit(1);
        }

        const accessOk = await testGitHubAccess(token, repo);
        if (!accessOk) {
            log('\n❌ GitHub repository access failed. Exiting.', 'fail');
            process.exit(1);
        }

        // Phase 2: Fetch Commits
        logHeader('PHASE 2: FETCHING COMMITS FROM GITHUB');

        const commits = await fetchAllCommits(token, repo);
        if (commits.length === 0) {
            log('⚠️  No commits found. Exiting.', 'warn');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Phase 3: Process with Statistics
        const detailedCommits = await processCommitsWithStats(token, repo, commits);
        const contributors = aggregateByContributor(detailedCommits);

        // Phase 4: Store Data
        await storeDataInMongoDB(contributors);

        // Phase 5: Verification
        await verifyStoredData();

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logHeader('EXECUTION SUMMARY');
        log(`✅ Script completed successfully in ${duration} seconds`, 'pass');
        log(`   Repository: ${repo}`, 'info');
        log(`   Commits processed: ${commits.length}`, 'info');
        log(`   Contributors: ${contributors.length}`, 'info');
        log(`   Collection: github_all_data_Datathon`, 'info');

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
