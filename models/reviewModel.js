/**
 * REVIEW DATA MODEL
 * Handles user reviews for tours, including rating calculations.
 */
const { Schema, model } = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
      trim: true,
    },
    rating: {
      type: Number,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      required: [true, "Rating cannot be empty"],
    },
    // DATA REFERENCES
    tour: {
      type: Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"],
    },
    user: {
      type: Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
  },
  {
    // Automatically include createdAt and updatedAt fields
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * ------------------------------------------------------------------
 * INDEXES
 * ------------------------------------------------------------------
 */
// Prevent duplicate reviews: One user can only review a specific tour once
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

/**
 * ------------------------------------------------------------------
 * QUERY MIDDLEWARE (PRE-FIND HOOKS)
 * ------------------------------------------------------------------
 */
// NOTE: Modern Mongoose query hooks don't require 'next()' and can cause errors in Express 5 if provided.
reviewSchema.pre(/^find/, function () {
  // Populate user info (name and photo) for every review query
  this.populate({
    path: "user",
    select: "name photo",
  });
});

/**
 * ------------------------------------------------------------------
 * STATIC METHODS
 * Used to calculate average ratings for a tour.
 * ------------------------------------------------------------------
 */
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // Use aggregation to calculate stats
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  // Update the corresponding Tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // Default if no reviews left
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

/**
 * ------------------------------------------------------------------
 * DOCUMENT MIDDLEWARE (POST-SAVE HOOK)
 * ------------------------------------------------------------------
 */
reviewSchema.post("save", function () {
  // Calculate stats after a new review is saved
  this.constructor.calcAverageRatings(this.tour);
});

/**
 * ------------------------------------------------------------------
 * QUERY MIDDLEWARE (POST-UPDATE/DELETE HOOKS)
 * ------------------------------------------------------------------
 */
// Using post-middleware for findOneAnd... (Update/Delete)
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    // Recalculate stats after update or deletion
    await doc.constructor.calcAverageRatings(doc.tour);
  }
});

const Review = model("Review", reviewSchema);

module.exports = Review;
