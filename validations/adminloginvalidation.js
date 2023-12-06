const{body}=require("express-validator")


const adminloginDatavalidate=[
   
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("provide valid email"),
    body("password")
    .notEmpty().withMessage("password is required").isStrongPassword({minLength:6,minLowercase:1,minUppercase:1,minNumbers:1}).withMessage("password must be greater than 6 and contains at least one uppercase letter,one lowercase letter,one number,one special character"),
]

module.exports=adminloginDatavalidate