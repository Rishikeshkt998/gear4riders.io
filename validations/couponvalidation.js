const{body}=require("express-validator")
const User = require("../models/user")


const couponDatavalidate=[
    body("couponCode").notEmpty().withMessage("coupon is required").isAlphanumeric().withMessage("contain alphabets and numbers").isLength({min:4}).withMessage("name should be atleast 4 characters ").isLength({max:12}).withMessage("name should be maximum 12characters "),
    body("amount").trim().notEmpty().withMessage("amount is required").isDecimal().withMessage("amount must be decimal").isLength({min:2}).withMessage("amount should be atleast 2 numbers").isLength({max:10}).withMessage("amount should be maximum 10 numbers").custom((value,{req})=>{
        if(parseFloat(value)<0){
            throw new  Error('amount cannote be negative')
        }
        return true
    }),
    body("maximumusage").trim().notEmpty().withMessage("maximumusage is required").isDecimal().withMessage("maximumusage must be decimal").isLength({min:2}).withMessage("maximumusage should be atleast 2 numbers").isLength({max:10}).withMessage("maximumusage should be maximum 10 numbers").custom((value,{req})=>{
        if(parseFloat(value)<0){
            throw new  Error('maximumusage cannote be negative')
        }
        return true
    }),
    body("description").trim().notEmpty().withMessage("description is required").isString().withMessage("description  should be a string").isLength({min:5}).withMessage("description should be atleast 5 characters").isLength({max:500}).withMessage("product name should be maximum 500 characters"),
    
]

module.exports=couponDatavalidate