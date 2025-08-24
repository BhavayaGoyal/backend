// require('dotenv').config({path: '.env'});
import express from "express";
import mongoose from "mongoose";  // Importing Mongoose to interact with MongoDB
import {DB_NAME} from "./constants.js"  // Importing the database name from a constants file 
import connectDB from "./db/index.js";  // Importing the custom function that connects to the database
import dotenv from "dotenv";  // Importing dotenv to load environment variables
 import { app } from "./app.js";

dotenv.config({
    path: './env'    // Loading environment variables from a file named 'env'
})


connectDB()  // Calling the connectDB function to connect to MongoDB
.then(() => {
     // If DB connection is successful, start the server
    app.listen(process.env.PORT || 3000, () =>{
         // Log to the console which port the server is running on
        console.log(`Server is running on port ${process.env.PORT || 3000}`);
    })
})
.catch((error) => {
    // If DB connection fails, log the error
    console.log("Error connecting to the database: ", error);
})







/*
import express from "express"
const app = express()

(async () => {
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/ ${DB_NAME}`)
       app.on("error", (error) => {
        console.log("Error:", error)
        throw error
       })
        app.listen(process.env.PORT, ()=> {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch(error){
        console.error("ERROR:", error);
        throw error
    }
})()*/