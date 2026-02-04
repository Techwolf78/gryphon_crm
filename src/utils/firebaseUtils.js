// Firebase utilities with rate limiting and connection handling
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Firebase free tier limit
let requestTimestamps = [];

// Connection status tracking
let isOnline = navigator.onLine;
let lastConnectionCheck = Date.now();
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

// Update online status
window.addEventListener('online', () => {
  isOnline = true;
  // console.log('Connection restored');
});

window.addEventListener('offline', () => {
  isOnline = false;
  // console.log('Connection lost');
});

// Check connection by attempting a lightweight Firebase operation
const checkConnection = async () => {
  if (!isOnline) return false;

  const now = Date.now();
  if (now - lastConnectionCheck < CONNECTION_CHECK_INTERVAL) {
    return isOnline;
  }

  try {
    // Try to get a single document from a lightweight collection
    const testQuery = collection(db, "ContractInvoices");
    await getDocs(testQuery.limit(1));
    lastConnectionCheck = now;
    isOnline = true;
    return true;
  } catch (error) {
    // console.warn('Connection check failed:', error);
    isOnline = false;
    return false;
  }
};

// Rate limiting function
const checkRateLimit = () => {
  const now = Date.now();

  // Remove timestamps outside the window
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );

  // Check if we're within limits
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestRequest = Math.min(...requestTimestamps);
    const waitTime = RATE_LIMIT_WINDOW - (now - oldestRequest);
    return { allowed: false, waitTime };
  }

  return { allowed: true };
};

// Record a request for rate limiting
const recordRequest = () => {
  requestTimestamps.push(Date.now());
};

// Enhanced Firebase query with rate limiting and retry logic
export const safeFirebaseQuery = async (
  queryFn,
  options = {}
) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    retryOnNetworkError = true,
    showConnectionError = true
  } = options;

  // Check connection first
  if (!(await checkConnection())) {
    if (showConnectionError) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    throw new Error('OFFLINE');
  }

  // Check rate limit
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(rateLimitCheck.waitTime / 1000)} seconds before trying again.`);
  }

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Record the request
      recordRequest();

      // Execute the query
      const result = await queryFn();

      // Reset connection status on success
      isOnline = true;
      return result;

    } catch (error) {
      lastError = error;
      // console.error(`Firebase query attempt ${attempt + 1} failed:`, error);

      // Don't retry on the last attempt
      if (attempt === maxRetries) break;

      // Check if error is retryable
      const isRetryable = error.code === 'unavailable' ||
                         error.code === 'deadline-exceeded' ||
                         error.code === 'resource-exhausted' ||
                         error.code === 'cancelled' ||
                         (retryOnNetworkError && (
                           error.message?.includes('network') ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('connection')
                         ));

      if (!isRetryable) break;

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      // console.log(`Retrying Firebase query in ${Math.round(delay)}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw lastError;
};

// Get connection status
export const getConnectionStatus = () => ({
  isOnline,
  lastCheck: lastConnectionCheck
});

// Force connection check
export const forceConnectionCheck = checkConnection;