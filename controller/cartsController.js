const Product = require('../models/product');
const Cart = require('../models/cart');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const localStorage = require('localStorage')



function generateSlug(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
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

async function getCart(req, res) {
    try {
        const userid = req.session.currentUserId;
        const userId = new ObjectId(userid);
        

        const carts = await Cart.find({ userId: userId })
            .populate({
                path: 'products.productId',
                select: 'name price image description countInStock quantity discount',
            });
            carts.forEach(cart => {
                cart.products = cart.products.filter(product => !product.isDeleted);
            });
        let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });
        let { totalProductAmount } = await calculateProductAmount({ userId: userId });
       
        if (localStorage.getItem("products")) {
            localStorage.removeItem("products");
        }


        return res.render('user/cart.ejs', { carts, totalAmount, totalProducts, totalProductAmount, formatCurrency }); // Include totalAmount here

    

    } catch (error) {
        console.log(`the error is: ${error}`);

    }
}

async function postCart(req, res) {
    const { productId, image, name, price, discount, brandId, categorieId } = req.params;
    console.log(brandId, categorieId)
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
                    quantity: quantity,
                    brandId: brandId,
                    categorieId: categorieId
                });


            }
            console.log(userCart)

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
                    quantity: quantity,
                    brandId: brandId,
                    categorieId: categorieId
                }]
            });
            req.session.cartId = newCart._id;
            console.log(newCart);

        }



        res.redirect('/cart/carts');
   
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


        res.redirect('/cart/carts');
    } catch (error) {
        console.error(`error: ${error}`);
    }
}



async function incrementQuantity(req, res) {
    try {
        const productid = new ObjectId(req.params.id);
        const userId = new ObjectId(req.session.currentUserId);

        if (!userId) {
            return res.json({ success: false, message: 'User not logged in' });
        }

        const productdetails = await Product.findById(productid);

        if (!productdetails) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const stock = productdetails.countInStock;

        const productCount = await Cart.aggregate([
            { $match: { userId, 'products.productId': productid } },
            { $unwind: '$products' },
            { $match: { 'products.productId': productid } },
            { $group: { _id: null, totalQuantity: { $sum: '$products.quantity' } } },
        ]);

        const currQuantity = productCount.length > 0 ? productCount[0].totalQuantity : 0;
        console.log('currentQuantity:', currQuantity);

        if (currQuantity >= stock) {
            return res.json({ success: false, message: 'Out of stock' });
        }

        const result = await Cart.updateOne(
            { userId, 'products': { $elemMatch: { 'productId': productid } } },
            { $inc: { 'products.$.quantity': 1 } }
        );

        if (result.nModified === 0) {
            return res.json({ success: false, message: 'Product not found in the cart' });
        }

        const { totalAmount, totalProducts } = await calculateTotalAmount({ userId });
        const { totalProductAmount } = await calculateProductAmount({ userId });

        res.json({ success: true, Quantity: currQuantity + 1, totalAmount, totalProducts, totalProductAmount, stock });
    } catch (error) {
        console.log(`An error occurred while increasing the Quantity: ${error}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function decrementQuantity(req, res) {
    try {
        const productid = new ObjectId(req.params.id);
        const userId = new ObjectId(req.session.currentUserId);

        if (!userId) {
            return res.json({ success: false, message: 'User not logged in' });
        }

        const productdetails = await Product.findById(productid);

        if (!productdetails) {
            return res.json({ success: false, message: 'Product not found' });
        }

        const stock = productdetails.countInStock;

        const productCount = await Cart.aggregate([
            { $match: { userId, 'products.productId': productid } },
            { $unwind: '$products' },
            { $match: { 'products.productId': productid } },
            { $project: { _id: 0, totalQuantity: { $sum: '$products.quantity' } } },
        ]);

        const currQuantity = productCount.length > 0 ? productCount[0].totalQuantity : 0;

        if (currQuantity <= 1) {
            return res.json({ success: false, message: 'Quantity cannot be less than 1' });
        }

        const result = await Cart.updateMany(
            { userId, 'products.productId': productid },
            { $inc: { 'products.$.quantity': -1 } }
        );

        if (result.nModified === 0) {
            return res.json({ success: false, message: 'Product not found in the cart' });
        }

        const { totalAmount, totalProducts } = await calculateTotalAmount({ userId });
        const { totalProductAmount } = await calculateProductAmount({ userId });

        const productcount = await Cart.aggregate([
            { $match: { 'products.productId': productid } },
            { $unwind: '$products' },
            { $match: { 'products.productId': productid } },
            { $project: { _id: 0, quantity: '$products.quantity', countInStock: '$products.countInStock' } }
        ]);

        const Quantity = productcount.length > 0 ? productcount[0].quantity : 0;
        console.log(`Quantity: ${Quantity}  Stock: ${stock}`);

        res.json({ success: true, Quantity, totalAmount, totalProducts, totalProductAmount, stock });
    } catch (error) {
        console.log(`An error occurred while decreasing the Quantity: ${error}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
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

module.exports = {
    getCart,
    postCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
}