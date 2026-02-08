/**
 * Simple circuit breaker: after failureThreshold consecutive failures, open for cooldownMs.
 */
function createCircuitBreaker(opts = {}) {
  const failureThreshold = opts.failureThreshold ?? 5;
  const cooldownMs = opts.cooldownMs ?? 60000;
  let failures = 0;
  let lastFailureTime = null;
  let state = 'closed';

  return {
    async execute(fn) {
      if (state === 'open') {
        if (Date.now() - lastFailureTime < cooldownMs) {
          throw new Error('Circuit breaker is open');
        }
        state = 'half-open';
        failures = 0;
      }
      try {
        const result = await fn();
        if (state === 'half-open') state = 'closed';
        failures = 0;
        return result;
      } catch (err) {
        failures += 1;
        lastFailureTime = Date.now();
        if (failures >= failureThreshold) state = 'open';
        throw err;
      }
    },
    getState: () => state,
  };
}

module.exports = { createCircuitBreaker };
