import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  imgUrl: {
    type: String,
    required: true,
  },
});

const ProfileModel =
  mongoose.models.Profile || mongoose.model("Profile", profileSchema);

export default ProfileModel;
