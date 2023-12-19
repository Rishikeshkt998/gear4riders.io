const mongoose = require('mongoose')


const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    image: [{
        type: String,

    }],
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'product'
    },
    description: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
})

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;