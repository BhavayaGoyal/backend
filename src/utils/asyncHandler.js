// A higher-order function that takes a request handler and returns a new function
const asyncHandler = (requestHandler) => {
return (req, res, next) => {
    // Resolve the promise from the async function
     // If there's an error, pass it to the next() middleware (error handler)
    Promise.resolve(requestHandler(req, res, next))
    .catch((error) => next(error))
    }
}


export {asyncHandler}



// 2nd Version of asyncHandler (Using try-catch block):


// A wrapper function for async route handlers with custom error response
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
      // Try executing the async function
//         await fn(req, res, next)
//     } catch (error) {
// / On error, send a JSON response with error message
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
          
//     }
// }