"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishableKey = exports.getAllOrders = exports.createOrder = void 0;
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const path_1 = __importDefault(require("path"));
const ejs_1 = __importDefault(require("ejs"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const order_service_1 = require("../services/order.service");
const redis_1 = require("../utils/redis");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// create Order
exports.createOrder = (0, catchAsyncError_1.catchAsyncError)(async (req, res, next) => {
    try {
        const { courseId, payment_info } = req.body;
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
            return next(new ErrorHandler_1.default("Invalid payment information", 400));
        }
        const paymentIntentId = payment_info.id;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            return next(new ErrorHandler_1.default("Payment not authorized!", 400));
        }
        const user = await user_model_1.default.findById(req.user?._id);
        // if (!user) {
        //   return next(new ErrorHandler("User not found", 404));
        // }
        const courseExistInUser = user?.courses.some((course) => course._id.toString() === courseId);
        console.log(courseExistInUser);
        if (courseExistInUser) {
            return next(new ErrorHandler_1.default("You have already purchasing this course", 400));
        }
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        const data = {
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
        const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/order-confirmation.ejs"), { order: mailData });
        try {
            if (user) {
                await (0, sendMail_1.default)({
                    email: user.email,
                    subject: "Order confirmation",
                    template: "order-confirmation.ejs",
                    data: mailData,
                });
            }
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 500));
        }
        user?.courses.push(course?._id);
        await redis_1.redis.set(req.user?._id, JSON.stringify(user));
        await user?.save();
        await notificationModel_1.default.create({
            userId: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`,
        });
        if (course.purchased !== undefined && course.purchased !== null) {
            course.purchased += 1;
        }
        await course.save();
        (0, order_service_1.newOrder)(data, res, next);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// Get all orders --- only for admin
exports.getAllOrders = (0, catchAsyncError_1.catchAsyncError)(async (req, res, next) => {
    try {
        (0, order_service_1.getAllOrdersService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// send stripe publish key
exports.sendStripePublishableKey = (0, catchAsyncError_1.catchAsyncError)(async (req, res) => {
    res.status(200).json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});
// new payment
exports.newPayment = (0, catchAsyncError_1.catchAsyncError)(async (req, res, next) => {
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
