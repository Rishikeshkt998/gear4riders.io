const Product = require('../models/product');
const Cart = require('../models/cart');
const Address = require('../models/address');
const User = require('../models/user');
const Order = require('../models/order');
const userOtpVerification = require('../models/otp');
const Coupon = require('../models/coupon');
const notifier = require('node-notifier');
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const bcrypt = require('bcrypt');
const Razorpay = require('razorpay');
const slugify = require('slugify');
const { response } = require('express');
const { truncateSync } = require('fs');
const { validationResult } = require('express-validator');
const localStorage = require("localStorage")



var instance = new Razorpay({
    key_id: 'rzp_test_ru8DhyGiqGowUh',
    key_secret: 'iZ43hClhkulSjqAMxvq3IvyR',
});


//cart
async function getCart(req, res) {
    try {
        const userid = req.session.currentUserId;
        const userId = new ObjectId(userid);

        const carts = await Cart.find({ userId: userId })
            .populate({
                path: 'products.productId',
                select: 'name price image description countInStock quantity discount',
            });
        let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });

        return res.render('user/cart.ejs', { carts, totalAmount, totalProducts }); // Include totalAmount here



    } catch (error) {
        console.log(`the error is: ${error}`);

    }
}

async function postCart(req, res) {
    const { productId, image, name, price, discount } = req.params;
    const userId = req.session.currentUserId;
    const quantity = 1;

    try {
        const userCart = await Cart.findOne({ userId: userId });

        if (userCart) {

            const existingProduct = userCart.products.find(product => product.productId.toString() === productId);

            if (existingProduct) {

                existingProduct.quantity += quantity;
            } else {
                const discountedPrice = discount
                    ? price - (price * parseFloat(discount) / 100)
                    : price;
                console.log('Price:', price);
                console.log('Discount:', discount);
                console.log('Discounted Price:', discountedPrice);

                userCart.products.push({
                    productId: productId,
                    image: image,
                    name: name,
                    price: discountedPrice,
                    quantity: quantity
                });


            }

            await userCart.save();
            console.log('Product added to the user\'s cart');
        } else {
            const discountedPrice = discount
                ? price - (price * parseFloat(discount) / 100)
                : price;
            console.log('Price:', price);
            console.log('Discount:', discount);
            console.log('Discounted Price:', discountedPrice);

            var newCart = await Cart.create({
                userId: userId,
                products: [{
                    productId: productId,
                    image: image,
                    name: name,
                    price: discountedPrice,
                    quantity: quantity
                }]
            });
            req.session.cartId = newCart._id;
            console.log(newCart);

        }



        res.redirect('/userauth/carts');
    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }
}

async function removeFromCart(req, res) {
    const userId = req.session.currentUserId;
    const productid = req.params.id;

    try {
        const userCart = await Cart.findOne({ userId: userId });

        if (userCart) {

            const productIndex = userCart.products.findIndex(product => product.productId.toString() === productid);




            if (productIndex !== -1) {

                userCart.products.splice(productIndex, 1);
                await userCart.save();
                console.log('Product removed from the user\'s cart');
            }
        }
        await Product.findByIdAndUpdate(productid, { $set: { cart: false } });


        res.redirect('/userauth/carts');
    } catch (error) {
        console.error(`error: ${error}`);
    }
}

async function incrementQuantity(req, res) {

    try {
        const productid = new ObjectId(req.params.id);
        const userId = new ObjectId(req.session.currentUserId);

        if (userId) {
            await Cart.updateOne({ userId, 'products.productId': productid }, { $inc: { 'products.$.quantity': 1 } });
            let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });

            const productcount = await Cart.aggregate(
                [
                    { $match: { 'products.productId': productid } },
                    { $unwind: '$products' },
                    { $match: { 'products.productId': productid } },
                    { $project: { _id: 0, quantity: '$products.quantity' } }
                ]);

            const Quantity = productcount[0].quantity;
            console.log(`Quantity: ${Quantity}`);

            res.json({ success: true, Quantity, totalAmount, totalProducts });
        }
    } catch (error) {
        console.log(`An error occurred while increasing the Quantity: ${error}`);
    }

}


