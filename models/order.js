const mongoose = require('mongoose');

const ordersSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now()
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    couponname: {
        type: String,
        // required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        required: true,
    },
    paymentstatus: {
        type: String,
    },
    invoicenumber: {
        type: String,
        required: true
    },
    refund: {
        type: Boolean,
        default: false
    },
    return_date: {
        type: Date

    },
    products: [
        {
            product_id: {
                type: mongoose.Types.ObjectId,
                ref: 'product',
                required: true,
            },
            productname: {
                type: String,
                required: true,
            },
            productimage: [{
                type: String,

            }],
            productprice: {
                type: Number,
                default: 0,
            },
            quantity: {
                type: Number,
                required: true,
            },
            brandId:
            {
                type: mongoose.Types.ObjectId,
                ref: "brand",
            },
            categorieId:
            {
                type: mongoose.Types.ObjectId,
                ref: "category",
            },


            delivery_date: {
                type: String,
                default: new Date().setDate(new Date().getDate() + 7),
            }
        }
    ],
    address: {
        address_id: {
            type: mongoose.Types.ObjectId,
            ref: 'address',
            required: true,
        },
        name: {
            type: String,

        },
        fulladdress: {
            type: String,

        },
        pincode: {
            type: Number,

        },
        landmark: {
            type: String
        },
        district: {
            type: String,

        },
        state: {
            type: String,

        },
        phone: {
            type: Number,

        },
        alternatephone: {
            type: Number
        },
    },
});

const orders = mongoose.model('orders', ordersSchema);
module.exports = orders;