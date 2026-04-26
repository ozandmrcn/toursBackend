/**
 * MIDDLEWARE: FORMAT QUERY
 * Prepares the request query object for MongoDB processing.
 * 
 * Logic:
 * 1) Combines standard req.query with any req.queryAlias (from alias middlewares).
 * 2) Excludes non-filter fields (page, limit, sort, fields) from the MongoDB filter object.
 * 3) Converts URL operators (gte, gt, lte, lt, ne) into MongoDB syntax ($gte, $gt...).
 */
module.exports = (req, res, next) => {
  // 1) Initialize the query object by merging parameters and aliases
  const queryObj = { ...req.query, ...req.queryAlias };

  // 2) Filtering: Remove special API fields that shouldn't be part of the DB filter
  const excludedFields = ["page", "limit", "sort", "fields"];
  excludedFields.forEach((el) => delete queryObj[el]);

  // 3) Advanced Filtering: Convert comparison operators to MongoDB '$' format
  // Example: { price: { gte: '500' } } -> { price: { $gte: '500' } }
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(
    /\b(gte|gt|lte|lt|ne)\b/g,
    (match) => `$${match}`,
  );

  // 4) Attach the ready-to-use MongoDB filter to the request object
  req.mongoQuery = JSON.parse(queryStr);

  next();
};
