const { v4: uuidv4 } = require('uuid');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, data = null, requestId = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      requestId: requestId || 'system',
      ...(data && { data })
    };

    return JSON.stringify(logEntry);
  }

  info(message, data = null, requestId = null) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data, requestId));
    }
  }

  error(message, error = null, requestId = null) {
    if (this.shouldLog('error')) {
      let errorData = null;
      if (error) {
        if (error instanceof Error) {
          errorData = {
            name: error.name || 'Error',
            message: error.message || 'Unknown error',
            stack: error.stack
          };
        } else if (typeof error === 'object') {
          errorData = error;
        } else {
          errorData = { message: String(error) };
        }
      }
      console.error(this.formatMessage('error', message, errorData, requestId));
    }
  }

  debug(message, data = null, requestId = null) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data, requestId));
    }
  }

  warn(message, data = null, requestId = null) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data, requestId));
    }
  }

  // Log API request
  logRequest(req, res, next) {
    const requestId = req.requestId || uuidv4();
    req.requestId = requestId;
    const logger = this; // Store reference to logger instance
    
    this.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, requestId);

    // Log response when it's sent
    const originalSend = res.send;
    res.send = function(data) {
      logger.info('API Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: Date.now() - req._startTime
      }, requestId);
      
      originalSend.call(this, data);
    };

    req._startTime = Date.now();
    next();
  }

  // Log API error
  logError(error, req, res, next) {
    try {
      // Debug: Log what we're receiving
      console.log('logError called with:', {
        hasError: !!error,
        errorType: error ? typeof error : 'undefined',
        errorMessage: error?.message || 'no message',
        url: req?.url,
        method: req?.method
      });

      // Only handle actual errors
      if (!error) {
        console.log('No error, calling next()');
        return next();
      }
      
      const requestId = req?.requestId || 'unknown';
      
      // Handle different error formats
      let errorData = null;
      if (error instanceof Error) {
        errorData = {
          name: error.name || 'Error',
          message: error.message || 'Unknown error',
          stack: error.stack
        };
      } else if (typeof error === 'object') {
        errorData = error;
      } else {
        errorData = { message: String(error) };
      }
      
      this?.error('API Error', errorData, requestId);
      
      // Don't call next() if headers already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal Server Error',
          requestId 
        });
      }
    } catch (err) {
      console.error('Error in logError middleware:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
}

module.exports = new Logger(); 