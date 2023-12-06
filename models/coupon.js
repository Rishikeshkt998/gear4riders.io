const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required:true
    },
    amount: {
        type: Number,
        default: 0
    },
    maximum_usage:{
        type: Number,
        default: 0
    },
    expired_at: {
        type: Date,
    },
    description:{
        type:String,
        required:true,
    },
    usage_count:{
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    },
})

const Coupon = mongoose.model('coupon', couponSchema)
module.exports = Coupon