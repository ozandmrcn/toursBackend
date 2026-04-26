const AppError = require("../utils/error");

/**
 * DATABASE ERROR HANDLERS
 * These functions convert low-level Mongoose/MongoDB errors into user-friendly AppError instances.
 */

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Check if it is the review duplicate error (tour + user)
  if (err.message.includes("tour_1_user_1")) {
    return new AppError(
      "You have already reviewed this tour! Each user can only leave one review per tour.",
      400,
    );
  }

  // Generic duplicate field handling
  const value = err.message.match(/(["'])(\\?.)*?\1/);
  const message = `Duplicate field value: ${value ? value[0] : "entry"}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

/**
 * RESPONSE FORMATTERS
 * Differentiate between Development (detailed) and Production (clean) error messages.
 */

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

/**
 * GLOBAL ERROR HANDLING MIDDLEWARE
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  let error = { ...err, message: err.message };

  if (err.name === "CastError") error = handleCastErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === "ValidationError") error = handleValidationErrorDB(error);

  // If error is operational, send clean response even in development
  if (process.env.NODE_ENV === "production" || error.isOperational) {
    sendErrorProd(error, res);
  } else {
    // For non-operational errors (bugs), send detailed response in development
    sendErrorDev(error, res);
  }
};
