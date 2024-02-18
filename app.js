const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const multer = require("multer");

require("dotenv").config();

const app = express();
const port = 3000;
const USERADMIN = process.env.USERADMIN;
console.log(USERADMIN);

// Function to check if the data.json file exists
const checkDataFile = () => {
  const dataFilePath = "data.json";

  try {
    // Check if the file exists
    fs.accessSync(dataFilePath);
  } catch (error) {
    // If the file does not exist, create it with initial data
    const initialData = { users: ["user1@mail.com", "user2@mail.com"] };
    fs.writeFileSync(dataFilePath, JSON.stringify(initialData));
  }
};

// Check if data.json file exists and create if not
checkDataFile();

// Read user data from data.json
const rawData = fs.readFileSync("data.json");
const data = JSON.parse(rawData);
let users = data.users;

// Set up EJS, bodyParser, cookie-parser, and multer middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  const userEmail = req.cookies.userEmail;

  // Redirect to home if not authenticated
  if (!userEmail) {
    return res.redirect("/");
  }

  // Pass control to the next middleware or route handler
  next();
};

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Home route
app.get("/", (req, res) => {
  res.render("home", { error: null });
});

// Login route
app.post("/login", (req, res) => {
  const userEmail = req.body.email;
  if (userEmail === USERADMIN) {
    res.cookie("userEmail", userEmail);

    return res.redirect("/admin");
  }
  // Check if the entered email exists in the hardcoded users array
  if (users.includes(userEmail)) {
    // Set the user's email in a cookie
    res.cookie("userEmail", userEmail);

    // Redirect to admin if the user is USERADMIN
    if (userEmail === USERADMIN) {
      return res.redirect("/admin");
    }

    // Render dashboard.ejs for other users
    return res.render("dashboard", { userEmail });
  } else {
    // Render home.ejs for unsuccessful login
    return res.render("home", { error: "Invalid email address" });
  }
});

// Dashboard route
app.get("/dashboard", requireAuth, (req, res) => {
  // Render dashboard.ejs for authenticated users
  res.render("dashboard", { userEmail: req.cookies.userEmail });
});

// Logout route
app.get("/logout", (req, res) => {
  // Clear the user's email cookie
  res.clearCookie("userEmail");

  // Redirect to home after logout
  res.redirect("/");
});

// Admin route
app.get("/admin", (req, res) => {
  const userEmail = req.cookies.userEmail;

  // Check if the logged-in user is the admin (frank@gmail.com)
  if (userEmail === USERADMIN) {
    res.render("admin", { users });
  } else {
    // Redirect to home if the user is not the admin
    res.redirect("/");
  }
});

// Add user route
app.post("/admin/add", (req, res) => {
  const newUser = req.body.newUser;

  // Check if the new user is not already in the list
  if (!users.includes(newUser)) {
    users.push(newUser);

    // Update the data.json file with the new user
    fs.writeFileSync("data.json", JSON.stringify({ users }));

    res.redirect("/admin");
  } else {
    res.render("admin", { users, error: "User already exists" });
  }
});

// Delete user route
app.get("/admin/delete/:userEmail", (req, res) => {
  const userEmailToDelete = req.params.userEmail;

  // Filter out the user to delete
  users = users.filter((user) => user !== userEmailToDelete);

  // Update the data.json file without the deleted user
  fs.writeFileSync("data.json", JSON.stringify({ users }));

  res.redirect("/admin");
});

// Download data.json route
app.get("/admin/download", (req, res) => {
  const jsonData = JSON.stringify({ users });

  res.setHeader("Content-disposition", "attachment; filename=data.json");
  res.setHeader("Content-type", "application/json");
  res.send(jsonData);
});

// Upload data.json route
app.get("/admin/upload", (req, res) => {
  const userEmail = req.cookies.userEmail;

  // Check if the logged-in user is USERADMIN
  if (userEmail === USERADMIN) {
    res.render("uploadData", { error: null });
  } else {
    // Redirect to home if the user is not USERADMIN
    res.redirect("/");
  }
});

app.post("/admin/upload", upload.single("file"), (req, res) => {
  const userEmail = req.cookies.userEmail;

  // Check if the logged-in user is USERADMIN
  if (userEmail === USERADMIN) {
    const uploadedData = req.file.buffer.toString();

    try {
      const parsedData = JSON.parse(uploadedData);

      // Validate the structure of the uploaded JSON (assuming it should have a 'users' property)
      if (parsedData.users && Array.isArray(parsedData.users)) {
        // Update the data.json file with the uploaded data
        fs.writeFileSync("data.json", JSON.stringify(parsedData));
        users = parsedData.users;
        res.redirect("/admin");
      } else {
        res.render("uploadData", { error: "Invalid JSON format. Please provide valid data." });
      }
    } catch (error) {
      res.render("uploadData", { error: "Error parsing JSON. Please provide valid JSON data." });
    }
  } else {
    // Redirect to home if the user is not USERADMIN
    res.redirect("/");
  }
});

// 404 route
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
