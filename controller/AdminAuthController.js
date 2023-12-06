const Product = require('../models/product');
const Category = require('../models/categories');
const Brand = require('../models/brands');
const User = require('../models/user');
const Order = require('../models/order');
const Coupon = require('../models/coupon');
const fs = require('fs');
const path = require('path');
const Cropper = require('cropper');
const multer = require('multer');
const { validationResult } = require('express-validator');



//products
async function ProductView(req, res) {
    try {
        const products = await Product.find({ isDeleted: false }).populate({
            path: 'categorieId',
            select: 'name'

        }).populate({
            path: 'brandId',
            select: 'name'
        });
        res.render('admin/admin-product-view', {
            products
        });
    }
    catch (error) {
        console.log(error);
    }

}


async function ProductPost(req, res) {


    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const categorylist = await Category.find({ isDeleted: false });
        const brandlist = await Brand.find({ isDeleted: false });

        return res.render('admin/add-product', { brandlist, categorylist, errors: errors.mapped() });
    }
    console.log(errors);
    const data = req.body;
    if (data) {
        let arrayimage = [];
        for (let i = 0; i < req.files.length; i++) {
            arrayimage[i] = req.files[i].filename;
        }
        const product = new Product({
            name: req.body.name,
            image: arrayimage,
            price: req.body.price,
            brandId: req.body.brandId,
            categorieId: req.body.categorieId,
            description: req.body.description,
            discount:req.body.discount,
            countInStock: req.body.countInStock,
        });
        product.save().then((createdproduct => {

            res.redirect('/adminauth/products');

        })).catch((err) => {
            console.log(err);
            res.status(500).json({
                error: err,
                success: false
            });
        });

    } else {
        redirect('/adminauth/products');
    }



}
async function addProduct(req, res) {

    const categorylist = await Category.find({ isDeleted: false });

    const brandlist = await Brand.find({ isDeleted: false });


    res.render('admin/add-product', { categorylist, brandlist, errors: '' });



}
async function editProduct(req, res) {


    const id = req.params.id;
    const product = await Product.findById(id);
    const categorylist = await Category.find({ isDeleted: false });

    const brandlist = await Brand.find({ isDeleted: false });


    res.render('admin/edit-product', { product, categorylist, brandlist, errors: '' });
}


async function updateProduct(req, res) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const id = req.params.id;
        const product = await Product.findById(id);
        const categorylist = await Category.find({ isDeleted: false });
        const brandlist = await Brand.find({ isDeleted: false });

        return res.render('admin/edit-product', { product, brandlist, categorylist, errors: errors.mapped() });
    }

    const data = req.body;
    console.log(data);

    if (data) {
        try {
            const id = req.params.id;
            const product = await Product.findById(id);
            console.log(product);

            // let croppedImages = []
            // for (let i = 0; i < req.files.length; i++) {
            //     croppedImages[i] = req.files[i].filename
            // }
            // const croppedImages = req.file|| [];
            const croppedImages = req.files.map(file => file.filename);
            console.log(croppedImages);
            const name = req.body.name;
            console.log(name);

            // Update product information
            const updatedProduct = {
                name: req.body.name,
                price: req.body.price,
                brandId: req.body.brandId,
                categorieId: req.body.categorieId,
                description: req.body.description,
                countInStock: req.body.countInStock,
                image: [...product.image, ...croppedImages],
            };


            // Update the product in the database
            productupdated = await Product.findByIdAndUpdate(id, updatedProduct);
            console.log(productupdated);

            // res.redirect('/adminauth/products');
            res.json({ success: true, message: 'updated successfully' });
        } catch (err) {
            console.error(err);
            res.send(err);
        }
    } else {
        res.redirect('/products');
    }
}
function formatCurrency(amount, currencyCode = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount);
}

