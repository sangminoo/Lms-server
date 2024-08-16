"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrdersService = exports.newOrder = void 0;
const catchAsyncError_1 = require("../middleware/catchAsyncError");
const orderModel_1 = __importDefault(require("../models/orderModel"));
// create new order
exports.newOrder = (0, catchAsyncError_1.catchAsyncError)(async (data, res, next) => {
    const order = await orderModel_1.default.create(data);
    // next(order);
    res.status(201).json({
        success: true,
        order,
    });
});
// Get all orders
const getAllOrdersService = async (res) => {
    const orders = await orderModel_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        orders,
    });
};
exports.getAllOrdersService = getAllOrdersService;
