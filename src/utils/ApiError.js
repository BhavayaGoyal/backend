// Custom error class for handling API-specific errors

class ApiError extends Error{
      // Constructor receives error details when the error is thrown
    constructor(
        statusCode,  // HTTP status code (e.g., 404, 500)
        message = "Something went wrong!", // Default error message if not provided
        errors = [], // Optional array of specific errors (like validation issues)
        stack = ""  // Optional custom stack trace
    ){
         super(message);  // Call parent Error class constructor with message
        this.statusCode = statusCode;  // Set the HTTP status code for the error
        this.data = null; // Optional data field for additional information
        this.message = message;  //Overide the default message from the Error class
        this.success = false;  // Indicates that this is an error response
        this.errors = errors   // Store any specific errors (like validation errors)


        // If a custom stack trace is provided, use it; otherwise, capture the current stack trace
        // This helps in debugging by showing where the error originated
        if(stack){
            this.stack = stack ;
        }else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {ApiError}