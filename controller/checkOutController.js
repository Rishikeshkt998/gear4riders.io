
const Cart = require('../models/cart');
const Address = require('../models/address');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { validationResult } = require('express-validator');
const localStorage = require('localStorage')

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
async function buyNow(req, res) {
    try {
        const id = req.params.id//product id
        const image = req.params.image
        const name = req.params.name
        const price = req.params.price
        const discount = req.params.discount
        const brandId = req.params.brandId
        const categorieId = req.params.categorieId
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
            brandId: brandId,
            categorieId: categorieId
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
            const totalProductAmount=product.price
            console.log(totalAmount)
            const totalProducts = 1;
            return res.render('user/checkout', { addressList, totalAmount,totalProductAmount, totalProducts, formatCurrency, errors: '', invalid: '' })
        } else {
            console.log('no local storage')
        }
        if (cart && cart !== null && cart !== undefined && cart.products.length !== 0) {
            if (localStorage.getItem("products")) {
                localStorage.removeItem("products");
            }
            let { totalAmount, totalProducts } = await calculateTotalAmount({ userId: userId });
            let { totalProductAmount } = await calculateProductAmount({ userId: userId });


            res.render('user/checkout', { addressList, totalAmount,totalProductAmount, totalProducts, formatCurrency, errors: '', invalid: '' });
        } else {
            console.log('Cart is empty')
            return res.redirect('/carts')
        }



    } else {
        console.log('not userid');
        return res.redirect('/login');
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
            return res.redirect('/checkout');
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
            return res.redirect('/checkout');
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
            res.redirect('/checkout');
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

        res.redirect('/checkout');
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        res.status(500).send('An error occurred while removing the address.');
    }
}


module.exports = {
    checkOut,
    buyNow,
    removeAddress,
    displayAddress,
    editAddress,
    updateAddress,
    saveAddress,
};



