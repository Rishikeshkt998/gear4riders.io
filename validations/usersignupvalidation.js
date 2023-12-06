const{body}=require("express-validator")


const userSignupDatavalidate=[
    body('name').trim().notEmpty().withMessage("Name is required").isLength({min:6},{max:12}).withMessage("Name name should be between 6 to 12 characters"),
    body("email").trim().isEmail().withMessage("invalid Email address"),
    body('address').trim().notEmpty().withMessage("address field is required").isLength({max:50}).withMessage("Name name should be maximum 50 characters"),
    body("phone").trim().isMobilePhone().withMessage("invalid phone number").isLength({min:10,max:10}).withMessage("mobile should be 10 numbers"),
    body("password")
    .notEmpty().withMessage("password is required").isStrongPassword({minLength:6,minLowercase:1,minUppercase:1,minNumbers:1}).withMessage("password must be greater than 6 and contains at least one uppercase letter,one lowercase letter,one number,one special character"),
    body('cpassword').notEmpty().withMessage(" confirm password is required").custom((value,{req})=>{
        if(value!=req.body.password){
            throw new Error('password should match')

        }
        return true
    })
]

module.exports=userSignupDatavalidate