import user from "../model/coustmermodel.js";
import User from "../model/loginmodel.js";
import Place from "../model/placeModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Package from "../model/packagesModel.js";
import Review from "../model/reviewmodel.js";
import mongoose from "mongoose";
import PayModel from "../model/payModel.js";
import { validatePay } from "../schema/paymentSchema.js";
import UserModel from "../model/userModel.js";
import { validateUser } from "../schema/userSchema.js";
import { validateCustomer } from "../schema/customerSchema.js";
import nodemailer from "nodemailer";
import ProfileModel from "../model/profileModel.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    // Check for required fields
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      mobile,
    });

    // Save the new user
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Get token from the header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token is missing." });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ message: "Unauthorized: Invalid token." });

    req.user = user; // Save user information from token to request
    next(); // Call next middleware or route handler
  });
};
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for required fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const useremail = user.email;
    const name = user.name;
    // Generate a token
    const token = jwt.sign({ userId: user._id }, "your_jwt_secret", {
      expiresIn: "1h",
    });
    res.json({
      message: `Login successful ${useremail}`,
      token,
      useremail,
      name,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

const loginEmail = async (req, res) => {
  try {
    // Check if req.user exists and has the id property
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID is missing." });
    }

    const user = await User.findById(req.user._id).select("email"); // Only select the email field
    if (!user) {
      return res.status(404).json({ message: "User not found." }); // Not found
    }

    res.status(200).json({ email: user.email }); // Success
  } catch (error) {
    console.error("Error fetching user email:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const coustmer_details = async (req, res) => {
  try {
    // Destructure and validate input data
    const { name, mobile, email, packageTitle, paymentId, amount, date } =
      req.body;

    // Basic input validation (you can use Joi for comprehensive validation)
    if (
      !name ||
      !mobile ||
      !email ||
      !packageTitle ||
      !paymentId ||
      !amount ||
      !date
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Create a new payment entry
    const newPayment = new PayModel({
      name,
      mobile,
      email,
      packageTitle,
      paymentId,
      amount,
      date,
    });

    // Save to the database
    await newPayment.save();

    await checkAndSendReminders(email, packageTitle, date);
    // Respond with success
    res.status(201).json({ message: "Payment details saved successfully!" });
  } catch (error) {
    // Log error details for debugging
    console.error("Error saving payment details:", error);
    res.status(500).json({ message: "Failed to save payment details." });
  }
};

const userData = async (req, res) => {
  try {
    const data = await UserModel.find({});
    console.log(data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "An error occurred: " + error.message });
  }
};

const userDelete = async (req, res) => {
  const email = req.params.email;
  try {
    const result = await UserModel.findOneAndDelete({ email });
    if (result) {
      res.status(200).send("Deleted Successfully");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    res.status(500).send("Error deleting user: " + error.message);
  }
};

const updateData = async (req, res) => {
  const email = req.params.email;
  const { name, mobile } = req.body;
  try {
    const result = await UserModel.findOneAndUpdate(
      { email },
      { name, mobile },
      { new: true }
    );
    if (result) {
      res.status(200).send("Updated Successfully");
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    res.status(500).send("Error updating user: " + error.message);
  }
};

const addPlace = async (req, res) => {
  try {
    const { name, coordinates } = req.body;
    const newPlace = new Place({
      name,
      location: {
        type: "Point",
        coordinates,
      },
    });

    await newPlace.save();
    res.status(201).json({ message: "Place added successfully", newPlace });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

const getAllPlaces = async (req, res) => {
  try {
    const places = await Place.find();
    res.json(places);
  } catch (error) {
    res.status(500).json({ error: "An error occurred: " + error.message });
  }
};

const updatePlace = async (req, res) => {
  const { id } = req.params;
  const { name, coordinates } = req.body;

  try {
    const updatedPlace = await Place.findByIdAndUpdate(
      id,
      {
        name,
        location: {
          type: "Point",
          coordinates,
        },
      },
      { new: true }
    );

    if (!updatedPlace) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json({ message: "Place updated successfully", updatedPlace });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

const deletePlace = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPlace = await Place.findByIdAndDelete(id);
    if (!deletedPlace) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json({ message: "Place deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

const searchPlaces = async (req, res) => {
  const { query } = req.query;
  try {
    const results = await Place.find({ name: new RegExp(query, "i") });
    res.json(results);
  } catch (error) {
    console.error("Error searching places:", error);
    res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
};

const handleAddPackage = async (req, res) => {
  try {
    const { title, price, duration, features, place, location, imageUrl } =
      req.body;

    // Validate required fields
    if (
      !title ||
      !price ||
      !duration ||
      !features ||
      !place ||
      !location ||
      !imageUrl
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate that features is an array and not empty
    if (!Array.isArray(features) || features.length === 0) {
      return res
        .status(400)
        .json({ error: "Features must be a non-empty array" });
    }

    // Validate location
    const { latitude, longitude } = location;
    if (latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ error: "Latitude and Longitude are required in location" });
    }

    // Create a new package
    const newPackage = new Package({
      title,
      price,
      duration,
      features,
      place,
      location: { latitude, longitude },
      imageUrl,
    });

    // Save the package to the database
    await newPackage.save();

    // Send a success response
    res
      .status(201)
      .json({ message: "Package added successfully", package: newPackage });
  } catch (error) {
    console.error("Error in handleAddPackage:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deletePackages = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPackage = await Package.findByIdAndDelete(id);

    if (!deletedPackage) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting package", error });
  }
};

const getPackagesByPlace = async (req, res) => {
  const { place } = req.query;
  try {
    // Case-insensitive match with flexible spacing
    const packages = await Package.find({
      place: { $regex: new RegExp(`^${place.trim()}$`, "i") },
    });

    if (packages.length === 0) {
      return res
        .status(404)
        .json({ message: `No packages found for ${place}.` });
    }

    res.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error.message);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
};

const getPackage = async (req, res) => {
  const { id } = req.params; // Get package ID from the request URL

  try {
    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid package ID" });
    }

    // Fetch the package by its ID from the database
    const pack = await Package.findById(id);

    // If the package is not found, return a 404 error
    if (!pack) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Return the package data
    res.status(200).json(pack);
  } catch (error) {
    // Handle any server errors
    console.error(error);
    res.status(500).json({ message: "Error fetching package", error });
  }
};

const addReview = async (req, res) => {
  const { userId, placeId, rating, comment } = req.body;

  if (!userId || !placeId || typeof rating !== "number" || !comment) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    const newReview = new Review({
      userId,
      placeId,
      rating,
      comment,
      createdAt: new Date(),
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ message: "Failed to add review. Please try again." });
  }
};

const dispReview = async (req, res) => {
  try {
    const reviews = await Review.find().populate("userId");
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error("Error retrieving reviews:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve reviews. Please try again." });
  }
};

const bookedcont = async (req, res) => {
  try {
    console.log(req.params.name);

    const customerData = await PayModel.find({ name: req.params.name });
    const packageData = await Package.find();

    const packageMap = packageData.reduce((map, pkg) => {
      map[pkg.title] = pkg;
      return map;
    }, {});

    const bookedPackages = customerData
      .map((customer) => {
        const matchedPackage = packageMap[customer.packageTitle];
        return matchedPackage
          ? { customer, packageDetails: matchedPackage }
          : null;
      })
      .filter((pkg) => pkg !== null);

    res.json(bookedPackages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred: " + error.message });
  }
};

const updatePackage = async (req, res) => {
  const packageId = req.params.id; // Get the package ID from URL params
  const updatedData = req.body; // Get the data to update from the request body

  console.log("Updating package with ID:", packageId); // Log the package ID for debugging

  try {
    // Find the package by ID and update it
    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      updatedData,
      { new: true } // Return the updated package
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found" }); // Handle case when package is not found
    }

    res.status(200).json(updatedPackage); // Send the updated package back as a response
  } catch (error) {
    res.status(500).json({ message: "Server error", error }); // Handle server errors
  }
};

const savePayment = async (req, res) => {
  const { error } = validatePay(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const paymentDetails = req.body;
    const savedPayment = await PayModel.create(paymentDetails);
    res.status(201).json(savedPayment);
  } catch (error) {
    console.error("Error occurred:", err.message);
    console.error("Error saving payment details:", error);
    res.status(500).json({ message: "Failed to save payment details." });
  }
};

const saveCustomer = async (req, res) => {
  const { error } = validateCustomer(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const customerDetails = req.body;
    const savedCustomer = await coustmer_details.create(customerDetails);
    res.status(201).json(savedCustomer);
  } catch (error) {
    console.error("Error saving customer details:", error);
    res.status(500).json({ message: "Failed to save customer details." });
  }
};

const createUser = async (req, res) => {
  try {
    const { error } = validateUser(req.body); // Validate input data
    if (error) {
      console.error("Validation error:", error.details[0].message); // Log the validation error
      return res.status(400).send(error.details[0].message);
    }

    // Create a new user instance from the validated data
    const user = new UserModel({
      username: req.body.username,
      password: req.body.password, // Consider hashing the password here
    });

    await user.save();
    // Respond with the created user, excluding sensitive information
    res.status(201).send({
      id: user._id,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Error saving user details:", err); // Log the error
    res.status(500).send("Error saving user details");
  }
};

const paymentDetails = async (req, res) => {
  try {
    const payments = await PayModel.find();
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payment data", error });
  }
};

const deletePayment = async (req, res) => {
  const { id } = req.params; // Assume payment ID is passed as a URL parameter

  try {
    const deletedPayment = await PayModel.findByIdAndDelete(id);

    if (!deletedPayment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting payment", error });
  }
};

const packageDetails = async (req, res) => {
  try {
    const packages = await Package.find();
    res.json(packages);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching packages", error: error.message });
  }
};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "dineshkarthikrajand.22cse@kongu.edu",
    pass: "katsmmnarzpotuax",
  },
});

function sendMail(to, msg) {
  transporter.sendMail(
    {
      from: "dineshkarthikrajand.22cse@kongu.edu",
      to: to,
      subject: "Reminder: Please Review Your Package Experience",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f9; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333333;">Hello!</h2>
              <p style="color: #555555; font-size: 16px;">We hope you enjoyed your <strong>"${msg}"</strong> package. We would love to hear your feedback!</p>
              <p style="color: #555555; font-size: 16px;">Please take a moment to provide your feedback by clicking the button below:</p>
              <a href="travellplanner.netlify.app" 
                 style="display: inline-block; padding: 12px 25px; margin-top: 20px; background-color: #4CAF50; color: white; text-align: center; text-decoration: none; font-size: 18px; border-radius: 5px; box-shadow: 0 4px 8px rgba(0, 128, 0, 0.3);">
                Give Review
              </a>
              <p style="color: #777777; font-size: 14px; margin-top: 20px;">Thank you for your time!</p>
            </div>
          </body>
        </html>
      `,
    },
    (error, info) => {
      if (error) {
        return console.error("Error sending email:", error);
      }
      console.log("Email sent:", info.response);
    }
  );
}

const checkAndSendReminders = async (email, packageTitle, tripStartDate) => {
  try {
    const packageData = await Package.findOne({ title: packageTitle });
    if (!packageData) return;

    const durationDays = parseInt(packageData.duration);

    const tripStart = new Date(tripStartDate);
    const currentDate = new Date();

    const tripEndDate = new Date(tripStart);
    tripEndDate.setDate(tripEndDate.getDate() + durationDays);

    if (currentDate > tripEndDate) {
      await sendMail(email, packageTitle);
    }
  } catch (error) {
    console.error("Error checking and sending reminders:", error);
  }
};

const handleUpload = async (req, res) => {
  try {
    const { email } = req.body;
    const imgUrl = `/uploads/${req.file.filename}`;
    console.log(email);
    const profile = await ProfileModel.findOneAndUpdate(
      { email },
      { imgUrl },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Profile updated", profile });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Image upload failed" });
  }
};

const getProfile = async (req, res) => {
  try {
    console.log("Incoming request to fetch profile");

    const email = req.query.email;

    // Log and handle missing email
    if (!email) {
      console.error("Email query parameter is missing");
      return res
        .status(400)
        .json({ message: "Email query parameter is missing" });
    }

    console.log("Query email:", email);

    const user = await ProfileModel.findOne({ email });

    if (!user) {
      console.error("No user found with the provided email:", email);
      return res
        .status(404)
        .json({ message: "User not found with the given email" });
    }

    console.log("User found:", user);

    const { email: userEmail, imgUrl } = user;
    res.status(200).json({ email: userEmail, image: imgUrl });
  } catch (error) {
    console.error("Error fetching profile data:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export {
  registerUser,
  loginUser,
  coustmer_details,
  userData,
  userDelete,
  updateData,
  addPlace,
  getAllPlaces,
  updatePlace,
  deletePlace,
  searchPlaces,
  handleAddPackage,
  getPackagesByPlace,
  addReview,
  bookedcont,
  dispReview,
  updatePackage,
  savePayment,
  saveCustomer,
  createUser,
  paymentDetails,
  packageDetails,
  loginEmail,
  deletePackages,
  getPackage,
  deletePayment,
  handleUpload,
  getProfile,
};
