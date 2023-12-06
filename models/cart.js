const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
                required: true,
            },

            image: [{
                type: String,

            }],
            name: {
                type: String,

            },
            price: {
                type: Number,
                default: 0,
            },
            quantity: {
                type: Number,
            }
        }
    ],
    isDeleted: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    deleted_at: {
        type: Date
    }
});

const Cart = mongoose.model('cart', cartSchema);
module.exports = Cart;