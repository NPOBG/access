// MongoDB Connection URI
// - Replace 'localhost' with the hostname or IP address of your MongoDB server
// - Replace '27017' with the port number on which your MongoDB server is running
// - Replace 'dooraccess' with the name of the database you want to use
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dooraccess';

// Application Port
// - Set the port number on which the application server should run
export const PORT = parseInt(process.env.PORT || '8000', 10);

// Default Admin Code
// - This is the initial admin code that must be changed on first use
export const DEFAULT_ADMIN_CODE = '123456';

// Admin User
// - Set the username for the admin user
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

// Admin Password
// - Set the password for the admin user
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