async function decrementQuantity(req, res) {

    try {
        const productid = new ObjectId(req.params.id);
        const userId = new ObjectId(req.session.currentUserId);

        if (userId) {
            await Cart.updateOne({ userId, 'products.productId': productid }, { $inc: { 'products.$.quantity': -1 } });
            let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });

            const productcount = await Cart.aggregate(
                [
                    { $match: { 'products.productId': productid } },
                    { $unwind: '$products' },
                    { $match: { 'products.productId': productid } },
                    { $project: { _id: 0, quantity: '$products.quantity' } }
                ]);

            const Quantity = productcount[0].quantity;
            console.log(`Quantity: ${Quantity}`);

            res.json({ success: true, Quantity, totalAmount, totalProducts });
        }

    } catch (error) {
        console.log(`An error occured while increasing the Quantity...${error}`);
    }
}
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
        return 0; // Return 0 if no results
    }
};
async function addToWhishList(req, res) {
    try {
        const id = req.params.id;
        console.log(id);
        const userId = req.session.currentUserId;
        if (userId) {
            const whishlist = await User.findOneAndUpdate(
                { _id: userId, 'wishlist.productId': { $ne: id } },
                { $push: { wishlist: { productId: id } } },
                { new: true }
            );
            res.json({ success: true, message: 'added successfully' });

        }
    } catch (error) {
        console.log(error);
    }
}
async function removeFromWhishlist(req, res) {
    try {
        const id = req.params.id;
        const userId = req.session.currentUserId;

        if (userId) {
            const updatedUser = await User.findOneAndUpdate(
                { _id: userId },
                { $pull: { wishlist: { productId: id } } },
                { new: true }
            );

            res.redirect('/userauth/wishlist');
        } else {
            res.json({ success: false, message: 'User not authenticated' });
        }
    } catch (error) {
        console.log(error);
    }
}
async function wishListView(req, res) {
    try {
        const userId = req.session.currentUserId
        // const users = await User.findById(userId).populate('wishlist.productId')
        const users = await User.findById(userId).populate({
            path: 'wishlist.productId',
            populate: [
                {
                    path: 'brandId',
                    model: 'brand'
                },
                {
                    path: 'categorieId',
                    model: 'category'
                }
            ]
        });

        console.log('users')
        const wishlist = users.wishlist.sort((a, b) => b.date - a.date)
        console.log(wishlist)
        return res.render('user/whishlist', { wishlist, formatCurrency, generateSlug })
    } catch (error) {
        console.log(error)
    }
}

function generateSlug(str) {
    return str
        .toLowerCase()             // Convert to lowercase
        .replace(/\s+/g, '-')      // Replace spaces with dashes
        .replace(/[^\w-]+/g, '');  // Remove non-word characters (except dashes)
}


function placeOrder(req, res) {
    console.log(req.body);
    res.render('user/error');
}

// function formatCurrency(amount, currencyCode = 'INR') {
//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: currencyCode,
//     }).format(amount);
// }
// function formatCurrency(amount, currencyCode = 'INR') {
//     const numericAmount = Number(amount);

//     if (isNaN(numericAmount)) {
//         throw new Error('Invalid amount. Must be a number.');
//     }
//     const roundedAmount = Math.round(numericAmount * 100) / 100;

//     return new Intl.NumberFormat('en-IN', {
//         style: 'currency',
//         currency: currencyCode,
//     }).format(roundedAmount);
// }
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


//checkout
async function buyNow(req, res) {
    try {
        const id = req.params.id//product id
        const image = req.params.image
        const name = req.params.name
        const price = req.params.price
        const discount = req.params.discount
        const quantity = req.params.quantity
        const discountedPrice = discount
            ? price - (price * parseFloat(discount) / 100)
            : price;

        const userId = req.session.currentUserId
        const productitems = {
            id: id,
            name: name,
            price: price,
            discountprice: discountedPrice,
            image: image,
            discount: discount,
            quantity: quantity
        }

        localStorage.setItem('products', JSON.stringify(productitems))
        if (localStorage.getItem("products")) {
            res.json({ success: true, message: 'product Details successfully added to the localstorrage' })
        } else {
            res.json({ success: false, message: 'Failed to add product Details to localstorrage' })
        }


    } catch (error) {
        console.log(error)
    }
}
async function checkOut(req, res) {
    const userid = req.session.currentUserId;
    const userId = new ObjectId(userid);

    if (userId) {
        const userAddress = await Address.findOne({ userId: userId });
        const cart = await Cart.findOne({ userId: userId })

        if (userAddress && userAddress !== null) {
            var addressList = userAddress.address;
        }
        if (localStorage.getItem("products")) {
            console.log('Buy Now')
            let product = JSON.parse(localStorage.getItem("products"));
            console.log(product)
            const totalAmount = product.discountprice;
            console.log(totalAmount)
            const totalProducts = 1;
            return res.render('user/checkout', { addressList, totalAmount, totalProducts, formatCurrency, errors: '', invalid: '' })
        } else {
            console.log('no local storage')
        }
        if (cart && cart !== null && cart !== undefined && cart.products.length !== 0) {
            if (localStorage.getItem("products")) {
                localStorage.removeItem("products");
            }
            let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });

            res.render('user/checkout', { addressList, totalAmount, totalProducts, formatCurrency, errors: '', invalid: '' });
        } else {
            console.log('Cart is empty')
            return res.redirect('/carts')
        }



    } else {
        console.log('not userid');
        return res.redirect('/users/login');
    }
}
async function displayAddress(req, res) {
    try {
        res.render('user/addaddress', { errors: '', invalid: '' });

    } catch (error) {
        console.log(`Error at address get...${error}`);
    }
}
async function saveAddress(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return res.render('user/addaddress', { errors: errors.mapped(), invalid: '' });
    }
    const userId = req.session.currentUserId;
    try {
        const existingAddress = await Address.findOne({ userId: userId });

        if (existingAddress) {
            const updatedData = {
                name: req.body.name,
                fulladdress: req.body.fulladdress,
                pincode: req.body.pincode,
                landmark: req.body.landmark,
                district: req.body.district,
                state: req.body.state,
                phone: req.body.phone,
                alternatephone: req.body.alternatephone,
            };

            existingAddress.address.push(updatedData);
            existingAddress.modified_at = new Date();
            await existingAddress.save();

            // res.json({ success: true });
            return res.redirect('/userauth/checkoutpage');
        } else {
            const newAddress = new Address({
                userId: userId,
                address: [
                    {
                        name: req.body.name,
                        fulladdress: req.body.fulladdress,
                        pincode: req.body.pincode,
                        landmark: req.body.landmark,
                        district: req.body.district,
                        state: req.body.state,
                        phone: req.body.phone,
                        alternatephone: req.body.alternatephone,
                    },
                ],
            });

            await newAddress.save();

            // res.json({ success: true });
            return res.redirect('/userauth/checkoutpage');
        }
    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }

}
async function editAddress(req, res) {
    try {

        const userId = req.session.currentUserId;
        const userAddress = await Address.findOne({ userId: userId });
        const { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId })
        var addressList = userAddress.address;
        res.render('user/checkout', { addressList, totalAmount, totalProducts, formatCurrency, errors: '', invalid: '' });

    } catch (error) {
        console.log('Error while updating the address At /users/updateAddress');
    }

}
async function updateAddress(req, res) {
    try {
        const id = req.params.id;
        const data = req.body;
        console.log(data);
        console.log(`id is ${id}  and the data is ${data}`);
        const update = await Address.findOneAndUpdate({ 'address._id': id }, {
            $set: {
                'address.$.name': data.name,
                'address.$.phone': data.phone,
                'address.$.fulladdress': data.fulladdress,
                'address.$.pincode': data.pincode,
                'address.$.district': data.district,
                'address.$.landmark': data.landmark,
                'address.$.alternatephone': data.alternatephone,
            }
        });
        if (update) {
            console.log('successfully updated...');
            res.redirect('/userauth/checkoutpage');
        } else {
            console.log('updation failed..');

        }

    } catch (error) {
        console.log('Error while updating the address At /users/updateAddress');
    }

}

