import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authenticate(req, res, next){
    try{
        const header = req.get("Authorization");

        if(!header || !header.startsWith("Bearer ")){
            return res.status(401).json({
                success: false,
                message: "Please login to continue.",
            });
        }

        const token = header.split(" ")[1];

        let decode;
        try{
            decode = jwt.verify(token, process.env.JWT_SECRET);
        }catch {
            return res.status(401).json({
                success: false,
                message: "Your session in invalid or has expired. Please login to continue.",
            });
        }

        const user = await User.findById(decode.id);

        if(!user || !user.isActive){
            return res.status(401).json({
                success: false,
                message: "Your session is invalid or has expired. Please login again.",
            });
        }

        //Reject tokens before the last password change
        if(user.passwordChangedAt && decode.iat * 1000 < user.passwordChangedAt.getTime()){
            return res.status(401).json({
                success: false,
                message: "Your session in invalid or has expired. Please login again.",
            });
        }

        req.user = user;
        next();
    }catch(error){
        next(error);
    }
}


//used later on admin and editor routes

export function requireRole(...roles){
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return res.status(403).json({
                success: false,
                message: "You do not have permission to do this.",
            });
        }
        next();
    };
}