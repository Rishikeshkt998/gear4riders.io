const{body}=require("express-validator")


const productDatavalidate=[
    body('name').trim().notEmpty().withMessage("productname is required").isString().withMessage("productName  should be a string").isLength({min:5}).withMessage("product name should be atleast 5 characters").isLength({max:50}).withMessage("product name should be maximum 50 characters"),
    body("price").trim().notEmpty().withMessage("price is required").isDecimal().withMessage("product price must be decimal").isLength({min:2}).withMessage("price should be atleast 2 numbers").isLength({max:10}).withMessage("price should be maximum 10 numbers").custom((value,{req})=>{
        if(parseFloat(value)<0){
            throw new  Error('price cannote be negative')
        }
        return true
    }),
    body('image').notEmpty().withMessage("file is required").custom((value, { req }) => {
        // Custom validation: Check if the file format is jpg or png
        if (!value || !value.every(file => /\.(jpg|jpeg|png)$/i.test(file.originalname))) {
            throw new Error('Invalid file format. Only JPG or PNG images are allowed.');
        }
        return true;
    }),
    body('categorieId').trim().notEmpty().withMessage("category is required"),
    body('brandId').trim().notEmpty().withMessage("brand is required"),
    body('countInStock').trim().notEmpty().withMessage("stock field is required").isInt().withMessage("stock be a number").isLength({max:5}).withMessage("stock should be maximum 5 numbers").custom((value,{req})=>{
        if(parseFloat(value)<0){
            throw new  Error('stock cannote be negative')
        }
        return true
    }),
   
    body("description").trim().notEmpty().withMessage("description is required").isString().withMessage("description  should be a string").isLength({min:5}).withMessage("description should be atleast 5 characters").isLength({max:500}).withMessage("product name should be maximum 500 characters"),
    
    
]

module.exports=productDatavalidate