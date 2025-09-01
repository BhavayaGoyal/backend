import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refesh and access token.")
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    //validation : no empty fields
    // if user already exists: username, email
    //check for images, check for avatar
    //upload them to cloudinary, avatar
    //create user object-create entry in db
    // remove password and refresh token field from response
    //check for user creation
    //return response

    const {fullname, email, username, password} = req.body
    console.log("email", email)

    if(
        [fullname, email, username, password].some((field)=> field ?.trim()==="")
    ){
        throw new ApiError(400, "All fields are compulsory!!")
    }

      const exitingUser= await User.findOne({
        $or: [{username}, {email}]
    })
    console.log(req.files);

    if(exitingUser){
        throw new ApiError(409," User with email or username already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalpath = req.files?.coverImage[0]?.path;

    let coverImageLocalpath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalpath = req.files.coverImage[0].path
    }


    console.log("Avatar Local Path: "+avatarLocalPath);
    console.log("Cover image Local Path: "+coverImageLocalpath);

    if(!avatarLocalPath){
       throw new ApiError (400, "Avatar file is required!")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("Cloudniary avatar "+avatar)

    const coverImage = await uploadOnCloudinary(coverImageLocalpath);
    console.log("Cloudinary cover Image: ", coverImage);

    if(!avatar){
        throw new ApiError (400, "Avatar file is required!")
    }

    const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",   // ✅ safe check
    email,
    password,
    username: username.toLowerCase()
});
    console.log("User: ", user);

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User regitered successfully!")
    )
}) 

const loginUser = asyncHandler(async (req,res) => {
    // req body -> data
    //username & email
    //find the user
    //if user not found give error or message
    // if user found -> password check
    // access & refresh token
    // send cookies

    const {email, username, password} = req.body
    if (!username && !email) {
        throw new ApiError (400, "Username or Email is required!")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    console.log("User ", user);

    if(!user){
        throw new ApiError(404, "User does not exists.")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Password incorrect!")
    }
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //Cookies

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully!"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Authorization is missing!")
    }

   try{
     const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET,
         
    )

    const user = await User.findById(decodedToken?._id)
    if (!user) {
        throw new ApiError(404, "User not found!")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh token is expired or used!")
    }

    const options = {
        httpOnly: true,
        secure: true
    }
    const {accessToken, newrefreshToken} =await generateAccessAndRefreshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken, options )
    .cookie("refreshToken",newrefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken:newrefreshToken},
            "access token refreshed successfully!"
        )
    )}
    catch(error){
        throw new ApiError(401,error?.message || "Invalid refresh token!")
   }
})
export {registerUser, loginUser, logoutUser, refreshAccessToken}