// To parse means:
// To read and understand data, and then convert it into a format your code can work with.

import express from 'express';// Express helps us create a web server
import cors from 'cors';  // CORS handles Cross-Origin Resource Sharing
import cookieParser from 'cookie-parser'; // Parses cookies attached to the client request

// Initializing the Express application
const app = express()   // Creates an Express server instance


// Middleware to enable CORS (Cross-Origin Resource Sharing)
// This allows your frontend (on a different origin) to communicate with your backend
app.use(cors({
    origin: process.env.CORS_ORIGIN, // Allow requests only from this origin set in .env.
    credentials: true   // Allows cookies and auth headers to be sent
}))


// Middleware to parse incoming JSON data
// Accepts JSON payloads up to 16kb in size

app.use(express.json({ limit: "16kb"}))

// Middleware to parse URL-encoded data (like form submissions)
// 'extended: true' allows nested objects
app.use(express.urlencoded({ extented: true, limit: "16kb"}))

// Middleware to serve static files (images, CSS, etc.) from the "public" folder
app.use(express.static("public"))

// Middleware to parse cookies from incoming requests
app.use(cookieParser())

//routes

import userRouter from './routes/user.routes.js'

//routes declaration
app.use("/api/v1/users", userRouter)

export { app } // Exporting the app so it can be used elsewhere (e.g., in index.js)