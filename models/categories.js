const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true

    },
    discount:{
        type:Number,
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    modified_at: {
        type: Date,

    }



})
const Category = mongoose.model('category', categorySchema)
module.exports = Category
