// src/utils/circuitBreaker.js

/**
 * Circuit Breaker pattern implementation to prevent cascading failures
 * States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, resetTimeout = 120000) {
    this.failureThreshold = threshold;    // Number of failures before opening
    this.timeout = timeout;                // How long to wait before trying again
    this.resetTimeout = resetTimeout;      // How long to wait before fully resetting
    
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'CLOSED';                // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    this.consecutiveSuccesses = 0;
  }

  /**
   * Execute an operation through the circuit breaker
   * @param {Function} operation - Async function to execute
   * @returns {Promise} Result of the operation
   */
  async execute(operation) {
    // Check if circuit should be reset (time-based)
    this.checkReset();
    
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.round((this.nextAttempt - Date.now()) / 1000);
        throw new Error(`Circuit breaker is OPEN. Retry in ${waitTime} seconds.`);
      }
      // Enough time has passed, try half-open
      this.state = 'HALF_OPEN';
      console.log('Circuit breaker entering HALF_OPEN state');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.failureCount = 0;
    this.consecutiveSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      // Need multiple successes to fully close
      if (this.consecutiveSuccesses >= 3) {
        this.state = 'CLOSED';
        console.log('Circuit breaker is now CLOSED (recovered)');
      }
    }
    
    this.successCount++;
  }

  /**
   * Handle failed operation
   */
  onFailure() {
    this.failureCount++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    
    console.log(`Circuit breaker failure count: ${this.failureCount}/${this.failureThreshold}`);
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log(`Circuit breaker is now OPEN. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
    
    if (this.state === 'HALF_OPEN') {
      // Failed while testing, go back to OPEN
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log('Circuit breaker returned to OPEN state after HALF_OPEN failure');
    }
  }

  /**
   * Check if enough time has passed to reset the circuit
   */
  checkReset() {
    if (this.lastFailureTime && (Date.now() - this.lastFailureTime > this.resetTimeout)) {
      this.reset();
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.consecutiveSuccesses = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    console.log('Circuit breaker has been reset');
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      isOperational: this.state !== 'OPEN' || Date.now() >= this.nextAttempt
    };
  }

  /**
   * Check if circuit breaker is operational
   */
  isOperational() {
    return this.state !== 'OPEN' || Date.now() >= this.nextAttempt;
  }
}

/**
 * Distributed Circuit Breaker using KV storage
 * For use across multiple worker instances
 */
export class DistributedCircuitBreaker {
  constructor(env, key, threshold = 5, timeout = 60000) {
    this.env = env;
    this.key = `circuit_breaker:${key}`;
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute(operation) {
    const state = await this.getState();
    
    if (state.state === 'OPEN' && Date.now() < state.nextAttempt) {
      const waitTime = Math.round((state.nextAttempt - Date.now()) / 1000);
      throw new Error(`Circuit breaker is OPEN. Retry in ${waitTime} seconds.`);
    }
    
    try {
      const result = await operation();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure();
      throw error;
    }
  }

  async getState() {
    const data = await this.env.CIRCUIT_BREAKERS?.get(this.key);
    
    if (!data) {
      return {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        nextAttempt: 0
      };
    }
    
    return JSON.parse(data);
  }

  async setState(state) {
    await this.env.CIRCUIT_BREAKERS?.put(
      this.key,
      JSON.stringify(state),
      { expirationTtl: 300 } // 5 minutes TTL
    );
  }

  async recordSuccess() {
    const state = await this.getState();
    
    state.failureCount = 0;
    state.successCount++;
    
    if (state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
    }
    
    await this.setState(state);
  }

  async recordFailure() {
    const state = await this.getState();
    
    state.failureCount++;
    
    if (state.failureCount >= this.threshold) {
      state.state = 'OPEN';
      state.nextAttempt = Date.now() + this.timeout;
    }
    
    await this.setState(state);
  }
}