import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notificationModel";
import axios from "axios";
require("dotenv").config();

// upload course
export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Edit course
export const editCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      const courseId = req.params.id;
      // const courseData = (await CourseModel.findById(courseId)) as any;
      // if(thumbnail && !thumbnail.startWith("https")) {
      if (thumbnail) {
        // await cloudinary.v2.uploader.destroy(thumbnail.public_id);

        if (thumbnail.public_id) {
          await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        }

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );

      await redis.set(courseId, JSON.stringify(course));

      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course ---- without purchasing
export const getSingleCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);

        res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        await redis.set(courseId, JSON.stringify(course));

        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all courses --without purchasing
export const getAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const isCacheExist = await redis.get("allCourses");
      // if (isCacheExist) {
      //   const courses = JSON.parse(isCacheExist);

      //   res.status(201).json({
      //     success: true,
      //     courses,
      //   });
      // } else {

      // Check if cache exists
      // const isCacheExist = await redis.get("allCourses");
      // if (isCacheExist) {
      //   const courses = JSON.parse(isCacheExist);
      //   return res.status(200).json({
      //     success: true,
      //     courses,
      //   });
      // }

      // Fetch courses from the database
      const courses = await CourseModel.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      // Set courses in Redis cache
      // await redis.set("allCourses", JSON.stringify(courses));
      await redis.set("allCourses", JSON.stringify(courses)); // Set cache with expiration of 1 hour

      res.status(200).json({
        success: true,
        courses,
      });
      // }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get course content --- only for valid user
export const getCourseByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Add question in course
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      // create a new question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      //  add this question to our course content
      courseContent.questions.push(newQuestion);

      await NotificationModel.create({
        userId: req.user?._id,
        title: "New Question Received",
        message: `You have a new question from ${courseContent?.title}`,
      });

      // save and update course
      await course?.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add answer in course question
interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, contentId, courseId, questionId }: IAddAnswerData =
        req.body;

      const course = await CourseModel.findById(courseId);

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );

      if (!question) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      // create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
        createdAt: new Date().toISOString(),
        updateAt: new Date().toISOString(),
      };

      // add this answer to our course content
      question.questionReplies.push(newAnswer);

      await course?.save();

      if (req.user?._id === question.user._id) {
        // create a notification question
        await NotificationModel.create({
          user: req.user?._id,
          title: "New Question Reply Received",
          message: `You have a new question from ${courseContent?.title}`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );

        try {
          await sendMail({
            email: question.user.email,
            subject: "Question Reply",
            template: "question-reply.ejs",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add review in course
interface IAddReviewData {
  review: string;
  courseId: string;
  rating: number;
  userId: string;
}

export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;

      const courseId = req.params.id;

      // check if courseId already exists in userCourseList based on _id
      const courseExists = userCourseList?.some((course: any) => {
        return course._id.toString() === courseId.toString();
      });

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const course = await CourseModel.findById(courseId);

      const { review, rating } = req.body as IAddReviewData;

      const reviewData: any = {
        user: req.user,
        rating,
        comment: review,
      };

      course?.reviews.push(reviewData);

      let avg = 0;

      course?.reviews.forEach((review) => {
        avg += review.rating;
      });

      if (course) {
        course.ratings = avg / course.reviews.length; // one example we have 2 ratings one is 5 and another one is 4 so math working like this: (5 + 4 ) / 2 = 4.5 ratings
      }
      await course?.save();

      await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days

      // const notification = {
      //   title: "New Review Received",
      //   message: `${req.user?.name} has given a review in ${course?.name}`,
      // };

      // create a notification review
      await NotificationModel.create({
        user: req.user?._id,
        title: "New review received",
        message: `You have a new question from ${course?.name}`,
      });

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add reply in review
interface IAddReviewReply {
  comment: string;
  courseId: string;
  reviewId: string;
}
export const addReplyToReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewReply;

      const course = await CourseModel.findById(courseId);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const review = course?.reviews?.find((r) => r.id === reviewId);

      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }

      const replyData: any = {
        user: req.user,
        comment,
        createdAt: new Date().toISOString(),
        updateAt: new Date().toISOString(),
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }

      review.commentReplies?.push(replyData);

      await course?.save();

      await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get all courses --- only for admin
export const getAdminAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCoursesService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// delete course --- only for admin
export const deleteCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      await course.deleteOne({ _id: id });
      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Generate video url
export const generateVideoUrl = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