async function adminDashboard(req, res) {

    try {
        // Total Revenue
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalAmount: 1
                }
            }
        ]);
        const totalPrice = totalRevenue[0] ? totalRevenue[0].totalAmount : 0;
        console.log(totalPrice);
        // Monthwise Total
        const monthwiseTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1,
                    month: 1
                }
            }
        ]);
        const yearwiseTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1
                }
            }
        ]);
        const weeklyTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        week: { $isoWeek: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    week: '$_id.week',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1,
                    week: 1
                }
            }
        ]);
    
        // Trending Products
        const trendingProducts = await Order.aggregate([
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product_id',
                    productName: { $first: '$products.productname' },
                    productPrice: { $first: '$products.productprice' },
                    soldCount: { $sum: '$products.quantity' }
                }
            },
            {
                $sort: {
                    soldCount: -1
                }
            },
            {
                $limit: 5 // Adjust the limit based on your preference
            }
        ]);
        console.log(trendingProducts);
        console.log(monthwiseTotal);

        res.render('admin/admin-dashboard', { monthwiseTotal,yearwiseTotal,weeklyTotal,totalPrice , trendingProducts ,formatCurrency});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

}
async function SalesReport(req, res) {

    try {
        // Total Revenue
        const orderStats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id: 0,
                    totalAmount: 1,
                    totalOrders: 1,
                    averageOrderValue: { $divide: ['$totalAmount', '$totalOrders'] },
                }
            }
        ]);
        const totalPrice = orderStats[0] ? orderStats[0].totalAmount : 0;
        const totalorders= orderStats[0] ? orderStats[0].totalOrders : 0;
        const averageorder= orderStats[0] ? orderStats[0].averageOrderValue : 0;
       
        // Monthwise Total
        const monthwiseTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1,
                    month: 1
                }
            }
        ]);
        const yearwiseTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1
                }
            }
        ]);
        const weeklyTotal = await Order.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        week: { $isoWeek: '$date' }
                    },
                    totalAmount: { $sum: '$totalAmount' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    week: '$_id.week',
                    totalAmount: 1
                }
            },
            {
                $sort: {
                    year: 1,
                    week: 1
                }
            }
        ]);
    
        // Trending Products
        const trendingProducts = await Order.aggregate([
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.product_id',
                    productName: { $first: '$products.productname' },
                    productPrice: { $first: '$products.productprice' },
                    soldCount: { $sum: '$products.quantity' }
                }
            },
            {
                $sort: {
                    soldCount: -1
                }
            },
            {
                $limit: 5 // Adjust the limit based on your preference
            }
        ]);
        const topCustomer = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'orders'
                }
            },
            {
                $unwind: '$orders'
            },
            {
                $group: {
                    _id: '$_id',
                    totalOrders: { $sum: 1 },
                    name: { $first: '$name' },
                    email: { $first: '$email' },
                    phone: { $first: '$phone' },
                    address: { $first: '$address' }
                }
            },
            {
                $sort: { totalOrders: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone:1,
                    address:1
                    // Include other fields if needed
                }
            }
        ]);
        

        console.log(trendingProducts);
        console.log(monthwiseTotal);

        res.render('admin/salesreport', { monthwiseTotal,yearwiseTotal,weeklyTotal, totalPrice,totalorders,averageorder, trendingProducts ,topCustomer,formatCurrency});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

}



async function deleteProduct(req, res) {
    const id = req.params.id;
    const product = await Product.findById(id);
    product.isDeleted = true;
    await product.save().then((product) => {
        res.redirect('/adminauth/products');
    }).catch(err => {
        res.send(err);
    });
}

async function deleteImage(req, res) {
    const id = req.params.id;
    const image = req.params.image;
    console.log(id, image);
    await Product.findByIdAndUpdate({ _id: id }, { $pull: { image: image } });
    req.session.message = {
        message: 'Image deleted successfully',
        type: 'success'
    };
    return res.redirect(`/adminauth/editproduct/${id}`);
}





//categories



