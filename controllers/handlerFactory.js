const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("../utils/APIFeatures");
const AppError = require("../utils/error");

/**
 * GENERIC DELETE HANDLER
 * Factory function to create a delete handler for any given Mongoose Model.
 * 
 * @param {Model} Model - The Mongoose model to delete from.
 * @returns {Function} Express middleware function.
 */
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // 1) Attempt to find and delete the document by ID
    // skipActiveFilter: true allows us to find and delete even deactivated/hidden docs
    const doc = await Model.findByIdAndDelete(req.params.id).setOptions({
      skipActiveFilter: true,
    });

    // 2) If no document found, return a 404 error
    if (!doc) {
      return next(new AppError(`No ${Model.modelName} found with that ID!`, 404));
    }

    // 3) Send success response (204 No Content for deletion)
    res.status(204).json({
      success: true,
      message: `${Model.modelName} deleted successfully!`,
      data: null,
    });
  });

/**
 * GENERIC UPDATE HANDLER
 * Factory function to create an update handler for any given Mongoose Model.
 * 
 * @param {Model} Model - The Mongoose model to update.
 * @returns {Function} Express middleware function.
 */
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // 1) Find and update the document with the provided request body
    // { returnDocument: "after" } returns the updated doc
    // { runValidators: true } ensures schema validation rules are applied
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
      skipActiveFilter: true,
    });

    // 2) If no document found, return a 404 error
    if (!doc) {
      return next(new AppError(`No ${Model.modelName} found with that ID!`, 404));
    }

    // 3) Send success response with the updated document
    res.status(200).json({
      success: true,
      message: `${Model.modelName} updated successfully!`,
      data: doc,
    });
  });

/**
 * GENERIC GET ONE HANDLER
 * Factory function to fetch a single document by ID.
 * 
 * @param {Model} Model - The Mongoose model to query.
 * @param {Object} [populateOptions] - Optional Mongoose populate options (e.g., { path: "reviews" }).
 * @returns {Function} Express middleware function.
 */
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    // 1) Build the query: Find by ID and apply population if specified
    let query = Model.findById(req.params.id).setOptions({
      skipActiveFilter: true,
    });

    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    // 2) Execute query
    const doc = await query;

    // 3) Validate existence
    if (!doc) {
      return next(new AppError(`No ${Model.modelName} found with that ID!`, 404));
    }

    // 4) Send success response
    res.status(200).json({
      success: true,
      message: `${Model.modelName} fetched successfully!`,
      data: doc,
    });
  });

/**
 * GENERIC CREATE HANDLER
 * Factory function to create a new document for any given Mongoose Model.
 * 
 * @param {Model} Model - The Mongoose model to create in.
 * @returns {Function} Express middleware function.
 */
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const data = { ...req.body };

    // Default: If the model is a Review and no user is provided, link it to the current logged-in user
    if (Model.modelName === "Review" && data.user === undefined) {
      data.user = req.user.id;
    }

    // 1) Create a new document
    const doc = await Model.create(data);

    // 2) Send success response with the newly created document
    res.status(201).json({
      success: true,
      message: `${Model.modelName} created successfully!`,
      data: doc,
    });
  });

/**
 * GENERIC GET ALL HANDLER
 * Factory function to fetch all documents with advanced filtering, sorting, and pagination.
 * 
 * @param {Model} Model - The Mongoose model to query.
 * @returns {Function} Express middleware function.
 */
exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // 1) Handle nested GET requests (e.g., GET /tours/TOUR_ID/reviews)
    let filters = {};
    if (req.params.tourId) filters.tour = req.params.tourId;

    // 2) Build the query using the APIFeatures utility
    // req.mongoQuery comes from the formatQuery middleware (if used)
    const features = new APIFeatures(
      Model.find(filters),
      req.query,
      req.mongoQuery || {},
    )
      .filter()
      .limit()
      .sort()
      .pagination();

    // 3) Execute query
    const doc = await features.query;

    // 4) Send success response
    res.status(200).json({
      success: true,
      message: `All ${Model.modelName}s fetched successfully!`,
      results: doc.length,
      data: doc,
    });
  });
