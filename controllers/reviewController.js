const Review = require("../models/reviewModel.js");
const factory = require("./handlerFactory.js");

/**
 * NESTED ROUTE MIDDLEWARE
 * Sets the tour and user IDs on the request body for nested review creation.
 * This ensures that when a user creates a review via /tours/:tourId/reviews,
 * the review is correctly linked to that tour and the logged-in user.
 */
exports.setTourUserIds = (req, res, next) => {
  // Ensure req.body exists
  if (!req.body) req.body = {};

  // Allow nested routes: If tour or user is not in body, get them from URL/Auth
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

/**
 * REVIEW CRUD OPERATIONS
 * Using factory handlers to maintain DRY (Don't Repeat Yourself) principle.
 */
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
