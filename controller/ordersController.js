
const User = require('../models/user');
const Order = require('../models/order');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const Razorpay = require('razorpay');



const calculateTotalAmount = async (matchCriteria) => {
    console.log('Matching criteria:', matchCriteria);
    const result = await Cart.aggregate([
        {
            $match: matchCriteria,
        },
        {
            $unwind: '$products',
        },
        {
            $group: {
                _id: null,
                totalAmount: {
                    $sum: {
                        $multiply: ['$products.price', '$products.quantity'],
                    },
                },
                totalProducts: { $sum: '$products.quantity' },
            },
        },
    ]);

    console.log(result);

    console.log('Aggregation result:', result);

    if (result.length > 0) {
        console.log('Total Amount:', result[0].totalAmount);
        console.log(`totalProducts ${result[0].totalProducts}`);
        let totalAmount = Math.round(result[0].totalAmount);


        let totalProducts = result[0].totalProducts;
        return { totalAmount, totalProducts };
    } else {
        console.log('No results found.');
        return { totalAmount: 0, totalProducts: 0 }; // Return 0 if no results
    }
};
const calculateProductAmount = async (matchCriteria) => {
    console.log('Matching criteria:', matchCriteria);

    const result = await Cart.aggregate([
        {
            $match: matchCriteria
        },
        {
            $unwind: "$products"
        },
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: "$product"
        },
        {
            $group: {
                _id: null,
                totalProductAmount: {
                    $sum: {
                        $multiply: ['$product.price', '$products.quantity'],
                    },
                },
                totalProducts: { $sum: '$products.quantity' },
            },
        },
    ]);

    console.log('Aggregation result:', result);

    if (result.length > 0) {
        console.log('Total Product Amount:', result[0].totalProductAmount);
        console.log('Total Products:', result[0].totalProducts);

        return {
            totalProductAmount: result[0].totalProductAmount,
            totalProducts: result[0].totalProducts
        };
    } else {
        console.log('No results found.');
        return { totalProductAmount: 0, totalProducts: 0 };
    }
};

function formatCurrency(amount, currencyCode = 'INR') {
    const numericAmount = Number(amount);

    if (isNaN(numericAmount)) {
        throw new Error('Invalid amount. Must be a number.');
    }

    // Round the amount to avoid formatting issues with floating-point numbers
    const roundedAmount = Math.round(numericAmount * 100) / 100;

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
    }).format(roundedAmount);
}

async function orderDisplay(req, res) {
    const orderId = req.params.orderId;

    res.render('user/orderplaced', { orderId });

}
async function paymentFailed(req, res) {

    res.render('user/paymentfailed');

}
async function invoiceDownload(req, res) {
    const userId = req.session.currentUserId;
    const orderId = req.params.orderId;
    const order = await Order.findOne({ '_id': orderId });
    const Userdetails = await User.findOne({ _id: userId });
    console.log(order);
    console.log(Userdetails);
    res.render('user/invoice', { order, Userdetails, formatCurrency });
}
const findUser = async (matchCriteria) => {

    const orders = await Order.aggregate([
        {
            $match: matchCriteria
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                "user.name": 1,
            }
        }
    ]);

    console.log(orders);

    if (orders.length > 0) {
        const username = orders[0].user.name;
        return { username };
    } else {
        console.log('No orders found for the user');
    }
};



