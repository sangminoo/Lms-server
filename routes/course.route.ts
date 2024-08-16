import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  deleteCourse,
  editCourse,
  generateVideoUrl,
  getAllCourses,
  getAdminAllCourses,
  getCourseByUser,
  getSingleCourse,
  uploadCourse,
} from "../controllers/course.controller";
import { updateAccessToken } from "../controllers/user.controller";

const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);

courseRouter.put(
  "/edit-course/:id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);

// courseRouter.get("/get-course/:id", updateAccessToken, getSingleCourse);
courseRouter.get("/get-course/:id", getSingleCourse);
// courseRouter.get("/get-courses", updateAccessToken, getAllCourses);
courseRouter.get("/get-courses", getAllCourses);

courseRouter.get(
  "/get-admin-courses",
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminAllCourses
);

courseRouter.get(
  "/get-course-content/:id",
  updateAccessToken,
  isAuthenticated,
  getCourseByUser
);

courseRouter.put(
  "/add-question",
  updateAccessToken,
  isAuthenticated,
  addQuestion
);

courseRouter.put("/add-answer", updateAccessToken, isAuthenticated, addAnswer);

courseRouter.put(
  "/add-review/:id",
  updateAccessToken,
  isAuthenticated,
  addReview
);

courseRouter.put(
  "/add-reply",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);

courseRouter.get(
  "/get-all-courses",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminAllCourses
);

courseRouter.post("/getVdoCipherOTP", generateVideoUrl);

courseRouter.delete(
  "/delete-course/:id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);

export default courseRouter;
