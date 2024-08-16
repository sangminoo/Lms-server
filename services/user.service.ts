import { NextFunction, Response } from "express";
import userModel from "../models/user.model";
import { redis } from "../utils/redis";
import ErrorHandler from "../utils/ErrorHandler";

// get user by id
export const getUserById = async (
  id: string,
  res: Response,
  next: NextFunction
) => {
  const userJson = await redis.get(id);

  if (userJson) {
    const user = JSON.parse(userJson);
    res.status(200).json({
      success: true,
      user,
    });
  } else {
    return next(new ErrorHandler("User not found in cache", 404));
  }
};

// Get all users
export const getAllUsersService = async (res: Response) => {
  const users = await userModel.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    users,
  });
};

// update role for user  --- only for admin
export const updateRoleService = async (
  res: Response,
  email: string,
  role: string
) => {
  const emailExist = await userModel.findOne({ email });
  if (emailExist) {
    const user = await userModel.findByIdAndUpdate(
      emailExist._id,
      {
        email,
        role,
      },
      { new: true }
    );
    res.status(201).json({
      success: true,
      user,
    });
  }
};
