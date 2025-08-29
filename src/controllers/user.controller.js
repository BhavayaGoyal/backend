import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';

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

      const exitingUser= User.findOne({
        $or: [{username}, {email}]
    })
    console.log(exitingUser);

    if(exitingUser){
        throw new ApiError(409," User with email or username already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

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
        coverImage: coverImage.url || " ",
        email,
        password,
        username: username.toLowerCase( )
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

export {registerUser}