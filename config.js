"use strict";
// Application Configuration
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_PASSWORD = exports.ADMIN_USERNAME = exports.PORT = exports.MONGODB_URI = void 0;
// MongoDB Connection URI
// - Replace 'localhost' with the hostname or IP address of your MongoDB server
// - Replace '27017' with the port number on which your MongoDB server is running
// - Replace 'dooraccess' with the name of the database you want to use
exports.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dooraccess';
// Application Port
// - Set the port number on which the application server should run
exports.PORT = parseInt(process.env.PORT || '8000', 10);
// Admin User
// - Set the username for the admin user
exports.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// Admin Password
// - Set the password for the admin user
exports.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
