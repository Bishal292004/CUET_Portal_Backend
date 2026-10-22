import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Used when the email doesn't exist, so the response takes the same time either way
const DUMMY_HASH = await bcrypt.hash("YB61ZnAO#123", 10);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//function for new user registration
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // 1. Types: reject anything that isn't plain text (blocks NoSQL injection)
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    // 2. Clean the input
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 3. Validate
    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 100 characters.",
      });
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // 4. Friendly duplicate check
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }

    // 5. Hash and save
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
    });

    // 6. Respond with safe fields only (never send the whole document)
    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    // Safety net for the race condition in point 10
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid data provided.",
      });
    }
    next(error); // anything else goes to the central error handler
  }
}


//function for user login

export async function login(req, res, next) {
    try{
        const { email, password } = req.body;
        if(typeof email !== "string" || typeof password !== "string"){
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        //clear the mail
        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({email: cleanEmail}).select("+passwordHash");


        //run bcrypt even for unknown email, to keep the timing same
        const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
        const passwordMatches = await bcrypt.compare(password, hashToCheck);

        //if user donot exist or wrong password
        if(!user || !passwordMatches){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        //check after the password, so stranger can't probe which accounts exist
        if (!user.isActive){
            return res.status(403).json({
                success: false,
                message: "This account has been deactivated.",
            });
        }

        const token = jwt.sign({ id: user._id}, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        await User.updateOne({ _id: user._id}, { lastLoginAt: new Date()});

        return res.status(200).json({
            success: true,
            message: "Login successfull.",
            data:{
                token,
                user:{
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });        

    }catch(error){
        next(error);
    }
}