const{body}=require("express-validator")


const addressDataValidate=[
    body('name').trim().notEmpty().withMessage("Name is required").isLength({min:6},{max:12}).withMessage("Name name should be between 6 to 12 characters"),
    body('fulladdress').trim().notEmpty().withMessage("address field is required").isLength({max:50}).withMessage("Name name should be maximum 50 characters"),
    body("pincode").trim().isInt().withMessage("invalid pincode").isLength({min:4,max:6}).withMessage("pincode should be 6 digits"),
    body('landmark').trim().notEmpty().withMessage("landmark is required").isLength({min:6},{max:50}).withMessage("landmark should be between 6 to 50 characters"),
    body('district').trim().notEmpty().withMessage("district is required").isLength({min:6},{max:15}).withMessage("district should be between 6 to 15 characters"),
    body('state').trim().notEmpty().withMessage("state is required").isLength({min:6},{max:12}).withMessage("state should be between 6 to 12 characters"),
    body("phone").trim().isMobilePhone().withMessage("invalid phone number").isLength({min:10,max:10}).withMessage("mobile should be 10 numbers"),
    body("alternatephone").trim().isMobilePhone().withMessage("invalid phone number").isLength({min:10,max:10}).withMessage("mobile should be 10 numbers"),
    
]

module.exports=addressDataValidate