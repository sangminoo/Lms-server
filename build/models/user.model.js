"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("dotenv").config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailRegexPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name"],
    },
    email: {
        type: String,
        required: [true, "Please enter your email"],
        validate: {
            validator: function (value) {
                return emailRegexPattern.test(value);
            },
            message: "Please enter a valid email address",
        },
        unique: true,
    },
    password: {
        type: String,
        minlength: [8, "Password must be at least 8 characters"],
        select: false,
    },
    avatar: {
        public_id: String,
        url: String,
    },
    role: {
        type: String,
        default: "user",
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            courseId: String,
        },
    ],
}, { timestamps: true });
// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
// Sign access token
userSchema.methods.signAccessToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, process.env.ACCESS_TOKEN || "", {
        expiresIn: "5m",
    });
};
// Sign refresh token
userSchema.methods.signRefreshToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, process.env.REFRESH_TOKEN || "", {
        expiresIn: "3d",
    });
};
// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
const userModel = mongoose_1.default.model("User", userSchema);
exports.default = userModel;
