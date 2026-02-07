const Issue = require('../models/Issue');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const SyncState = require('../models/SyncState');
const AuditLog = require('../models/AuditLog');
const { searchIssues, fetchSprints } = require('./jiraClient');
const { recordIngestion } = require('../utils/metricsStore');

const SOURCE = 'jira';

async function ingestIssues(projectKey) {
    const start = Date.now();
    let totalSuccess = 0;
    let totalFail = 0;

    // Find last sync
    const syncState = await SyncState.findOne({ source: SOURCE, entity: 'issues' });
    let jql = `project = ${projectKey}`;
    if (syncState && syncState.last_sync_at) {
        const lastSync = syncState.last_sync_at.toISOString().split('T')[0]; // simple Query
        jql += ` AND updated >= "${lastSync}"`;
    }
    jql += ' ORDER BY updated ASC';

    let startAt = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const result = await searchIssues(jql, startAt);
            const issues = result.issues || [];

            for (const i of issues) {
                try {
                    // Resolve User
                    let assigneeId = undefined;
                    if (i.fields.assignee) {
                        const accountId = i.fields.assignee.accountId;
                        let user = await User.findOne({ source_user_id: accountId });
                        if (!user) {
                            user = await User.create({
                                user_id: `jira:${accountId}`,
                                source: 'Jira',
                                source_user_id: accountId,
                                display_name: i.fields.assignee.displayName,
                                email: i.fields.assignee.emailAddress // May be hidden depending on privacy
                            });
                        }
                        assigneeId = user._id;
                    }

                    // Extract sprint info if available (simplified)
                    // customfield_10020 is array of sprint objects in recent Jira versions
                    let sprintId = undefined;
                    // Logic to parse sprint field would go here

                    await Issue.findOneAndUpdate(
                        { issue_id: i.id },
                        {
                            key: i.key,
                            title: i.fields.summary,
                            status: i.fields.status.name,
                            priority: i.fields.priority?.name,
                            assignee_id: assigneeId,
                            created_at: new Date(i.fields.created),
                            updated_at: new Date(i.fields.updated),
                            project_id: projectKey
                        },
                        { upsert: true }
                    );
                    totalSuccess++;
                } catch (err) {
                    console.error(`Failed to ingest issue ${i.key}:`, err.message);
                    totalFail++;
                }
            }

            startAt += issues.length;
            if (startAt >= result.total) hasMore = false;

        } catch (e) {
            console.error('Ingestion Loop Failed:', e.message);
            hasMore = false;
        }
    }

    // Record stats
    await AuditLog.create({
        source: SOURCE,
        entity: 'issues',
        action: 'ingest',
        outcome: totalFail === 0 ? 'success' : 'partial_success',
        payload_size: totalSuccess,
        timestamp: new Date()
    });

    await SyncState.findOneAndUpdate(
        { source: SOURCE, entity: 'issues' },
        { last_sync_at: new Date() },
        { upsert: true }
    );

    return { success: totalSuccess, failed: totalFail };
}

module.exports = { ingestIssues };
