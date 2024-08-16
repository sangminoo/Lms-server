import mongoose from "mongoose";
require("dotenv");

const dbUrl: string = process.env.DATABASE_URI || "";

const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl).then((data: any) => {
      console.log(`Database connected with ${data.connection.host}`);
    });
  } catch (error) {
    console.log(error);
    setTimeout(connectDB, 5000);
  }
};

export default connectDB
