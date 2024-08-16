import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  status: string;
  userId: string;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      require: true,
    },
    message: {
      type: String,
      require: true,
    },
    status: {
      type: String,
      require: true,
      default: "unread",
    },
  },
  { timestamps: true }
);

const NotificationModel: Model<INotification> = mongoose.model(
  "Notification",
  notificationSchema
);

export default NotificationModel;
