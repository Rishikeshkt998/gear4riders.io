const{body}=require("express-validator")
const User = require("../models/user")


const categoryDatavalidate=[
    body("name").notEmpty().withMessage("category is required").isAlpha().withMessage("only contain alphabets").isLength({min:4}).withMessage("category should be atleast 4 characters ").isLength({max:12}).withMessage("category should be maximum 12characters ")
   
]

module.exports=categoryDatavalidate