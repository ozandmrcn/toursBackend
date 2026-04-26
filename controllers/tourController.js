/**
 * ALL REQUEST HANDLERS FOR TOURS
 */
const Tour = require("../models/tourModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/error");
const factory = require("./handlerFactory");

/**
 * GET TOUR STATISTICS
 * Calculates aggregation stats for tours (avg ratings, prices, etc.) grouped by difficulty.
 * Uses MongoDB Aggregation Pipeline ($match, $group, $sort).
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      // 1) Filter: Only tours with ratings >= 4.0
      $match: { ratingsAverage: { $gte: 4.0 } },
    },
    {
      // 2) Group: Group by difficulty and calculate metrics
      // _id is the field we want to group by
      $group: {
        _id: { $toUpper: "$difficulty" },
        numTours: { $sum: 1 },
        numRatings: { $sum: "$ratingsQuantity" },
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    {
      // 3) Sort: Ascending by average price (1 for ASC, -1 for DESC)
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "Tour stats fetched successfully",
    results: stats.length,
    stats,
  });
});

/**
 * GET MONTHLY PLAN
 * Calculates how many tours start in each month for a given year.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = Number(req.params.year);

  const stats = await Tour.aggregate([
    {
      // 1) Unwind: Flatten the startDates array to process each date individually
      $unwind: "$startDates",
    },
    {
      // 2) Filter: Only include tours in the requested year
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      // 3) Group: Group by month number using the $month operator
      $group: {
        _id: { $month: "$startDates" },
        count: { $sum: 1 },
        tours: { $push: "$name" },
      },
    },
    {
      // 4) Add Fields: Map the group ID to a 'month' field for better readability
      $addFields: {
        month: "$_id",
      },
    },
    {
      // 5) Project: Remove the default _id field (set to 0)
      $project: {
        _id: 0,
      },
    },
    {
      // 6) Sort: Sort by month number (Jan to Dec)
      $sort: { month: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    message: `Monthly plan fetched successfully for ${year}`,
    results: stats.length,
    stats,
  });
});

/**
 * ALIAS MIDDLEWARE: TOP 5 CHEAP TOURS
 * Prefills query parameters for the getAllTours handler.
 */
exports.aliasTopTours = (req, res, next) => {
  req.query = {
    limit: "5",
    sort: "-ratingsAverage,price",
    fields: "name,price,ratingsAverage,summary,difficulty",
  };
  next();
};

/**
 * GET ALL TOURS
 * Fetches all tours with support for advanced filtering, sorting, projection, and pagination.
 */
exports.getAllTours = factory.getAll(Tour);

/**
 * GET SINGLE TOUR
 */
exports.getTour = factory.getOne(Tour, { path: "reviews" });

/**
 * CREATE TOUR
 */
exports.createTour = factory.createOne(Tour);

/**
 * UPDATE TOUR
 */
exports.updateTour = factory.updateOne(Tour);

/**
 * DELETE TOUR
 */
exports.deleteTour = factory.deleteOne(Tour);

/**
 * GET TOURS WITHIN RADIUS
 * Finds tours within a specific distance from a point.
 * Uses GeoJSON and $geoWithin MongoDB operator.
 */
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng) {
    return next(
      new AppError("Please provide latitude and longitude in the correct format (lat,lng).", 400),
    );
  }

  // Radius needs to be in radians. 
  // 3958.8 is the radius of Earth in miles, 6371 in kilometers.
  const radius = unit === "mi" ? distance / 3958.8 : distance / 6371;

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    success: true,
    results: tours.length,
    data: tours,
  });
});

/**
 * GET DISTANCES
 * Calculates the distance to all tours from a specific point.
 * Uses $geoNear aggregation stage.
 */
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  if (!lat || !lng) {
    return next(
      new AppError("Please provide latitude and longitude in the correct format (lat,lng).", 400),
    );
  }

  // 1 meter to miles or kilometers
  const multiplier = unit === "mi" ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      // $geoNear must always be the FIRST stage in the pipeline
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "Distances calculated successfully",
    results: distances.length,
    data: distances,
  });
});
