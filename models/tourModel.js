/**
 * TOUR DATA MODEL
 * Defines the schema, validation, indexes, and middleware for the Tours collection.
 */
const { Schema, model } = require("mongoose");
const validator = require("validator");

const tourSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: [true, "The tour name is already taken. Please use another name!"],
      trim: true,
      maxLength: [40, "A tour name must have less or equal then 40 characters"],
      minLength: [10, "A tour name must have more or equal then 10 characters"],
      // Custom Validator: Only allow letters and spaces
      validate: {
        validator: function (val) {
          return validator.isAlpha(val.replace(/\s/g, ""));
        },
        message: "A tour name must only contain alphabetic characters",
      },
    },

    slug: String,

    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },

    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },

    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy, medium, or difficult",
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      // Set value to 1 decimal place
      set: (val) => Math.round(val * 10) / 10,
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },

    priceDiscount: {
      type: Number,
      // Custom Validator: Ensure discount is not higher than the actual price
      validate: {
        validator: function (val) {
          // 'this' only points to current doc on NEW document creation
          return val < this.price;
        },
        message: "Discount price ({VALUE}) should be below regular price",
      },
    },

    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a description"],
    },

    description: {
      type: String,
      trim: true,
    },

    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },

    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // Hide this field from API results by default
    },

    startDates: {
      type: [Date],
    },

    premium: {
      type: Boolean,
      default: false,
    },

    hour: Number,

    // GEOSPATIAL DATA (GEOJSON)
    startLocation: {
      type: { type: String, default: "Point", enum: ["Point"] },
      coordinates: [Number], // [longitude, latitude]
      address: String,
      description: String,
    },

    locations: [
      {
        type: { type: String, default: "Point", enum: ["Point"] },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],

    // DATA REFERENCES (POPULATION)
    guides: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    // Enable virtual properties when converting documents to JSON/Objects
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * ------------------------------------------------------------------
 * INDEXES (PERFORMANCE OPTIMIZATION)
 * ------------------------------------------------------------------
 */
// Compound index for frequent price and rating queries
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// Geospatial index for distance-based queries
tourSchema.index({ startLocation: "2dsphere" });

/**
 * ------------------------------------------------------------------
 * VIRTUAL PROPERTIES
 * (Calculated on the fly, not stored in the database)
 * ------------------------------------------------------------------
 */
// Calculate duration in weeks
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

// Virtual populate: Linking reviews to tours without storing IDs in tour docs
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

/**
 * ------------------------------------------------------------------
 * DOCUMENT MIDDLEWARE (PRE-SAVE HOOKS)
 * Runs before .save() and .create()
 * ------------------------------------------------------------------
 */
tourSchema.pre("save", function (next) {
  // Generate slug from name
  this.slug = this.name.toLowerCase().split(" ").join("-");

  // Calculate total hours from duration days
  if (this.duration) {
    this.hour = this.duration * 24;
  }
  next();
});

/**
 * ------------------------------------------------------------------
 * QUERY MIDDLEWARE (PRE-FIND HOOKS)
 * Runs before any 'find' query
 * ------------------------------------------------------------------
 */
tourSchema.pre(/^find/, function (next) {
  // Automatically filter out premium tours from standard queries (unless specified otherwise)
  this.find({ premium: { $ne: true } });
  
  // Measure query execution time
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  // Automatically populate guide information
  this.populate({
    path: "guides",
    select: "-password -passChangedAt -passwordResetToken -passwordResetExpires -passwordConfirm -__v",
  });
  next();
});

/**
 * ------------------------------------------------------------------
 * AGGREGATION MIDDLEWARE (PRE-AGGREGATE HOOKS)
 * ------------------------------------------------------------------
 */
tourSchema.pre("aggregate", function (next) {
  // Exclude premium tours from aggregation results (unless using $geoNear which must be first)
  const pipeline = this.pipeline();
  if (!(pipeline.length > 0 && pipeline[0].$geoNear)) {
    pipeline.unshift({ $match: { premium: { $ne: true } } });
  }
  next();
});

const Tour = model("Tour", tourSchema);

module.exports = Tour;