async function removeAddress(req, res) {
    const userId = req.session.currentUserId;
    const addressId = req.params.id;

    try {
        const userAddress = await Address.findOne({ userId: userId });

        if (userAddress) {
            const addressIndex = userAddress.address.findIndex(address => address._id.toString() === addressId);

            if (addressIndex !== -1) {
                userAddress.address.splice(addressIndex, 1);
                userAddress.modified_at = new Date();
                await userAddress.save();
                console.log('Address removed from the user\'s address list');
            }
        } else {
            res.status(404).send('No address found for the user.');
            return;
        }

        res.redirect('/userauth/checkoutpage');
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        res.status(500).send('An error occurred while removing the address.');
    }
}




//paymentpage
async function paymentPage(req, res) {
    try {
        const userid = req.session.currentUserId;
        const userId = new ObjectId(userid);
        const addressId = req.params.addressId;
        const name = req.params.name;
        const fulladdress = req.params.fulladdress;
        const pincode = req.params.pincode;
        const landmark = req.params.landmark;
        const district = req.params.district;
        const state = req.params.state;
        const phone = req.params.phone;
        const alternatephone = req.session.alternatephone;
        req.session.address = {
            addressId: addressId,
            name: name,
            fulladdress: fulladdress,
            pincode: pincode,
            landmark: landmark,
            district: district,
            state: state,
            phone: phone,
            alternatephone: alternatephone
        };

        if (localStorage.getItem("products")) {
            let product = JSON.parse(localStorage.getItem("products"));
            console.log(product)
            const totalAmount = product.discountprice;
            console.log(totalAmount)
            const totalProducts = 1;
            return res.render('user/payment', { totalAmount, totalProducts, formatCurrency })
        } else {
            console.log('no local storage')
        }



        let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });
        console.log('totalamountis' + totalAmount)
        if (req.session.address) {
            if (localStorage.getItem("products")) {
                localStorage.removeItem("products");
            }

            res.render('user/payment', { totalAmount, totalProducts, formatCurrency });
        }
    } catch (error) {
        console.log(error);
    }
}
















