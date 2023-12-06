
// Define the Address schema
const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema({
    userId: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    address: [
        {
            name: {
                type: String,
                required: true
            },
            fulladdress:{
                type:String,
                required:true
            },
            pincode: {
                type: Number,
                required: true
            },
            landmark:{
                type:String
            },
            district: {
                type: String,
                required: true
            },
            state: {
                type: String,
                required: true
            },
            phone: {
                type: Number,
                required: true
            },
            alternatephone:{
                type:Number
            },
           
            
           
            
            
        }
    ],
    created_at:{
        type:Date,
        default:Date.now()
    },
    modified_at:{
        type:Date
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
})
const Address = mongoose.model('address', addressSchema)
module.exports = Address