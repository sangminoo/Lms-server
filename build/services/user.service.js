"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleService = exports.getAllUsersService = exports.getUserById = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const redis_1 = require("../utils/redis");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
// get user by id
const getUserById = async (id, res, next) => {
    const userJson = await redis_1.redis.get(id);
    if (userJson) {
        const user = JSON.parse(userJson);
        res.status(200).json({
            success: true,
            user,
        });
    }
    else {
        return next(new ErrorHandler_1.default("User not found in cache", 404));
    }
};
exports.getUserById = getUserById;
// Get all users
const getAllUsersService = async (res) => {
    const users = await user_model_1.default.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        users,
    });
};
exports.getAllUsersService = getAllUsersService;
// update role for user  --- only for admin
const updateRoleService = async (res, email, role) => {
    const emailExist = await user_model_1.default.findOne({ email });
    if (emailExist) {
        const user = await user_model_1.default.findByIdAndUpdate(emailExist._id, {
            email,
            role,
        }, { new: true });
        res.status(201).json({
            success: true,
            user,
        });
    }
};
exports.updateRoleService = updateRoleService;