//orderpost
async function postOrder(req, res) {
    try {
        const value = req.body.payment;
        const couponname = req.body.couponName;
        let discount = req.body.discountAmount;
        console.log(couponname);
        console.log(discount);
        const user = req.session.currentUserId;
        const { addressId, name, fulladdress, pincode, landmark, district, state, phone, alternatephone } = req.session.address;
        const userId = new ObjectId(user);
        const status = value === 'COD' ? 'PLACED' : 'PENDING';
        const cart = await Cart.findOne({ userId });
        let UserData;
        let orderId;
        const invoiceNumber = generateInvoiceNumber();

        console.log(invoiceNumber);
        if (localStorage.getItem("products")) {
            console.log('Buy Now')
            let product = JSON.parse(localStorage.getItem("products"));
            console.log(product)
            const totalAmount = product.discountprice;
            const productname = product.name
            const productimage = product.image
            const productId = product.id
            const quantity = 1
            if (value === 'COD') {
                const items = {
                    product_id: productId,
                    productname: productname,
                    productprice: totalAmount,
                    productimage: productimage,
                    quantity: quantity,

                };

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    invoicenumber: invoiceNumber,

                    address: {

                        address_id: new ObjectId(addressId),
                        name,
                        fulladdress,
                        pincode,
                        landmark,
                        district,
                        state: state,
                        phone,
                        alternatephone: alternatephone,
                    },
                };


                const newOrder = await Order.create(orderData);
                console.log(newOrder);
                await Cart.deleteOne({ userId });
                delete req.session.address;

                orderId = newOrder._id;
                console.log(orderId);
                await Order.updateOne(
                    { _id: orderId },
                    { $set: { 'paymentstatus': 'PENDING' } })
                if (localStorage.getItem("products")) {
                    localStorage.removeItem("products");
                }
                return res.json({ codSuccess: true, message: 'Order placed successfully...', orderId });



            } else if (value === 'onlinepayment+wallet') {
                UserData = await User.findById(user);
                console.log(UserData.wallet.balance);

                if (!UserData.wallet.balance) {
                    return res.json({ success: false, message: 'Wallet is Empty!' });
                }

                if (UserData.wallet.balance < totalAmount || UserData.wallet.balance < discount) {
                    // Online Payment + Wallet logic here
                    totalAmount = totalAmount - UserData.wallet.balance;
                    await User.findByIdAndUpdate({ _id: user },
                        {
                            $inc: { 'wallet.balance': -UserData.wallet.balance },
                            $push: {
                                'wallet.transactions': {
                                    type: 'credited',
                                    amount: UserData.wallet.balance,
                                    description: 'Amount is deducted from the wallet by the user',
                                    time: Date.now()
                                }
                            }
                        },
                        { new: true, upsert: true });

                    if (discount !== 0) {
                        discount = discount - UserData.wallet.balance;
                        await User.findByIdAndUpdate({ _id: user },
                            {
                                $inc: { 'wallet.balance': -UserData.wallet.balance },
                                $push: {
                                    'wallet.transactions': {
                                        type: 'credited',
                                        amount: UserData.wallet.balance,
                                        description: 'Amount is deducted from the wallet by the user',
                                        time: Date.now()
                                    }
                                }
                            },
                            { new: true, upsert: true });
                    } else {
                        discount = 0;
                    }
                    const items = {
                        product_id: productId,
                        productname: productname,
                        productprice: totalAmount,
                        productimage: productimage,
                        quantity: quantity,

                    };

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        invoicenumber: invoiceNumber,

                        address: {

                            address_id: new ObjectId(addressId),
                            name,
                            fulladdress,
                            pincode,
                            landmark,
                            district,
                            state: state,
                            phone,
                            alternatephone: alternatephone,
                        },
                    };



                    const newOrder = await Order.create(orderData);
                    console.log(newOrder);

                    await Cart.deleteOne({ userId });
                    delete req.session.address;

                    orderId = newOrder._id;
                    console.log(orderId);

                    console.log(totalAmount);
                    console.log(discount);
                    var options = {
                        amount: discount * 100 || totalAmount * 100,
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
                            totalAmount,
                            order: order, // Include the Razorpay order data
                        };


                        return res.json(razorpayResponse);

                    });


                } else {
                    const items = {
                        product_id: productId,
                        productname: productname,
                        productprice: totalAmount,
                        productimage: productimage,
                        quantity: quantity,

                    };

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        invoicenumber: invoiceNumber,

                        address: {

                            address_id: new ObjectId(addressId),
                            name,
                            fulladdress,
                            pincode,
                            landmark,
                            district,
                            state: state,
                            phone,
                            alternatephone: alternatephone,
                        },
                    };

                    const newOrder = await Order.create(orderData);
                    console.log(newOrder);

                    await Cart.deleteOne({ userId });
                    delete req.session.address;
                    UserData = await User.findById(user);
                    if (UserData.wallet.balance >= totalAmount || UserData.wallet.balance >= discount) {
                        // Online Payment + Wallet logic here
                        const totalwallet = UserData.wallet.balance - totalAmount;
                        await User.findByIdAndUpdate({ _id: user },
                            {
                                $inc: { 'wallet.balance': -totalAmount },
                                $push: {
                                    'wallet.transactions': {
                                        type: 'credited',
                                        amount: totalAmount,
                                        description: 'Amount is deducted from the wallet by the user',
                                        time: Date.now()
                                    }
                                }
                            },);

                        if (discount !== 0) {
                            totaldiscountwallet = UserData.wallet.balance - discount;
                            await User.findByIdAndUpdate({ _id: user },
                                {
                                    $inc: { 'wallet.balance': -discount },
                                    $push: {
                                        'wallet.transactions': {
                                            type: 'credited',
                                            amount: discount,
                                            description: 'Amount is deducted from the wallet by the user',
                                            time: Date.now()
                                        }
                                    }
                                },);
                        }
                    }

                    orderId = newOrder._id;
                    console.log(orderId);
                    const changestatus = await Order.updateOne(
                        { _id: orderId },
                        { $set: { 'status': 'PLACED' } },)
                    await Order.updateOne(
                        { _id: orderId },
                        { $set: { 'paymentstatus': 'COMPLETED' } }),
                        console.log(changestatus)
                    return res.json({ codSuccess: true, message: 'Order placed successfully...', orderId });

                }
            } else if (value === 'onlinepayment') {
                const items = {
                    product_id: productId,
                    productname: productname,
                    productprice: totalAmount,
                    productimage: productimage,
                    quantity: quantity,

                };

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    invoicenumber: invoiceNumber,

                    address: {

                        address_id: new ObjectId(addressId),
                        name,
                        fulladdress,
                        pincode,
                        landmark,
                        district,
                        state: state,
                        phone,
                        alternatephone: alternatephone,
                    },
                };



                const newOrder = await Order.create(orderData);
                console.log(newOrder);

                await Cart.deleteOne({ userId });
                delete req.session.address;

                orderId = newOrder._id;
                console.log(orderId);
                var options = {
                    amount: discount * 100 || totalAmount * 100,
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
                        totalAmount,
                        order: order,
                    };


                    return res.json(razorpayResponse);

                });


            } else {
                return res.json({ success: false, message: 'Invalid payment method.' });
            }
        }

        else if (cart && cart.products.length > 0) {
            let { totalAmount } = await calculateTotalAmount({ userId });
            if (value === 'COD') {
                const items = cart.products.map(product => ({
                    product_id: product.productId,
                    productname: product.name,
                    productprice: product.price,
                    productimage: product.image,
                    quantity: product.quantity,

                }));

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    invoicenumber: invoiceNumber,

                    address: {

                        address_id: new ObjectId(addressId),
                        name,
                        fulladdress,
                        pincode,
                        landmark,
                        district,
                        state: state,
                        phone,
                        alternatephone: alternatephone,
                    },
                };


                const newOrder = await Order.create(orderData);
                console.log(newOrder);
                await Cart.deleteOne({ userId });
                delete req.session.address;

                orderId = newOrder._id;
                console.log(orderId);
                await Order.updateOne(
                    { _id: orderId },
                    { $set: { 'paymentstatus': 'PENDING' } })
                return res.json({ codSuccess: true, message: 'Order placed successfully...', orderId });


            } else if (value === 'onlinepayment+wallet') {
                UserData = await User.findById(user);
                console.log(UserData.wallet.balance);

                if (!UserData.wallet.balance) {
                    return res.json({ success: false, message: 'Wallet is Empty!' });
                }

                if (UserData.wallet.balance < totalAmount || UserData.wallet.balance < discount) {
                    // Online Payment + Wallet logic here
                    totalAmount = totalAmount - UserData.wallet.balance;
                    await User.findByIdAndUpdate({ _id: user },
                        {
                            $inc: { 'wallet.balance': -UserData.wallet.balance },
                            $push: {
                                'wallet.transactions': {
                                    type: 'credited',
                                    amount: UserData.wallet.balance,
                                    description: 'Amount is deducted from the wallet by the user',
                                    time: Date.now()
                                }
                            }
                        },
                        { new: true, upsert: true });

                    if (discount !== 0) {
                        discount = discount - UserData.wallet.balance;
                        await User.findByIdAndUpdate({ _id: user },
                            {
                                $inc: { 'wallet.balance': -UserData.wallet.balance },
                                $push: {
                                    'wallet.transactions': {
                                        type: 'credited',
                                        amount: UserData.wallet.balance,
                                        description: 'Amount is deducted from the wallet by the user',
                                        time: Date.now()
                                    }
                                }
                            },
                            { new: true, upsert: true });
                    } else {
                        discount = 0;
                    }
                    const items = cart.products.map(product => ({
                        product_id: product.productId,
                        productname: product.name,
                        productprice: product.price,
                        productimage: product.image,
                        quantity: product.quantity,

                    }));

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        invoicenumber: invoiceNumber,

                        address: {

                            address_id: new ObjectId(addressId),
                            name,
                            fulladdress,
                            pincode,
                            landmark,
                            district,
                            state: state,
                            phone,
                            alternatephone: alternatephone,
                        },
                    };


                    const newOrder = await Order.create(orderData);
                    console.log(newOrder);

                    await Cart.deleteOne({ userId });
                    delete req.session.address;

                    orderId = newOrder._id;
                    console.log(orderId);

                    console.log(totalAmount);
                    console.log(discount);
                    var options = {
                        amount: discount * 100 || totalAmount * 100,
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
                            totalAmount,
                            order: order, // Include the Razorpay order data
                        };


                        return res.json(razorpayResponse);

                    });


                } else {
                    const items = cart.products.map(product => ({
                        product_id: product.productId,
                        productname: product.name,
                        productprice: product.price,
                        productimage: product.image,
                        quantity: product.quantity,

                    }));

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        invoicenumber: invoiceNumber,

                        address: {

                            address_id: new ObjectId(addressId),
                            name,
                            fulladdress,
                            pincode,
                            landmark,
                            district,
                            state: state,
                            phone,
                            alternatephone: alternatephone,
                        },
                    };
                    const newOrder = await Order.create(orderData);
                    console.log(newOrder);

                    await Cart.deleteOne({ userId });
                    delete req.session.address;
                    UserData = await User.findById(user);
                    if (UserData.wallet.balance >= totalAmount || UserData.wallet.balance >= discount) {
                        // Online Payment + Wallet logic here
                        const totalwallet = UserData.wallet.balance - totalAmount;
                        await User.findByIdAndUpdate({ _id: user },
                            {
                                $inc: { 'wallet.balance': -totalAmount },
                                $push: {
                                    'wallet.transactions': {
                                        type: 'credited',
                                        amount: totalAmount,
                                        description: 'Amount is deducted from the wallet by the user',
                                        time: Date.now()
                                    }
                                }
                            },);

                        if (discount !== 0) {
                            totaldiscountwallet = UserData.wallet.balance - discount;
                            await User.findByIdAndUpdate({ _id: user },
                                {
                                    $inc: { 'wallet.balance': -discount },
                                    $push: {
                                        'wallet.transactions': {
                                            type: 'credited',
                                            amount: discount,
                                            description: 'Amount is deducted from the wallet by the user',
                                            time: Date.now()
                                        }
                                    }
                                },);
                        }
                    }

                    orderId = newOrder._id;
                    console.log(orderId);
                    const changestatus = await Order.updateOne(
                        { _id: orderId },
                        { $set: { 'status': 'PLACED' } },)
                    await Order.updateOne(
                        { _id: orderId },
                        { $set: { 'paymentstatus': 'COMPLETED' } }),
                        console.log(changestatus)
                    return res.json({ codSuccess: true, message: 'Order placed successfully...', orderId });

                }
            } else if (value === 'onlinepayment') {
                const items = cart.products.map(product => ({
                    product_id: product.productId,
                    productname: product.name,
                    productprice: product.price,
                    productimage: product.image,
                    quantity: product.quantity,

                }));

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    invoicenumber: invoiceNumber,

                    address: {

                        address_id: new ObjectId(addressId),
                        name,
                        fulladdress,
                        pincode,
                        landmark,
                        district,
                        state: state,
                        phone,
                        alternatephone: alternatephone,
                    },
                };


                const newOrder = await Order.create(orderData);
                console.log(newOrder);

                await Cart.deleteOne({ userId });
                delete req.session.address;

                orderId = newOrder._id;
                console.log(orderId);
                var options = {
                    amount: discount * 100 || totalAmount * 100,
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
                        totalAmount,
                        order: order,
                    };


                    return res.json(razorpayResponse);

                });


            } else {
                return res.json({ success: false, message: 'Invalid payment method.' });
            }
        } else {
            console.log('No items in the cart');
            return res.json({ success: false, message: 'No items in the cart.' });
        }
    } catch (error) {
        console.log('An error occurred at /order POST: ' + error);
        return res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
}











