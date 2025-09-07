import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password!")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200,{},"Password changes successfully!"))
})

const getCurrentUser = asyncHandler(async (res,req)=>{
    return res
    .status(200).json(new ApiResponse(200,req.user,"Current user fetched successfully!"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400,"Fullname and email are required!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user , "User details updated successfully!"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar!")
    }

        const user =  await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "User avatar updated successfully!"))
})


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path
    
    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is required!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on coverImage!")
    }

        const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200, user, "User cover image updated successfully!"))
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is required!")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"Subscription",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"Subscription",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size:"$subscribers",
                },
                channelsSubcribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed: {
                   $cond:{
                    if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                   } 
                }
            }
        },
        {
         $project:{
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubcribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
         }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found!")
    }

    if(!channel?.length){
        throw new ApiError(404, "Channel not found!")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0],"User channel profile fetched successfully!")
    )
})

const getWatchHistory = asyncHandler(async(req, res) =>{
    const user = await User.aggregate([
        {
            $match:{
               _id: mongoose.Types.ObjectId.createFromHexString(req.user._id)
            }
        },
        {
            $lookup:{
                from: "Video",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localFiels:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner",
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully"))
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile,getWatchHistory}