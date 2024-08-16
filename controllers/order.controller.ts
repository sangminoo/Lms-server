import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import { IOrder } from "../models/orderModel";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notificationModel";
import { getAllOrdersService, newOrder } from "../services/order.service";
import { redis } from "../utils/redis";
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// create Order
export const createOrder = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      // if (payment_info) {
      //   if ("id" in payment_info) {
      //     const paymentIntentId = payment_info.id;
      //     const paymentIntent = await stripe.paymentIntents.retrieve(
      //       paymentIntentId
      //     );
      //     if (paymentIntent.status !== "succeeded") {
      //       return next(new ErrorHandler("Payment not authorized!", 400));
      //     }
      //   }
      // }

      // Check if payment_info is an object and contains an 'id' property
      if (typeof payment_info !== "object" || !("id" in payment_info)) {
        return next(new ErrorHandler("Invalid payment information", 400));
      }

      const paymentIntentId = payment_info.id;
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      if (paymentIntent.status !== "succeeded") {
        return next(new ErrorHandler("Payment not authorized!", 400));
      }

      const user = await userModel.findById(req.user?._id);
      // if (!user) {
      //   return next(new ErrorHandler("User not found", 404));
      // }

      const courseExistInUser = user?.courses.some(
        (course: any) => course._id.toString() === courseId
      );

      console.log(courseExistInUser);

      if (courseExistInUser) {
        return next(
          new ErrorHandler("You have already purchasing this course", 400)
        );
      }

      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      };

      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("vi-VN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }

      user?.courses.push(course?._id);

      await redis.set(req.user?._id, JSON.stringify(user));

      await user?.save();

      await NotificationModel.create({
        userId: user?._id,
        title: "New Order",
        message: `You have a new order from ${course?.name}`,
      });

      if (course.purchased !== undefined && course.purchased !== null) {
        course.purchased += 1;
      }

      await course.save();
      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get all orders --- only for admin
export const getAllOrders = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// send stripe publish key
export const sendStripePublishableKey = catchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
);

// new payment
export const newPayment = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "USD",
        metadata: {
          company: "E-Learning",
        },
        automatic_payment_methods: { enabled: true },
      });

      res.status(201).json({
        success: true,
        client_secret: myPayment.client_secret,
      });

      // res.send({
      //   clientSecret: myPayment.client_secret,
      // });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
