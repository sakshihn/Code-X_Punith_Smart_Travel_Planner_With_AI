import mongoose from "mongoose";
const url="your_url";

const dbconnect=async()=>{
    try {
        await mongoose.connect(url);
        console.log("db connected");
    } catch (error) {
        console.error(error);
    }
}
export default dbconnect;
