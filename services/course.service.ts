import { Response } from "express";
import CourseModel from "../models/course.model";
import { catchAsyncError } from "../middleware/catchAsyncError";

// create course
export const createCourse = catchAsyncError(
  async (data: any, res: Response) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
      success: true,
      course,
    });
  }
);

// Get all users
export const getAllCoursesService = async (res: Response) => {
  const courses = await CourseModel.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    courses,
  });
};