async function getOrderList(req, res) {
    try {
        const user = req.session.currentUserId;
        const page = parseInt(req.query.page) || 1; // Get the page from query parameters, default to 1 if not provided
        const perPage = 10; // Number of orders per page

        const ordersCount = await Order.countDocuments({ userId: user });
        const totalPages = Math.ceil(ordersCount / perPage);

        let order = await Order.find({ userId: user }).populate({path: 'products.categorieId',select: 'name'}).populate({ path: 'products.brandId',select: 'name'})
            .sort({ date: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        if (order && order.length > 0) {
            let { username } = await findUser({ userId: new ObjectId(user) });
            console.log(username);

            return res.render('user/userorders', {
                data: order,
                formatCurrency,
                username,
                currentPage: page,
                totalPages: totalPages
            });
        } else {
            res.send('No orders found...');
            console.log('No orders found...');
        }
    } catch (error) {
        console.log('Something went wrong at /orders GET');
        console.log(error);
    }
}



async function orderCancel(req, res) {
    try {
        const orderId = req.params.id;
        const ordercancelled = await Order.updateOne({ _id: orderId }, { $set: { 'status': 'Cancelled' } });

        if (ordercancelled) {
            const ordercancel = await Order.findOneAndUpdate({ _id: orderId }, { $set: { 'isCancelled': true } });
            const order = await Order.findOne({ _id: orderId });
            console.log(ordercancel);
            console.log('Order cancelled');

            if (order.status === 'PLACED' && order.paymentMethod !== 'COD') {
                await Order.findOneAndUpdate({ '_id': orderId }, { $set: { 'refund': true } })
            }
            res.status(200).json({ success: true, message: 'Order successfully cancelled', status: order.status });

        }
    } catch (error) {
        console.log(error);
    }
}

async function ReturnOrder(req, res) {
    try {
        const orderId = req.params.id;
        const Returnproduct = await Order.updateOne({ _id: orderId }, { $set: { 'status': 'RETURN' } });

        if (Returnproduct) {
            const order = await Order.findOne({ _id: orderId });
            console.log(order);
            console.log('Order cancelled');

            if (order.status === 'PLACED' && order.paymentMethod !== 'COD') {
                await Order.findOneAndUpdate({ '_id': orderId }, { $set: { 'refund': true } })
            }
            res.status(200).json({ success: true, message: 'order returned successfully', status: order.status });

        }
    } catch (error) {
        console.log(error);
    }
}



async function orderDetailsPage(req, res) {
    try {
        console.log(req.params.id);
        const orderId = req.params.id;
        const order = await Order.findOne({ '_id': orderId }).populate({path: 'products.categorieId',select: 'name'}).populate({ path: 'products.brandId',select: 'name'});
        let currentdate = Date.now()
        console.log(currentdate)

        console.log(order);
        return res.render('user/vieworderdetails', { data: order, formatCurrency, currentdate });


    } catch (error) {
        console.log(error);
    }
}







var instance = new Razorpay({
    key_id: 'rzp_test_ru8DhyGiqGowUh',
    key_secret: 'iZ43hClhkulSjqAMxvq3IvyR',
});






async function orderPendingPayment(req, res) {
    try {
        const orderId=req.params.id
        const order = await Order.findOne({ _id: orderId });
        const amount=order.totalAmount
        console.log(amount)
        var options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: '' + orderId
        };
        instance.orders.create(options, function (err, order) {

            if (err) {
                console.error('Razorpay payment processing error:', err);
                return res.status(500).json({ success: false, message: 'Order placement failed. Please try again later.' });
            }
            const razorpayResponse = {
                success: true,
                message: 'Razorpay order created successfully.',
                orderId,
                amount,
                order: order,
            };


            return res.json(razorpayResponse);

        });
    } catch (error) {
        console.log(error)
    }
}
async function verifyPendingPayment(req, res) {
    // const userId = new ObjectId(req.session.currentUserId);

    const data = req.body;
    console.log(data);
    const paymentData = data.payment;
    const orderId = data.order.receipt;
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'iZ43hClhkulSjqAMxvq3IvyR');

    // Reconstruct the string to calculate the HMAC
    const concatenatedString = paymentData.razorpay_order_id + '|' + paymentData.razorpay_payment_id;

    hmac.update(concatenatedString);
    const calculatedHmac = hmac.digest('hex');

    if (calculatedHmac === paymentData.razorpay_signature) {
        const changestatus = await Order.updateOne(
            { _id: orderId },
            { $set: { 'status': 'PLACED' } },


        )
        await Order.updateOne(
            { _id: orderId },
            { $set: { 'paymentstatus': 'COMPLETED' } },


        ).catch(error => {
            console.error('Error updating the order:', error);
        });
        console.log(changestatus);
        console.log('payment successfull');
        return res.json({ status: true});



    } else {
        return res.json({ status: false });
    }
}



module.exports = {
    orderDisplay,
    invoiceDownload,
    getOrderList,
    orderCancel,
    orderDetailsPage,
    paymentFailed,
    ReturnOrder,
    orderPendingPayment,
    verifyPendingPayment


};
