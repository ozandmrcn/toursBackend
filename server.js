// Load environment variables from .env file into process.env
require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app.js");

/**
 * DATABASE CONNECTION
 * Connects to MongoDB using the URI provided in environment variables.
 */
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((err) => {
    console.log("MongoDB connection error: ", err);
  });

/**
 * START SERVER
 * Listens for incoming requests on the specified port.
 */
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}... 🚀`);
});
