const Commit = require('../models/Commit');
const User = require('../models/User');
const SyncState = require('../models/SyncState');
const AuditLog = require('../models/AuditLog');
const { fetchCommits, fetchCommitDetails } = require('./githubClient');
const { withRetry } = require('../utils/retry');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { recordIngestion } = require('../utils/metricsStore');

const SOURCE = 'github';
const ENTITY = 'commits';
const circuit = createCircuitBreaker({ failureThreshold: 5, cooldownMs: 60000 });

function normalizeCommit(ghCommit, repoId) {
  const author = ghCommit.author || {};
  return {
    commit_id: ghCommit.sha,
    source: SOURCE,
    repo_id: repoId,
    branch: ghCommit.commit?.tree?.sha ? null : null, // list commits doesn't include branch; could be enriched later
    display_name: author.login || ghCommit.commit?.author?.name,
    email: ghCommit.commit?.author?.email,
    timestamp: ghCommit.commit?.author?.date ? new Date(ghCommit.commit.author.date) : new Date(),
    raw_signature: `${SOURCE}:${repoId}:${ghCommit.sha}`,
  };
}

async function ensureUser(source, sourceUserId, displayName, email) {
  const user_id = `${source}:${sourceUserId}`;
  let user = await User.findOne({ user_id });
  if (!user) {
    user = await User.create({
      user_id,
      source: 'GitHub',
      source_user_id: sourceUserId,
      display_name: displayName,
      email: email || undefined,
    });
  }
  return user._id;
}

async function runIngestion(repoId) {
  const start = Date.now();
  const syncState = await SyncState.findOne({ source: SOURCE, entity: ENTITY });
  const since = syncState?.last_sync_at ? syncState.last_sync_at.toISOString() : undefined;

  let totalSuccess = 0;
  let totalFail = 0;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data, nextPage } = await withRetry(
      () => circuit.execute(() => fetchCommits(repoId, { since, per_page: 100, page })),
      { maxAttempts: 5, baseMs: 1000 }
    );

    for (const gh of data) {
      try {
        const norm = normalizeCommit(gh, repoId);
        const existing = await Commit.findOne({ raw_signature: norm.raw_signature });
        if (existing) continue;

        const authorId = (gh.author && gh.author.login) || 'unknown';
        const authorRef = await ensureUser(
          'GitHub',
          authorId,
          norm.display_name,
          norm.email
        );

        // Fetch detailed stats (additions/deletions)
        let stats = { additions: 0, deletions: 0, total: 0 };
        try {
          const details = await fetchCommitDetails(repoId, norm.commit_id);
          if (details && details.stats) {
            stats = details.stats;
          }
        } catch (detailErr) {
          console.warn(`Failed to fetch details for ${norm.commit_id}:`, detailErr.message);
        }

        await Commit.create({
          commit_id: norm.commit_id,
          source: norm.source,
          repo_id: norm.repo_id,
          branch: norm.branch,
          author_id: authorRef,
          timestamp: norm.timestamp,
          raw_signature: norm.raw_signature,
          stats: stats,
        });
        totalSuccess += 1;
      } catch (err) {
        totalFail += 1;
        await AuditLog.create({
          source: SOURCE,
          entity: ENTITY,
          action: 'ingest',
          outcome: 'fail',
          payload_size: 0,
          timestamp: new Date(),
        });
      }
    }

    hasMore = !!nextPage;
    if (hasMore) page = nextPage;
  }

  const lastSyncAt = new Date();
  await SyncState.findOneAndUpdate(
    { source: SOURCE, entity: ENTITY },
    { last_sync_at: lastSyncAt, last_cursor: String(page) },
    { upsert: true }
  );

  const latencyMs = Date.now() - start;
  recordIngestion(SOURCE, ENTITY, true, latencyMs);
  if (totalFail > 0) recordIngestion(SOURCE, ENTITY, false);

  await AuditLog.create({
    source: SOURCE,
    entity: ENTITY,
    action: 'ingest',
    outcome: 'success',
    payload_size: totalSuccess,
    timestamp: lastSyncAt,
  });

  return { success: totalSuccess, failed: totalFail, latencyMs };
}

module.exports = { runIngestion };
