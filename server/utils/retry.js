/**
 * Retry with exponential backoff. For transient failures.
 * @param {Function} fn - async function to run (no args)
 * @param {{ maxAttempts?: number, baseMs?: number }} opts
 */
async function withRetry(fn, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 5;
  const baseMs = opts.baseMs ?? 1000;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;
      const delay = baseMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

module.exports = { withRetry };
