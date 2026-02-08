/**
 * In-memory metrics for MVP. Ingestion service updates these; GET /api/metrics reads them.
 * Last sync times come from SyncState in DB.
 */
const metrics = {
  bySourceEntity: {}, // { 'github:commits': { success_count, fail_count, last_latency_ms } }
};

function recordIngestion(source, entity, success, latencyMs) {
  const key = `${source}:${entity}`;
  if (!metrics.bySourceEntity[key]) {
    metrics.bySourceEntity[key] = { success_count: 0, fail_count: 0, last_latency_ms: null };
  }
  const m = metrics.bySourceEntity[key];
  if (success) {
    m.success_count += 1;
    m.last_latency_ms = latencyMs;
  } else {
    m.fail_count += 1;
  }
}

function getMetrics() {
  return { ...metrics.bySourceEntity };
}

module.exports = { recordIngestion, getMetrics };
