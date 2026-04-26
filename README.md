# toursBackend

Welcome to the **toursBackend** project! A high-performance, feature-rich, and robust RESTful API built with **Node.js**, **Express**, and **MongoDB**. This backend serves as the core engine for a tours management system, handling everything from user authentication to geospatial tour searches and automated review calculations.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Bullseye.png" alt="Bullseye" width="25" height="25" /> Project Overview

toursBackend enables developers and administrators to:

- **Manage Tours:** Full CRUD operations with advanced filtering, sorting, field limiting, and pagination.
- **Geospatial Searches:** Find tours within a specific radius of a location or calculate distances to tours from any point.
- **Advanced Authentication:** Secure login/signup system with JWT, password reset via email, and role-based access control (Admin, Lead-Guide, Guide, User).
- **Review System:** Integrated review and rating system with automatic average rating calculation for tours.
- **User Profiles:** Users can manage their profiles, upload avatars (processed with Sharp), and update account settings.
- **Security & Performance:** Protection against NoSQL injection, XSS, and HPP. Includes rate limiting and secure HTTP headers.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket" width="25" height="25" /> Features

- **Factory Pattern:** Clean and DRY controller logic using a generic `handlerFactory` for common CRUD operations.
- **Advanced Querying:** Powerful `APIFeatures` class for complex URL query string handling.
- **Image Processing:** Automated image resizing and conversion to high-performance **WebP** format using **Sharp**.
- **Email Integration:** Transactional emails for password resets using **Nodemailer**.
- **Data Aggregation:** Complex MongoDB aggregation pipelines for tour statistics and monthly scheduling plans.
- **Security First:** Implements **Helmet** for headers, **Express-Rate-Limit** for DoS protection, and custom data sanitization.

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" alt="Hammer and Wrench" width="25" height="25" /> Technologies Used

- **Node.js** (Runtime Environment)
- **Express.js** (Web Framework)
- **MongoDB & Mongoose** (Database & ODM)
- **JSON Web Token (JWT)** (Authentication)
- **Bcrypt.js** (Password Hashing)
- **Multer** (File Uploads)
- **Sharp** (Image Processing)
- **Nodemailer** (Email Service)
- **Validator.js** (Data Validation)

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Desktop%20Computer.png" alt="Desktop Computer" width="25" height="25" /> Demo

*Coming Soon...*

## Preview

*Screenshots and API documentation previews will be added here.*

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Desktop%20Computer.png" alt="Desktop Computer" width="25" height="25" /> Setup & Installation

To run the project locally, follow these steps:

```bash
# Clone the repository
git clone https://github.com/ozandmrcn/toursBackend.git

# Navigate to the project folder
cd toursBackend

# Install required dependencies
npm install

# Start the development server (using nodemon)
npm start
```

### ⚙️ Environment Variables (.env Setup)

Create a `.env` file in the root directory and define the following variables:

```env
# Database Configuration
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/TourDB

# Server Configuration
PORT=4000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=30d
JWT_COOKIE_EXPIRES_IN=30

# Email Service (e.g., Mailtrap for testing)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_mailtrap_user
EMAIL_PASSWORD=your_mailtrap_password
```

> ⚠️ **Note:** For image uploads to work, ensure the `public/img/users` directory exists in the root folder.

## 📧 Contact

For any questions or feedback, feel free to contact:  
**Ozan Demircan** – ozandmrcn47@gmail.com
