
const User = require('../models/user');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


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

            res.redirect('/wishlist');
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


module.exports = {
    addToWhishList,
    wishListView,
    removeFromWhishlist,

};