function generateInvoiceNumber() {
    const timestamp = new Date().getTime();
    const sequentialNumber = Math.floor(Math.random() * 10000);
    const invoiceNumber = `INV-${timestamp}-${sequentialNumber}`;

    return invoiceNumber;
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

        // if (walletAmount) {
        //     let walletamount = walletAmount.wallet;
        //     return res.json({ success: true, message: 'Amouont added successfully.', walletamount });
        // } else {
        //     return res.json({ success: false, message: 'Amount Failed to add to the wallet...' });
        // }
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


async function couponControl(req, res) {
    try {
        const { couponCode } = req.query;
        const userId = new ObjectId(req.session.currentUserId);
        const coupon = await Coupon.findOne({ name: couponCode });
        const { totalAmount } = await calculateTotalAmount({ userId });
        if (!coupon) {
            return res.json({ valid: false, message: 'Invalid coupon code.' });
        }
        if (coupon.expired_at <= new Date()) {
            return res.json({ valid: false, message: 'Coupon has expired.' });
        }
        if (coupon.maximum_usage > 0 && coupon.usage_count >= coupon.maximum_usage) {
            return res.json({ valid: false, message: 'Coupon usage limit reached.' });
        }

        coupon.usage_count += 1;
        await coupon.save();
        const couponName = coupon.name;
        const discountAmount = coupon.amount;
        const totalDiscountedAmount = totalAmount - discountAmount;
        return res.json({ valid: true, message: 'Coupon is valid.', discountAmount, totalAmount, totalDiscountedAmount, couponName });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }


}
async function verifyOnlinePayment(req, res) {
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
        if (localStorage.getItem("products")) {
            localStorage.removeItem("products");
        }
        return res.json({ status: true, orderId });



    } else {
        return res.json({ status: false });
    }
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
async function getOrderList(req, res) {
    try {
        const user = req.session.currentUserId;
        console.log(`user id is ${user}`);
        const orders = await Order.find({ userId: user })
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));


        if (orders && orders.length > 0) {
            return res.render('user/userorders', { data: orders ,formatCurrency});
        } else {
            res.send('No orders found...');
            console.log('No orders found...');
        }
    } catch (error) {
        console.log('Something went wrong at /orders GET');
        console.log(error);
        res.status(500).send('Internal Server Error');
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



async function orderDetailsPage(req, res) {
    try {
        console.log(req.params.id);
        const orderId = req.params.id;
        const order = await Order.findOne({ '_id': orderId });


        console.log(order);
        return res.render('user/vieworderdetails', { data: order ,formatCurrency});


    } catch (error) {
        console.log(error);
    }
}




//userprofile
async function getUserprofile(req, res) {
    try {
        const userId = req.session.currentUserId;
        const UserData = await User.findOne({ _id: userId });
        console.log(UserData);
        res.render('user/userprofilepage', { UserData });

    } catch (error) {
        console.log('can\'t profile details');
    }
}
async function updateUserProfile(req, res) {
    try {
        const id = req.params.id;

        const user = await User.findOne({ _id: id });


        user.name = req.body.name;
        user.address = req.body.address;
        user.phone = req.body.phone;

        await user.save();


        res.redirect('/userauth/userprofilepage');
    } catch (error) {
        console.error('Error updating user profile:', error);

        res.status(500).send('Unable to update profile. Please try again later.');
    }
}




async function updateUserEmail(req, res) {
    try {
        const email = req.params.email;
        const isEmail = await User.findOne({ email: email });
        console.log(`there are ${isEmail} numbers`);
        if (!isEmail) {
            const updated = await User.findByIdAndUpdate(req.session.currentUserId, { $set: { email: email } });
            console.log(`updatedddd   is ${updated}`);
            await User.findByIdAndUpdate(req.session.currentUserId, { $set: { verified: false } });
            await sendOtpVerificationEmail(updated, req, res).then((result) => {
                try {
                    console.log('otp has been sent to your Email');
                    console.log(result);
                    return res.json({ success: true, message: 'Otp has been sent to your Email address.' });
                } catch (error) {
                    console.log(error);
                }

            });
        } else {
            console.log('You provided Email is already been using ...');
            return res.json({ success: false, message: 'You provided Email is already using!' });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: 'Unknown Error' });
    }
}


