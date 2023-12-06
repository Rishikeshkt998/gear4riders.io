


const mongoose=require('mongoose')

const productSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    image:[{
        type:String,
    
    }],
    price:{
        type:Number,
        default:0,
    },
    brandId:
    {
        type: mongoose.Types.ObjectId,
        ref: "brand",
        required:true
    },
    categorieId:
    {
        type: mongoose.Types.ObjectId,
        ref: "category",
        required:true
    },
    countInStock:{
        type:Number,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    discount:{
        type:Number,
        default:0
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    created_at:{
        type:Date,
        default:Date.now()
    },
    modified_at:{
        type:Date,

    },
    cart:{
        type:Boolean,
        default:false
    }
    
   


})
const Product=mongoose.model('product',productSchema)
module.exports=Product

