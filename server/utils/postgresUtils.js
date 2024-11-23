/**
 * Utility functions for PostgreSQL-specific operations
 */

const format = require('pg-format');

/**
 * Creates a case-insensitive pattern matching expression
 * @param {string} column - Column name
 * @param {string} value - Search value
 * @returns {string} PostgreSQL ILIKE expression
 */
const createILikePattern = (column, value) => {
  return format('%I ILIKE $%L', column, `%${value}%`);
};

/**
 * Escapes special characters in LIKE/ILIKE patterns
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeLikePattern = (value) => {
  return value.replace(/[%_]/g, char => `\\${char}`);
};

/**
 * Creates an array parameter for WHERE IN clauses
 * @param {Array} values - Array of values
 * @returns {string} Formatted array string
 */
const createArrayParam = (values) => {
  return format('ARRAY[%L]', values);
};

/**
 * Handles interval creation for dates
 * @param {number} amount - Amount of time
 * @param {string} unit - Time unit
 * @returns {string} PostgreSQL interval expression
 */
const createInterval = (amount, unit) => {
  return format("INTERVAL '%s %s'", amount, unit);
};

/**
 * Creates a JSON/JSONB containment expression
 * @param {string} column - Column name
 * @param {object} value - Value to check containment
 * @returns {string} PostgreSQL containment expression
 */
const createJsonContains = (column, value) => {
  return format('%I @> %L::jsonb', column, JSON.stringify(value));
};

/**
 * Creates a full text search expression
 * @param {Array} columns - Columns to search
 * @param {string} searchTerm - Search term
 * @returns {string} PostgreSQL full text search expression
 */
const createFullTextSearch = (columns, searchTerm) => {
  const vectorExpression = columns.map(col => format('coalesce(%I::text, \'\')', col)).join(' || \' \' || ');
  return format('to_tsvector(\'english\', %s) @@ plainto_tsquery(\'english\', %L)', vectorExpression, searchTerm);
};

module.exports = {
  createILikePattern,
  escapeLikePattern,
  createArrayParam,
  createInterval,
  createJsonContains,
  createFullTextSearch
};