function userEmailOtp(req, res) {
    res.render('user/useremailotp');

}


async function userVerifyOtp(req, res) {
    try {
        let otp = req.body.otp;
        let userId = req.session.uesrid;
        console.log(`userId: ${userId} and otp: ${otp}`);
        if (!userId || !otp) {
            return res.render('user/useremailotp',);
        } else {
            const userOtpVerificationRecords = await userOtpVerification.find({ userId });
            if (userOtpVerificationRecords.length <= 0) {
                return res.render('user/useremailotp');

            } else {
                const { expired_at } = userOtpVerificationRecords[0];
                const hashedOtp = userOtpVerificationRecords[0].otp;
                if (expired_at < Date.now()) {
                    await userOtpVerification.deleteMany({ userId });
                    return res.render('user/useremailotp');
                } else {
                    const validOtp = await bcrypt.compare(otp, hashedOtp);
                    console.log((validOtp));

                    if (!validOtp) {
                        return res.render('user/useremailotp');
                    } else {
                        await User.updateOne({ _id: userId }, { verified: true });
                        await userOtpVerification.deleteMany({ userId });
                        notifier.notify({
                            title: 'Notifications',
                            message: 'Email Verified successfully ',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });
                        return res.redirect('/userauth/userprofilepage');
                    }
                }
            }
        }
    } catch (error) {
        delete req.session.uesrid;
        return res.render('user/useremailotp');
    }
}











