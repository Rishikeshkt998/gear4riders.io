const Product = require('../models/product');
const Cart = require('../models/cart');
const User = require('../models/user');
const Order = require('../models/order');
const Coupon = require('../models/coupon');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Razorpay = require('razorpay');
const localStorage = require('localStorage')



var instance = new Razorpay({
    key_id: 'rzp_test_ru8DhyGiqGowUh',
    key_secret: 'iZ43hClhkulSjqAMxvq3IvyR',
});



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
        return { totalAmount:0, totalProducts:0 }; // Return 0 if no results
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


function placeOrder(req, res) {
    console.log(req.body);
    res.render('user/error');
}


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




async function couponName() {
    try {
        const currentDate = new Date();

        const couponNames = await Coupon.aggregate([
            {
                $match: {
                    created_at: { $lt: currentDate },
                    expired_at: { $gt: currentDate }
                }
            },
            {
                $sort: { created_at: -1 }
            },
            {
                $group: {
                    _id: '$name',
                    maxExpiredAt: { $max: '$expired_at' }
                }
            },
            {
                $match: {
                    maxExpiredAt: { $gt: currentDate }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id'
                }
            }
        ]);


        return couponNames.map(coupon => coupon.name);
    } catch (error) {
        console.log(error);
        throw error;
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
        let couponNames = await couponName();

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
            const totalProductAmount=product.price
            console.log(totalAmount)
            const totalProducts = 1;
            return res.render('user/payment', { totalAmount, totalProducts,totalProductAmount, formatCurrency, couponNames })
        } else {
            console.log('no local storage')
        }



        let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });
        let { totalProductAmount} = await calculateProductAmount({ userId: userId });

        console.log('totalamountis' + totalAmount)
        if (req.session.address) {
            if (localStorage.getItem("products")) {
                localStorage.removeItem("products");
            }

            res.render('user/payment', { totalAmount, totalProducts,totalProductAmount, formatCurrency, couponNames });
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
        const paymentstatus='PENDING';
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
            const brandId = product.brandId
            const categorieId = product.categorieId
            const quantity = 1
            if (value === 'COD') {

                await Product.findByIdAndUpdate(productId, { $inc: { countInStock: -1 } })
                const items = {
                    product_id: productId,
                    productname: productname,
                    productprice: totalAmount,
                    productimage: productimage,
                    quantity: quantity,
                    brandId: brandId,
                    categorieId: categorieId

                };

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    paymentstatus:paymentstatus,
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
                        brandId: brandId,
                        categorieId: categorieId

                    };

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        paymentstatus:paymentstatus,
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
                        brandId: brandId,
                        categorieId: categorieId

                    };

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        paymentstatus:paymentstatus,
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
                    brandId: brandId,
                    categorieId: categorieId

                };

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    paymentstatus:paymentstatus,
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
                cart.products.map(async (product) => {
                    const proid = product.productId;
                    const qty = product.quantity;
                    await Product.findByIdAndUpdate(proid, { $inc: { countInStock: -qty } })
                })
                const items = cart.products.map(product => ({
                    product_id: product.productId,
                    productname: product.name,
                    productprice: product.price,
                    productimage: product.image,
                    quantity: product.quantity,
                    brandId: product.brandId,
                    categorieId: product.categorieId

                }));

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    paymentstatus:paymentstatus,
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
                        brandId: product.brandId,
                        categorieId: product.categorieId

                    }));

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        paymentstatus:paymentstatus,
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
                        brandId: product.brandId,
                        categorieId: product.categorieId

                    }));

                    const orderData = {
                        userId: userId,
                        paymentMethod: value,
                        totalAmount: discount || totalAmount,
                        products: items,
                        couponname: couponname || null,
                        discount: discount || 0,
                        status: status,
                        paymentstatus:paymentstatus,
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
                    brandId: product.brandId,
                    categorieId: product.categorieId

                }));

                const orderData = {
                    userId: userId,
                    paymentMethod: value,
                    totalAmount: discount || totalAmount,
                    products: items,
                    couponname: couponname || null,
                    discount: discount || 0,
                    status: status,
                    paymentstatus:paymentstatus,
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




async function couponControl(req, res) {
    try {
        const { couponCode } = req.query;
        const userId = new ObjectId(req.session.currentUserId);
        const coupon = await Coupon.findOne({ name: couponCode });
        const { totalAmount } = await calculateTotalAmount({ userId });
        const {totalProductAmount}=await calculateProductAmount({ userId });
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
        req.session.coupon=discountAmount
        const totalDiscountedAmount = totalAmount - discountAmount;
        return res.json({ valid: true, message: 'Coupon is valid.', discountAmount, totalAmount,totalProductAmount, totalDiscountedAmount, couponName });
    } catch (error) {
        console.error('Error validating coupon:', error);
    }


}
async function verifyOnlinePayment(req, res) {
    const userId = req.session.currentUserId;

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
            console.log('Buy Now')
            let product = JSON.parse(localStorage.getItem("products"));
            console.log(product)
            const productId = product.id
            await Product.findByIdAndUpdate(productId, { $inc: { countInStock: -1 } })
        } else {
            const order = await Order.findOne({ _id:new ObjectId(orderId) });
            const products = order.products;

            for (const product of products) {
                const proid = product.product_id;
                const qty = product.quantity;

                await Product.findByIdAndUpdate(proid, { $inc: { countInStock: -qty } });
            }
            if (localStorage.getItem("products")) {
                localStorage.removeItem("products");
            }

        }

        return res.json({ status: true, orderId });



    } else {
        return res.json({ status: false });
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
    userLogout,
    placeOrder,
    paymentPage,
    postOrder,
    couponControl,
    verifyOnlinePayment,


};