async function categorieView(req, res) {
    const categorylist = await Category.find({ isDeleted: false });
    res.render('admin/admin-category-view', {

        data: categorylist
    });

}
async function categoriePost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return res.status(400).json({success:false,errors:errors.array()})
        return res.render('admin/add-category', { errors: errors.mapped(), invalid: '' });
    }
    // let categorys=req.body.name
    const iscategories = await Category.findOne({ name: req.body.name });
    if (!req.body.name) {
        return res.render('admin/add-category', { errors: '', invalid: 'the input field must not be blank' });

    } else if (iscategories != null) {
        return res.render('admin/add-category', { errors: '', invalid: 'the the entered category is already exists' });

    }
    const category = new Category({
        name: req.body.name,
        discount:req.body.discount
    });
    category.save().then((createdcategory => {
        // res.status(201).json(createdcategory)
        res.redirect('/adminauth/categories');
    })).catch((err) => {
        res.status(500).json({
            error: err,
            success: false
        });
    });

}



function addCategory(req, res, next) {
    res.render('admin/add-category', { errors: '', invalid: '' });
}
function editCategory(req, res) {

    const id = req.params.id;
    Category.findById(id).then((category) => {
        res.render('admin/edit-category', {
            data: category, errors: '', invalid: ''
        });

    });


}

async function updateCategory(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const id = req.params.id;
        const data = await Category.findById(id);
        return res.render('admin/edit-category', { data, errors: errors.mapped(), invalid: '' });
    } else {
        const id = req.params.id;
        Category.findByIdAndUpdate(id, {
            name: req.body.name
        }).then((result) => {
            res.redirect('/adminauth/categories');
        }).catch((err) => {
            res.send(err);
        });
    }

}
async function deleteCategory(req, res) {
    const id = req.params.id;
    const category = await Category.findById(id);
    category.isDeleted = true;
    await category.save().then((category) => {
        res.redirect('/adminauth/categories');
    }).catch(err => {
        res.send(err);
    });
}


//brands


async function brandView(req, res) {
    const brandlist = await Brand.find({ isDeleted: false });
    res.render('admin/admin-brand-view', {
        data: brandlist
    });

}
async function brandPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return res.status(400).json({success:false,errors:errors.array()})
        return res.render('admin/add-brand', { errors: errors.mapped(), invalid: '' });
    }
    const isbrand = await Brand.findOne({ name: req.body.name });
    if (!req.body.name) {
        return res.render('admin/add-brand', { errors: '', invalid: 'the input field must not be blank' });

    } else if (isbrand != null) {
        return res.render('admin/add-brand', { errors: '', invalid: 'the the entered brand is already exists' });

    }
    const brand = new Brand({
        name: req.body.name,

    });
    brand.save().then((createdbrand => {
        // res.status(201).json(createdcategory)
        res.redirect('/adminauth/brands');
    })).catch((err) => {
        res.status(500).json({
            error: err,
            success: false
        });
    });

}



function addBrand(req, res) {
    res.render('admin/add-brand', { errors: '', invalid: '' });
}

function editBrand(req, res) {
    const id = req.params.id;
    Brand.findById(id).then((brand) => {
        res.render('admin/edit-brand', {
            data: brand, errors: ''
        });

    });


}
async function updateBrand(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        let id = req.params.id;
        const data = await Brand.findById(id);
        return res.render('admin/edit-brand', { data, errors: errors.mapped()});
    }
    const id = req.params.id;
    Brand.findByIdAndUpdate(id, {
        name: req.body.name
    }).then((result) => {
        res.redirect('/adminauth/brands');
    }).catch((err) => {
        res.send(err);
    });

}
async function deleteBrand(req, res) {
    const id = req.params.id;
    const brand = await Brand.findById(id);
    brand.isDeleted = true;
    await brand.save().then((brand) => {
        res.redirect('/adminauth/brands');
    }).catch(err => {
        res.send(err);
    });
}

//user



async function userView(req, res) {
    const userlist = await User.find();
    res.render('admin/admin-user-view', {
        data: userlist
    });

}
async function userBan(req, res) {
    const id = req.params.id;
    const user = await User.findById(id);
    user.isDeleted = true;
    await user.save().then((user) => {
        res.redirect('/adminauth/users');
    }).catch(err => {
        res.send(err);
    });
}
async function userUnban(req, res) {
    const id = req.params.id;
    const user = await User.findById(id);
    user.isDeleted = false;
    await user.save().then((user) => {
        res.redirect('/adminauth/users');
    }).catch(err => {
        res.send(err);
    });
}




