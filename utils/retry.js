const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, options = {}) => {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry = () => {}
  } = options;

  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (attempt > retries) {
        throw error;
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);
      onRetry(error, attempt, waitTime);
      
      await sleep(waitTime);
    }
  }
};

const retryDatabaseOperation = async (operation, options = {}) => {
  return retry(operation, {
    retries: 3,
    delay: 500,
    backoff: 2,
    onRetry: (error, attempt, waitTime) => {
      console.log(`Database operation failed (attempt ${attempt}), retrying in ${waitTime}ms:`, error.message);
    },
    ...options
  });
};

module.exports = { retry, retryDatabaseOperation };