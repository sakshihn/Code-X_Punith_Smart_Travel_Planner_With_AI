import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dbconnect from "./database/db.js";
import multer from "multer";
import {
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
  paymentDetails,
  packageDetails,
  loginEmail,
  deletePackages,
  getPackage,
  deletePayment,
  handleUpload,
  getProfile,
} from "./controller/control.js";

const app = express();
const port = process.env.PORT || 5000; 

dbconnect();

app.use(
  cors({
    origin: ["https://travellplanner.netlify.app", "http://localhost:5173"],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.json());

app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);
app.post("/customer", coustmer_details);
app.get("/userdata", userData);
app.get("/api/user", loginEmail);
app.delete("/userDelete/:email", userDelete);
app.put("/userUpdate/:email", updateData);

app.post("/api/places", addPlace);
app.get("/api/places", getAllPlaces);
app.put("/api/places/:id", updatePlace);
app.delete("/api/places/:id", deletePlace);
app.get("/api/places/search", searchPlaces);

app.post("/api/packages", handleAddPackage);
app.get("/api/packages", getPackagesByPlace);
app.delete("/api/packages/:id", deletePackages);
app.post("/api/reviews", addReview);
app.get("/api/booked/:name", bookedcont);
app.get("/api/reviews", dispReview);
app.put("/api/packages/:id", updatePackage);
app.post("/payment", coustmer_details);
app.get("/payment", paymentDetails);
app.get("/packages", packageDetails);
app.get("/api/packages/:id", getPackage);
app.delete("/payments/:id", deletePayment);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });


app.post("/upload", upload.single("profilePhoto"), handleUpload);
app.use("/uploads", express.static("uploads"));
app.get("/get/upload", getProfile);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