async function orderView(req, res) {
    try {
        const ordersData = await Order.find();
        ordersData.sort((a, b) => new Date(b.date) - new Date(a.date));
       
        res.render('admin/admin-orders', {
            ordersData
        });
    } catch (err) {
        console.log(err);
    }
}
async function AdminOrderDetails(req, res) {
    
    try {
        console.log(req.params.id);
        const orderId = req.params.id;
        const order = await Order.findOne({ '_id': orderId });


        console.log(order);
        return res.render('admin/admin-order-details', { data: order });


    } catch (error) {
        console.log(error);
    }
}
async function changeStatus(req, res) {
    try {
        const orderId = req.params.id;
        const status = req.params.status;
        console.log(`order id is ${orderId} and Status is ${status}`);
        const updated = await Order.findOneAndUpdate({ '_id': orderId }, { $set: { 'status': status } });
        console.log(updated);
        if (updated) {
            console.log('status updated');
            const status=updated.status
            return res.json({ success: true, message: 'Status updated' ,status});
        } else {
            console.log('Status failed to update');
            return res.json({ success: false, message: 'Status failed to update' });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: 'Unknown Error' });
    }
}
async function changePaymentStatus(req, res) {
    try {
        const orderId = req.params.id;
        const totalAmount = req.params.totalAmount;
        const paymentstatus = req.params.paymentstatus;
        const userId= req.params.userId;

        console.log(paymentstatus)
        const updated = await Order.findOneAndUpdate({ '_id': orderId }, { $set: { 'paymentstatus': paymentstatus } });
        console.log(updated);
        if(paymentstatus==='REFUND'){
            const walletAmount = await User.findByIdAndUpdate(
                userId,
                {
                    $inc: { 'wallet.balance': totalAmount },
                    $push: {
                        'wallet.transactions': {
                            type: 'debited',
                            amount: totalAmount,
                            description: 'Amount is added to wallet through refund',
                            time: Date.now()
                        }
                    }
                },
                { new: true, upsert: true }
            )
        }
        if (updated) {
            
            console.log('status updated');
            // const status=updated.paymentstatus

            return res.json({ success: true, message: 'Status updated' ,updated});
        } else {
            console.log('Status failed to update');
            return res.json({ success: false, message: 'Status failed to update' });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: 'Unknown Error' });
    }
}
async function addCoupon(req, res) {
    res.render('admin/add-coupon',{ errors: '', invalid: '' });
}

async function couponPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('admin/add-coupon', { errors: errors.mapped(), invalid: '' });
    }
    try {
        const couponName = req.body.couponCode;
        const couponDate = req.body.couponDate;
        console.log(couponDate);
        const couponAmount = req.body.amount;
        const couponMaximumcount = req.body.maximumusage;
        const coupondescription = req.body.description;
        const coupon = new Coupon({
            name: couponName,
            amount: couponAmount,
            maximum_usage: couponMaximumcount,
            expired_at: couponDate,
            description: coupondescription


        });

        await coupon.save();

        // res.json({ success: true });
        return res.redirect('/adminauth/couponview');



    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }


}

async function couponView(req, res) {
    const couponlist = await Coupon.find();
    res.render('admin/coupon-view', {
        data: couponlist
    });

}



function adminLogout(req, res) {
    try {
        delete req.session.login;
        res.redirect('/admin/login');
    } catch (err) {
        res.send(err);
        console.log('An Error occured logging out...' + err);
    }
}


module.exports = {
    ProductView,
    ProductPost,
    addProduct,
    editProduct,
    updateProduct,
    deleteProduct,
    deleteImage,
    categorieView,
    categoriePost,
    addCategory,
    editCategory,
    updateCategory,
    deleteCategory,
    brandView,
    brandPost,
    addBrand,
    editBrand,
    updateBrand,
    deleteBrand,
    userView,
    userBan,
    userUnban,
    orderView,
    addCoupon,
    couponPost,
    couponView,
    adminLogout,
    changeStatus,
    adminDashboard,
    SalesReport,
    AdminOrderDetails,
    changePaymentStatus


};

