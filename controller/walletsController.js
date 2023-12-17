
const User = require('../models/user');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Razorpay = require('razorpay');

const localStorage = require('localStorage')

var instance = new Razorpay({
    key_id: 'rzp_test_ru8DhyGiqGowUh',
    key_secret: 'iZ43hClhkulSjqAMxvq3IvyR',
});

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

async function WalletView(req, res) {
    try {
        const userId = req.session.currentUserId
        const id = new ObjectId(userId)
        const userwallet = await User.findById(userId, { _id: 0, wallet: 1 })
        const balance = userwallet.wallet.balance
        const wallet = await User.aggregate([
            { $match: { _id: id } },
            { $unwind: "$wallet.transactions" },
            { $sort: { "wallet.transactions.time": -1 } },
            {
                $group: {
                    _id: "$_id",
                    wallet: { $push: "$wallet.transactions" }
                }
            },
            { $project: { _id: 0, wallet: 1 } }
        ])

        res.render('user/wallet', { wallet, balance, formatCurrency });
    } catch (error) {
        console.log(error)
    }

}


async function addToWallet(req, res) {
    try {
        const amount = req.body.amount
        console.log(amount)
        const { v4: uuidv4 } = require('uuid');
        const uniquefield = uuidv4()
        const uniqueid = `${uniquefield.substring(0, 15)}`
        var options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: '' + uniqueid
        };
        instance.orders.create(options, function (err, order) {

            if (err) {
                console.error('Razorpay payment processing error:', err);
                return res.status(500).json({ success: false, message: 'Order placement failed. Please try again later.' });
            }
            const razorpayResponse = {
                success: true,
                message: 'Razorpay order created successfully.',
                uniqueid,
                amount,
                order: order,
                uniqueid
            };


            return res.json(razorpayResponse);

        });
    } catch (error) {
        console.log(error)
    }
}
async function verifyWalletPayment(req, res) {
    // const userId = new ObjectId(req.session.currentUserId);

    const data = req.body;
    console.log(data);
    const paymentData = data.payment;
    console.log(paymentData)
    const orderId = data.order.receipt;
    const Amount = data.order.amount / 100;
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', 'iZ43hClhkulSjqAMxvq3IvyR');

    // Reconstruct the string to calculate the HMAC
    const concatenatedString = paymentData.razorpay_order_id + '|' + paymentData.razorpay_payment_id;

    hmac.update(concatenatedString);
    const calculatedHmac = hmac.digest('hex');

    if (calculatedHmac === paymentData.razorpay_signature) {
        const userId = req.session.currentUserId
        const walletAmount = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { 'wallet.balance': Amount },
                $push: {
                    'wallet.transactions': {
                        type: 'debited',
                        amount: Amount,
                        description: 'Amount is added to wallet by the user',
                        time: Date.now()
                    }
                }
            },
            { new: true, upsert: true }
        )
        let walletamount = walletAmount.wallet;

        return res.json({ status: true, orderId, walletamount });



    } else {
        return res.json({ status: false });
    }
}



module.exports = {
    addToWallet,
    WalletView,
    verifyWalletPayment,

};

