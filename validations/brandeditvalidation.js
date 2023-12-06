const{body}=require("express-validator")


const brandeditDatavalidate=[
    body("name").notEmpty().withMessage("brand is required").isString().withMessage("only contain string").isLength({min:2}).withMessage("brand should be atleast 2 characters ").isLength({max:15}).withMessage("brand should be maximum 15characters ")
   
]

module.exports=brandeditDatavalidate