async function getAddressBook(req, res) {
    const userid = req.session.currentUserId;
    const userId = new ObjectId(userid);
    if (userId) {
        const userAddress = await Address.findOne({ userId: userId });

        if (userAddress && userAddress !== null) {
            var addressList = userAddress.address;
        }
        res.render('user/useraddress', { addressList });

    } else {
        console.log('not userid');
        return res.redirect('/users/login');
    }
}
async function addAddressBook(req, res) {
    try {
        res.render('user/addressbookadd', { errors: '', invalid: '' });

    } catch (error) {
        console.log(`Error at address get...${error}`);
    }

}


async function userProfileAddressSave(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return res.render('user/addressbookadd', { errors: errors.mapped(), invalid: '' });
    }
    const userId = req.session.currentUserId;
    try {
        const existingAddress = await Address.findOne({ userId: userId });

        if (existingAddress) {

            const updatedData = {
                name: req.body.name,
                fulladdress: req.body.fulladdress,
                pincode: req.body.pincode,
                landmark: req.body.landmark,
                district: req.body.district,
                state: req.body.state,
                phone: req.body.phone,
                alternatephone: req.body.alternatephone,
            };

            existingAddress.address.push(updatedData);
            existingAddress.modified_at = new Date();
            await existingAddress.save();

            res.redirect('/userauth/getaddressbook');
        } else {
            const newAddress = new Address({
                userId: userId,
                address: [
                    {
                        name: req.body.name,
                        fulladdress: req.body.fulladdress,
                        pincode: req.body.pincode,
                        landmark: req.body.landmark,
                        district: req.body.district,
                        state: req.body.state,
                        phone: req.body.phone,
                        alternatephone: req.body.alternatephone,
                    },
                ],
            });

            await newAddress.save();

            res.redirect('/userauth/getaddressbook');
        }
    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }

}
async function updateAddressBook(req, res) {
    try {
        const id = req.params.id;
        const data = req.body;
        console.log(data);
        console.log(`id is ${id}  and the data is ${data}`);
        const update = await Address.findOneAndUpdate({ 'address._id': id }, {
            $set: {
                'address.$.name': data.name,
                'address.$.phone': data.phone,
                'address.$.fulladdress': data.fulladdress,
                'address.$.pincode': data.pincode,
                'address.$.district': data.district,
                'address.$.landmark': data.landmark,
                'address.$.alternatephone': data.alternatephone,
            }
        });
        if (update) {
            console.log('successfully updated...');
            res.redirect('/userauth/getaddressbook');
        } else {
            console.log('updation failed..');

        }

    } catch (error) {
        console.log('Error while updating the address At /users/updateAddress');
    }
}

