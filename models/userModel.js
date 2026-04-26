/**
 * USER DATA MODEL
 * Defines the schema, validation, and security methods for users.
 */
const { Schema, model } = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide your email!"],
    unique: [true, "The email is already taken. Please use another email!"],
    lowercase: true, // Stores email in lowercase to prevent duplicates
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  photo: {
    type: String,
    default: "defaultpic.webp",
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minLength: 8,
    select: false, // Prevents password from being returned in queries by default
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    // Custom validation: check if passwordConfirm matches password
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  passChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // Hidden from results
  },
});

/**
 * ------------------------------------------------------------------
 * DOCUMENT MIDDLEWARE (PRE-SAVE HOOKS)
 * ------------------------------------------------------------------
 */
// 1) Hash password before saving
userSchema.pre("save", async function () {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return;

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field (not needed in DB)
  this.passwordConfirm = undefined;
});

// 2) Update passChangedAt property before saving
userSchema.pre("save", function () {
  if (!this.isModified("password") || this.isNew) return;

  // Subtract 1 second to ensure token is always issued after password change
  this.passChangedAt = Date.now() - 1000;
});

/**
 * ------------------------------------------------------------------
 * QUERY MIDDLEWARE (PRE-FIND HOOKS)
 * ------------------------------------------------------------------
 */
// Automatically filter out inactive users from all 'find' queries
// EXCEPT when we explicitly want to include them (using skipActiveFilter option)
userSchema.pre(/^find/, function () {
  if (this.getOptions().skipActiveFilter) return;
  this.find({ active: { $ne: false } });
});

/**
 * ------------------------------------------------------------------
 * INSTANCE METHODS
 * ------------------------------------------------------------------
 */
/**
 * Verifies if candidate password matches stored hashed password.
 * @param {string} candidatePassword - Plain text password from user.
 * @param {string} userPassword - Hashed password from DB.
 * @returns {Promise<boolean>}
 */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * Generates a temporary reset token and stores the hashed version in DB.
 * @returns {string} Plain text reset token.
 */
userSchema.methods.createResetToken = function () {
  // Generate random bytes
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash and store in database
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expiration (15 minutes)
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

const User = model("User", userSchema);

module.exports = User;
