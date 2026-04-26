const User = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const c = require("../utils/catchAsync.js");
const e = require("../utils/error.js");
const crypto = require("crypto");
const sendMail = require("../utils/sendMail.js");

/**
 * UTILITY: SIGN TOKEN
 * Creates a signed JWT token using the user ID and secret.
 * @param {string} user_id - MongoDB User ID.
 * @returns {string} Signed JWT.
 */
const signToken = (user_id) => {
  return jwt.sign({ id: user_id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * UTILITY: CREATE AND SEND TOKEN
 * Generates a token, attaches it to a cookie, and sends the final response.
 * @param {Object} user - User document.
 * @param {number} statusCode - HTTP status.
 * @param {Object} res - Express response object.
 * @param {string} message - Custom success message.
 */
const createSendToken = (user, statusCode, res, message) => {
  const token = signToken(user._id);

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, // Prevents XSS attacks
  };

  // Secure cookie in production (HTTPS)
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output before sending response
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message: message || "Successfully processed!",
    token,
    user,
  });
};

/**
 * AUTH MIDDLEWARE: PROTECT
 * Verifies if the request contains a valid JWT token and grants access if authenticated.
 */
exports.protect = c(async (req, res, next) => {
  // 1) Extract token from Authorization header or Cookies
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // 2) Check if token exists
  if (!token) {
    return next(new e("You are not logged in. Please log in to get access.", 401));
  }

  // 3) Verify the token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const msg = error.name === "TokenExpiredError" ? "Your token has expired! Please login again." : "Invalid token. Please login again.";
    return next(new e(msg, 401));
  }

  // 4) Check if the user still exists in the database
  const activeUser = await User.findById(decoded.id).select("+active");
  if (!activeUser) {
    return next(new e("The user belonging to this token no longer exists.", 401));
  }

  // 5) Check if account is active
  if (!activeUser.active) {
    return next(new e("This account is currently deactivated.", 403));
  }

  // 6) Check if password was changed after the token was issued
  if (activeUser.passChangedAt && decoded.iat) {
    const changedTimestamp = parseInt(activeUser.passChangedAt.getTime() / 1000, 10);
    if (changedTimestamp > decoded.iat) {
      return next(new e("User recently changed password! Please log in again.", 401));
    }
  }

  // Grant access and store user info in request object
  req.user = activeUser;
  next();
});

/**
 * HANDLER: SIGN UP
 * Registers a new user and logs them in immediately.
 */
exports.signUp = c(async (req, res, next) => {
  // 1) Create new user document
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 2) Generate token and send response
  createSendToken(newUser, 201, res, "Account created successfully!");
});

/**
 * HANDLER: LOGIN
 * Validates credentials and provides a JWT token.
 */
exports.login = c(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Validation: Check if email and password are provided
  if (!email || !password) {
    return next(new e("Please provide email and password!", 400));
  }

  // 2) Find user and explicitly include password and active fields (hidden by default in schema)
  const user = await User.findOne({ email }).select("+password +active");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new e("Incorrect email or password!", 401));
  }

  // 3) Check if account is active
  if (!user.active) {
    return next(new e("This account is not active!", 403));
  }

  // 4) If everything is OK, send token
  createSendToken(user, 200, res, "Logged in successfully!");
});

/**
 * AUTH MIDDLEWARE: RESTRICT TO
 * Limits access to specific user roles (e.g., 'admin', 'lead-guide').
 * @param {...string} roles - Allowed roles.
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new e("You do not have permission to perform this action!", 403));
    }
    next();
  };
};

/**
 * HANDLER: FORGOT PASSWORD
 * Initiates the password reset flow by sending a unique token via email.
 */
exports.forgotPassword = c(async (req, res, next) => {
  // 1) Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new e("There is no user with that email address.", 404));
  }

  // 2) Generate random reset token (using model instance method)
  const resetToken = user.createResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Prepare email content
  const resetURL = `${req.protocol}://${req.get("host")}/api/users/reset-password/${resetToken}`;
  
  try {
    await sendMail({
      email: user.email,
      subject: "Your password reset token (valid for 15 min)",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Please use the following token or click the link:</p>
        <p><b>Token:</b> ${resetToken}</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Reset token sent to email!",
    });
  } catch (err) {
    // Clean up database fields if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new e("There was an error sending the email. Try again later!", 500));
  }
});

/**
 * HANDLER: RESET PASSWORD
 * Resets user password based on a valid reset token.
 */
exports.resetPassword = c(async (req, res, next) => {
  // 1) Hash the token from the URL to compare it with the one in DB
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  // 2) Find user with valid token and check expiration
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new e("Token is invalid or has expired!", 400));
  }

  // 3) Update password and clear reset fields
  user.password = req.body.newPass;
  user.passwordConfirm = req.body.newPass;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // 4) Log the user in and send new token
  createSendToken(user, 200, res, "Password has been reset successfully!");
});

/**
 * HANDLER: UPDATE PASSWORD (LOGGED IN)
 * Allows authenticated users to change their password by providing the old one.
 */
exports.updatePassword = c(async (req, res, next) => {
  // 1) Get user from database (including password)
  const user = await User.findById(req.user.id).select("+password");

  // 2) Verify current password
  if (!(await bcrypt.compare(req.body.currentPass, user.password))) {
    return next(new e("Your current password is incorrect!", 401));
  }

  // 3) Update to new password
  user.password = req.body.newPass;
  user.passwordConfirm = req.body.newPass;
  await user.save();

  // 4) Log the user in and send new token
  createSendToken(user, 200, res, "Password updated successfully!");
});

/**
 * HANDLER: LOGOUT
 * Clears the authentication cookie.
 */
exports.logout = c(async (req, res, next) => {
  res.clearCookie("jwt");
  res.status(200).json({
    success: true,
    message: "Logged out successfully!",
  });
});
