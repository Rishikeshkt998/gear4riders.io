const{body}=require("express-validator")


const adminsignupDatavalidate=[
    body('name').notEmpty().withMessage("Name is required").isLength({min:6},{max:12}).withMessage("Name name should be between 6 to 12 characters"),
    
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("provide valid email"),
    body("password")
    .notEmpty().withMessage("password is required").isStrongPassword({minLength:6,minLowercase:1,minUppercase:1,minNumbers:1}).withMessage("password must be greater than 6 and contains at least one uppercase letter,one lowercase letter,one number,one special character"),
]

module.exports=adminsignupDatavalidate
