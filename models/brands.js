const mongoose = require('mongoose')

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,

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
const Brand = mongoose.model('brand', brandSchema)
module.exports = Brand