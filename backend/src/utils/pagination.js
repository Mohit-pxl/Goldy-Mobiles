/**
 * Pagination helper for Mongoose queries.
 * Extracts page/limit from query params and returns skip, limit, and a meta builder.
 *
 * @param {Object} query - Express req.query
 * @param {number} defaultLimit - Default page size
 * @returns {{ page: number, limit: number, skip: number, buildMeta: (total: number) => Object }}
 */
const paginate = (query, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  const buildMeta = (total) => ({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  });

  return { page, limit, skip, buildMeta };
};

module.exports = { paginate };
