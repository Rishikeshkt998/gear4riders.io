const Product = require('../models/product');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

function userReviews(req, res) {
    try {
        const productid = req.params.productid;
        const username = req.params.username;
        console.log(productid, username)
        res.render('user/review', { productid, username });
    } catch (error) {
        console.log(error)
    }
}



async function reviewPost(req, res) {
    try {
        const { title, description, username, scores, productid, } = req.body;
        console.log(title, description, scores, productid, username)
        const reviewUpdate = await Product.findByIdAndUpdate(productid, {
            $push: {
                reviews: {
                    $each: [{
                        title: title,
                        description: description,
                        reviewer: username,
                        scores: scores,
                    }],
                    $position: 0
                }
            }
        });
        console.log(reviewUpdate)
        if (reviewUpdate) {
            return res.json({ success: true, message: 'Review completed' })
        } else {
            return res.json({ success: false, message: 'Failed to update the review.' });
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    userReviews,
    reviewPost,
};

