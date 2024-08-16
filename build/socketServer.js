"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
// export const initSocketServer = (server: http.Server) => {
//   const io = new SocketIOServer(server);
//   io.on("connection", (socket) => {
//     console.log("A user connected");
//     // Listen for "notification" event from the frontend
//     socket.on("notification", (data) => {
//       // Broadcast the notification data to all connected clients (admin dashboard)
//       io.emit("newNotification", data);
//     });
//     socket.on("disconnect", () => {
//       console.log("A user disconnected");
//     });
//   });
// };
const initSocketServer = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.ORIGIN, // Đảm bảo rằng đây là đúng URL của client
            methods: ["GET", "POST"],
            allowedHeaders: ["my-custom-header"],
            credentials: true,
        },
        transports: ["websocket", "polling"], // Đảm bảo rằng các transport được cấu hình chính xácF
    });
    io.on("connection", (socket) => {
        console.log("A user connected with ID: ", socket.id);
        socket.on("notification", (data) => {
            console.log("Received notification: ", data);
            io.emit("newNotification", data);
        });
        socket.on("disconnect", (reason) => {
            console.log("A user disconnected. Reason: ", reason);
        });
        socket.on("connect_error", (err) => {
            console.error("Connection error: ", err);
        });
    });
};
exports.initSocketServer = initSocketServer;