async function removeAddressBook(req, res) {
    const userId = req.session.currentUserId;
    const addressId = req.params.id;

    try {
        const userAddress = await Address.findOne({ userId: userId });

        if (userAddress) {

            const addressIndex = userAddress.address.findIndex(address => address._id.toString() === addressId);

            if (addressIndex !== -1) {

                userAddress.address.splice(addressIndex, 1);
                userAddress.modified_at = new Date();
                await userAddress.save();
                console.log('Address removed from the user\'s address list');
            }
        } else {

            res.status(404).send('No address found for the user.');
            return;
        }

        res.redirect('/userauth/getaddressbook');
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        res.status(500).send('An error occurred while removing the address.');
    }
}

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});
const sendOtpVerificationEmail = async ({ _id, email }, req, res) => {
    console.log('Entered into the function.');
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;


        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: 'Email verification',
            html: `<p>Enter <b>${otp}</b> in the app to verify your email address.</p>
            <p>This code will <b>Expires in one hour</b></p>`
        };

        const saltrounds = 10;
        req.session.emailAddress = email;
        req.session.uesrid = _id;
        console.log(`your Email is ${req.session.emailAddress} and User id is ${req.session.uesrid}`);
        const hashedOtp = await bcrypt.hash(otp, saltrounds);
        const newOtpVerification = await new userOtpVerification({
            userId: _id,
            otp: hashedOtp,
            created_at: Date.now(),
            expired_at: Date.now() + 3600000,
        });

        await newOtpVerification.save();
        await transporter.sendMail(mailOptions, (err, res) => {
            if (err) {
                console.log(err);
                console.log('unknown error ');
                return res.json({ success: false, message: 'Unknown Error.error' });
            } else {
                console.log('otp successfull');
                notifier.notify({
                    title: 'Notifications',
                    message: 'OTP has send to your Email address. please check your Inbox. ',
                    icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                    sound: true,
                    wait: true
                });
            }
        });

    } catch (error) {
        console.log(error);
        console.log('Error is at Catch ');
        return res.json({ success: false, message: 'Unknown Error.' });

    }
};
async function temp(req, res) {
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

function userLogout(req, res) {
    try {
        delete req.session.userlogin;
        res.redirect('/login');
    } catch (err) {
        res.send(err);
        console.log('An Error occured logging out...' + err);
    }
}

module.exports = {
    getCart,
    postCart,
    userLogout,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    placeOrder,
    saveAddress,
    checkOut,
    removeAddress,
    displayAddress,
    editAddress,
    updateAddress,
    getUserprofile,
    paymentPage,
    postOrder,
    couponControl,
    verifyOnlinePayment,
    orderDisplay,
    invoiceDownload,
    getOrderList,
    orderCancel,
    getAddressBook,
    orderDetailsPage,
    userProfileAddressSave,
    updateAddressBook,
    removeAddressBook,
    updateUserProfile,
    userEmailOtp,
    userVerifyOtp,
    updateUserEmail,
    paymentFailed,
    addToWhishList,
    wishListView,
    addToWallet,
    temp,
    verifyWalletPayment,
    addAddressBook,
    removeFromWhishlist,
    buyNow


};
