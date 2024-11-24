const { Pool } = require('pg');

/**
 * Maps PostgreSQL error codes to user-friendly messages
 */
const PG_ERROR_MESSAGES = {
  '23505': 'Duplicate entry already exists',
  '23503': 'Referenced record does not exist',
  '23502': 'Required field is missing',
  '42P01': 'Table not found',
  '42703': 'Column not found',
  '57014': 'Query cancelled due to timeout',
  '53300': 'Too many connections',
  '53400': 'Configuration limit exceeded',
  '42P04': 'Duplicate database',
  '42P07': 'Duplicate table',
  '08006': 'Database connection failed',
  '08001': 'Unable to establish database connection',
  '25P02': 'Transaction is aborted',
  '40001': 'Deadlock detected',
  '40P01': 'Deadlock detected',
  '22P02': 'Invalid text representation',
  '22003': 'Numeric value out of range'
};

const errorHandler = (err, req, res, next) => {
  // Log error with memory usage and PostgreSQL specific details
  console.error('Error:', {
    message: err.message,
    code: err.code,
    schema: err.schema,
    table: err.table,
    column: err.column,
    constraint: err.constraint,
    detail: err.detail,
    hint: err.hint,
    position: err.position,
    internalPosition: err.internalPosition,
    internalQuery: err.internalQuery,
    where: err.where,
    file: err.file,
    line: err.line,
    routine: err.routine,
    stack: err.stack,
    memoryUsage: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString()
  });

  // Handle PostgreSQL specific errors
  if (err.code && typeof err.code === 'string' && err.code.length === 5) {
    const statusCode = err.code.startsWith('23') ? 400 : 500; // 23xxx are constraint violations
    const message = err.message || 'Database error';
    
    return res.status(statusCode).json({
      error: {
        message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && {
          detail: err.detail,
          hint: err.hint,
          where: err.where
        })
      }
    });
  }

  // Handle query timeout errors
  if (err.message && err.message.includes('timeout')) {
    return res.status(504).json({
      error: {
        message: 'Query timed out',
        ...(process.env.NODE_ENV === 'development' && {
          detail: err.message
        })
      }
    });
  }

  // Handle connection errors
  if (err.message && err.message.includes('connection')) {
    return res.status(503).json({
      error: {
        message: 'Database connection error',
        ...(process.env.NODE_ENV === 'development' && {
          detail: err.message
        })
      }
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        memoryUsage: process.memoryUsage()
      })
    }
  });
};

module.exports = errorHandler;