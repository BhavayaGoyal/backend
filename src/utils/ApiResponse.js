// ApiResponse.js
// This module defines a class for handling API responses in a consistent format.
class ApiResponse{
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode // HTTP status code
        this.data = data  // Actual data you want to send in the response
        this.message = message  // Optional message (defaults to "Success")
        this.success =  statusCode < 400 //Boolean: true if status code means success
    }
}