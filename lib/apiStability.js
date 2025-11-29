/**
 * API Stability Manager
 * Implements circuit breaker, request queuing, retry logic, and health monitoring
 * Based on Replika's production-grade stability patterns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Circuit Breaker State
const CIRCUIT_STATES = {
  CLOSED: 'closed',      // Normal operation
  OPEN: 'open',          // Failing, reject requests
  HALF_OPEN: 'half_open' // Testing if service recovered
};

// Circuit Breaker Configuration
const CIRCUIT_CONFIG = {
  failureThreshold: 5,        // Open circuit after 5 failures
  successThreshold: 2,        // Close circuit after 2 successes
  timeout: 60000,              // Try again after 60 seconds
  resetTimeout: 300000         // Reset circuit after 5 minutes
};

// Retry Configuration
const RETRY_CONFIG = {
  maxRetries: 2,                // Reduced from 3 to 2 for faster failure
  initialDelay: 500,            // Reduced from 1000ms to 500ms
  maxDelay: 2000,               // Reduced from 10000ms to 2000ms
  backoffMultiplier: 2
};

// Request Queue Configuration
const QUEUE_CONFIG = {
  maxQueueSize: 50,
  processInterval: 1000        // Process queue every second
};

class CircuitBreaker {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChangeTime = Date.now();
  }

  async execute(fn, ...args) {
    // Check if circuit should be reset
    if (this.state === CIRCUIT_STATES.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > CIRCUIT_CONFIG.resetTimeout) {
        console.log(`🔄 Circuit breaker resetting for ${this.serviceName}`);
        this.state = CIRCUIT_STATES.HALF_OPEN;
        this.failureCount = 0;
        this.successCount = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Service unavailable.`);
      }
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      // Check if this is a 404 error (all models failed) - don't count as failure
      const is404Error = error && (
        error.message.includes('All Gemini models failed') ||
        error.message.includes('404') ||
        error.message.includes('NOT_FOUND') ||
        (error.message.includes('Model') && error.message.includes('not available'))
      );
      
      if (!is404Error) {
        this.onFailure(error);
      }
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= CIRCUIT_CONFIG.successThreshold) {
        console.log(`✅ Circuit breaker CLOSED for ${this.serviceName}`);
        this.state = CIRCUIT_STATES.CLOSED;
        this.successCount = 0;
      }
    }
  }

  onFailure(error) {
    // Don't count 404 errors (model not found) as failures - they're expected when trying different models
    if (error && (
      error.message.includes('404') || 
      error.message.includes('NOT_FOUND') ||
      error.message.includes('not found') ||
      (error.message.includes('Model') && error.message.includes('not available'))
    )) {
      return; // Skip counting this as a failure - it's expected when trying different models
    }
    
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= CIRCUIT_CONFIG.failureThreshold) {
      console.log(`❌ Circuit breaker OPENED for ${this.serviceName}`);
      this.state = CIRCUIT_STATES.OPEN;
      this.successCount = 0;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.processInterval = null;
  }

  async enqueue(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= QUEUE_CONFIG.maxQueueSize) {
        reject(new Error('Request queue is full'));
        return;
      }

      this.queue.push({
        fn: requestFn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        
        try {
          const result = await item.fn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }

        // Small delay between requests to avoid overwhelming APIs (reduced for speed)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      this.processing = false;
    }
  }

  getQueueSize() {
    return this.queue.length;
  }

  clear() {
    this.queue = [];
  }
}

class RetryManager {
  static async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = RETRY_CONFIG.maxRetries,
      initialDelay = RETRY_CONFIG.initialDelay,
      maxDelay = RETRY_CONFIG.maxDelay,
      backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
      retryableErrors = [], // Empty array means retry on all errors
      shouldRetry = null // Optional custom retry function
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Use custom shouldRetry function if provided
        if (shouldRetry && typeof shouldRetry === 'function') {
          if (!shouldRetry(error)) {
            throw error; // Don't retry
          }
        } else if (retryableErrors.length > 0) {
          // Check if error is retryable
          const isRetryable = retryableErrors.some(retryableError => 
            error.message.includes(retryableError) || 
            error.status === retryableError ||
            error.code === retryableError
          );
          
          if (!isRetryable) {
            throw error; // Don't retry
          }
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }
}

class ModelCache {
  static CACHE_KEY = 'poco_model_cache';
  static CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  static async getWorkingModel(provider) {
    try {
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cacheData) return null;

      const cache = JSON.parse(cacheData);
      const providerCache = cache[provider];

      if (!providerCache) return null;

      // Check if cache is expired
      if (Date.now() - providerCache.timestamp > this.CACHE_EXPIRY) {
        return null;
      }

      return providerCache.model;
    } catch (error) {
      console.error('Error reading model cache:', error);
      return null;
    }
  }

  static async setWorkingModel(provider, model, version = null) {
    try {
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY) || '{}';
      const cache = JSON.parse(cacheData);

      cache[provider] = {
        model,
        version,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      console.log(`✅ Cached working model: ${provider} -> ${model}${version ? ` (${version})` : ''}`);
    } catch (error) {
      console.error('Error saving model cache:', error);
    }
  }

  static async clearCache() {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Error clearing model cache:', error);
    }
  }
}

class APIHealthMonitor {
  constructor() {
    this.metrics = {
      gemini: { requests: 0, failures: 0, successes: 0, avgResponseTime: 0 },
      openai: { requests: 0, failures: 0, successes: 0, avgResponseTime: 0 }
    };
    this.responseTimes = {
      gemini: [],
      openai: []
    };
  }

  recordRequest(provider, success, responseTime) {
    const metric = this.metrics[provider];
    if (!metric) return;

    metric.requests++;
    if (success) {
      metric.successes++;
    } else {
      metric.failures++;
    }

    // Track response times (keep last 100)
    this.responseTimes[provider].push(responseTime);
    if (this.responseTimes[provider].length > 100) {
      this.responseTimes[provider].shift();
    }

    // Calculate average response time
    const times = this.responseTimes[provider];
    metric.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  }

  getHealth(provider) {
    const metric = this.metrics[provider];
    if (!metric) return null;

    const successRate = metric.requests > 0 
      ? (metric.successes / metric.requests) * 100 
      : 100;

    return {
      provider,
      requests: metric.requests,
      successes: metric.successes,
      failures: metric.failures,
      successRate: successRate.toFixed(2),
      avgResponseTime: metric.avgResponseTime.toFixed(0)
    };
  }

  getAllHealth() {
    return {
      gemini: this.getHealth('gemini'),
      openai: this.getHealth('openai')
    };
  }

  reset() {
    this.metrics = {
      gemini: { requests: 0, failures: 0, successes: 0, avgResponseTime: 0 },
      openai: { requests: 0, failures: 0, successes: 0, avgResponseTime: 0 }
    };
    this.responseTimes = {
      gemini: [],
      openai: []
    };
  }
}

// Singleton instances
const circuitBreakers = {
  gemini: new CircuitBreaker('gemini'),
  openai: new CircuitBreaker('openai')
};

const requestQueue = new RequestQueue();
const healthMonitor = new APIHealthMonitor();

export {
  CircuitBreaker,
  RequestQueue,
  RetryManager,
  ModelCache,
  APIHealthMonitor,
  circuitBreakers,
  requestQueue,
  healthMonitor,
  CIRCUIT_STATES
};

