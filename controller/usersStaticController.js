const User = require('../models/user');
const Product = require('../models/product');
const Category = require('../models/categories');
const Brand = require('../models/brands');
const Cart = require('../models/cart');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const userOtpVerification = require('../models/otp');
const banner= require('../models/banner');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
require('dotenv/config');
const notifier = require('node-notifier');
const path = require('path');
const { validationResult } = require('express-validator');




let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});


function userSignupView(req, res) {
    const refferalcode = req.query.refferalcode;
    console.log("your refferalcode" + refferalcode);
    res.render('user/usersignup', { errors: '', invalid: '', refferalcode });
}


async function userSignupPost(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('user/usersignup', { errors: errors.mapped(), invalid: '', refferalcode: "" });
        }
        const password = req.body.password;
        const isuser = await User.findOne({ email: req.body.email });
        if (isuser !== null) {
            return res.render('user/usersignup', { errors: '', invalid: 'the user with email already exists' });
        }
        const userName = req.body.name
        const hashedpassword = await bcrypt.hash(password, 10);
        const refferalcode = req.query.refferalcode;
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            address: req.body.address,
            phone: req.body.phone,
            password: hashedpassword,
            refferalcode: generateReferralCode(userName),
            verified: false
        });
        const result = await user.save();
        console.log(refferalcode)

        const otpsent = sendOtpVerificationEmail(result, req, res);
        if (otpsent) {
            if (refferalcode) {
                console.log("refferal" + refferalcode)
                return res.render('user/userotp', { refferalcode: refferalcode })
            } else {
                return res.render('user/userotp', { refferalcode: '' })
            }

        }

    } catch (error) {

        return res.redirect('/signup');
    }
}


function generateReferralCode(userName) {
    const userCode = userName.slice(0, 2).toUpperCase();
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referralCode = userCode + randomChars;

    return referralCode;
}




function LoginView(req, res) {
    try {
        if (req.session.userlogin) {
            res.redirect('/');
        } else {
            res.render('user/userlogins', { errors: '', invalid: '' });
        }
    } catch (error) {
        console.log('Error is at loginPage ' + error);
    }

}
async function LoginPost(req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('user/userlogins', { errors: errors.mapped(), invalid: '' });
            // return res.json({ error: errors.mapped(),invalid});
        }

        let password = req.body.password;
        if (req.body.email && password) {
            const user = await User.findOne({ email: req.body.email });
            if (user) {
                if (!user.isDeleted) {
                    const isuser = await bcrypt.compare(password, user.password);

                    console.log(`isuser: ${isuser}`);
                    if (isuser) {
                        req.session.userlogin = true;
                        req.session.currentUserId = user._id;
                        if (req.session.cartId && req.session.cartId !== null) {
                            const cartdetails = await Cart.findById(req.session.cartId);
                            const productIds = cartdetails.products.map(product => product.productId);

                            for (const productId of productIds) {
                                await Cart.findOneAndUpdate({ userId: req.session.currentUserId }, { $push: { products: { productId } } });
                            }
                            // await cart.deleteOne({_id:req.session.cartId})
                            await Cart.findByIdAndDelete(req.session.cartId);

                        }
                        notifier.notify({
                            title: 'Notifications',
                            message: 'User logined successfully...',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });

                        res.redirect('/');
                    } else {

                        return res.redirect('/login');
                    }
                } else {
                    notifier.notify({
                        title: 'Notifications',
                        message: 'The user has been blocked by the Admin. Please try to connect with the help center to know more.',
                        icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                        sound: true,
                        wait: true
                    });

                    return res.redirect('/login');

                }
            } else {

                return res.render('user/userlogins', { errors: '', invalid: 'invalid username' });
            }
        } else {

            return res.redirect('/login');
        }

    } catch (err) {
        console.log(err);
        console.log('Somthing Error at post login');
    }
}

const sendOtpVerificationEmail = async ({ _id, email }, req, res) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        //mail options
        const
            mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: email,
                subject: 'verify your Email',
                html: `<p>Enter <b>${otp}</b> in the app to verify your email address.</p>
            <p>This code will <b>Expires in one hour</b></p>`
            };
        //hash the otp
        const saltrounds = 10;
        req.session.email = email;
        req.session.uesrid = _id;

        const hashedOtp = await bcrypt.hash(otp, saltrounds);
        const newOtpVerification = await new userOtpVerification({
            userId: _id,
            otp: hashedOtp,
            created_at: Date.now(),
            expired_at: Date.now() + 3600000,
        });
        //save otp record
        await newOtpVerification.save();
        await transporter.sendMail(mailOptions, (err, res) => {
            if (err) {
                console.log(err);
            } else {
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

    }
};



async function verifyOtp(req, res) {
    try {
        const otp = req.body.otp;
        const userId = req.session.uesrid;
        const refferalcode = req.query.refferalcode
        delete req.session.uesrid;
        console.log(`userId: ${userId} and otp: ${otp}`);
        if (!userId || !otp) {
            throw Error('Empty otp details are not allowed');
        } else {
            const userOtpVerificationRecords = await userOtpVerification.find({ userId });
            if (userOtpVerificationRecords.length <= 0) {
                //no records found
                throw new Error('Account records doesn\'t exist or has been verified already. Please sign up or log in');
            } else {
                //user otp record exists
                const { expired_at } = userOtpVerificationRecords[0];
                const hashedOtp = userOtpVerificationRecords[0].otp;
                if (expired_at < Date.now()) {
                    //user otp record has expired 
                    await userOtpVerification.deleteMany({ userId });
                    throw new Error('Code has expired. please request again.');
                } else {
                    const validOtp = await bcrypt.compare(otp, hashedOtp);

                    if (!validOtp) {
                        notifier.notify({
                            title: 'Notifications',
                            message: 'invaliid code passed ',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });
                        //supplied otp is wrong
                        // throw new Error('Invalid code passed. check your Inbox.')
                    } else {
                        //success

                        await User.updateOne({ _id: userId }, { verified: true });
                        await userOtpVerification.deleteMany({ userId });
                        if (refferalcode) {
                            const referalincreased = await increaseWalletByRefferal(refferalcode);
                            console.log(referalincreased)
                        } else {
                            console.log('no refferalcode')
                        }
                        console.log('User verified successfully');
                        notifier.notify({
                            title: 'Notifications',
                            message: 'Email Verified successfully ',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });
                        res.redirect('/');
                    }
                }
            }
        }
    } catch (error) {

        return res.render('user/userotp');
    }

}

async function increaseWalletByRefferal(refferalcode) {
    try {
        const increasewallet = await User.findOneAndUpdate({
            refferalcode: refferalcode
        },
            {
                $inc: { 'wallet.balance': 50 },
                $push: {
                    'wallet.transactions': {
                        type: 'debited',
                        amount: 50,
                        description: 'cash recieved through referalcode',
                        time: Date.now()
                    }
                }
            },
            { new: true, upsert: true }
        )
        console.log(increasewallet)
    } catch (error) {
        console.log(error)
    }
}
async function resendVerification(req, res) {
    try {
        const userId = req.session.uesrid;
        const email = req.session.email;
        console.log(`userid is ${userId} and email is ${email} checking...`);
        if (!userId || !email) {
            return res.render('user/userotp');
        } else {
            //delete existing record and resend
            await userOtpVerification.deleteMany({ userId });
            sendOtpVerificationEmail({ _id: userId, email }, req, res);
        }
    } catch (error) {
        res.json({
            status: 'FAILED',
            message: 'resend Otp verification failed.'
        });
    }
}
async function brandName() {
    try {
        const brandNames = await Product.aggregate([
            {
                $match: { isDeleted: false }
            },
            {
                $sort: { created_at: -1 }
            },
            {
                $lookup: {
                    from: 'brands',
                    localField: 'brandId',
                    foreignField: '_id',
                    as: 'brand'
                }
            },
            {
                $unwind: '$brand'
            },
            {
                $group: {
                    _id: '$brand.name',
                }
            },
            {
                $match: {
                    _id: { $ne: null }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                }
            }
        ]);
        console.log(brandNames)

        return brandNames.map(brand => brand.name);
    } catch (error) {
        console.log(error);
        throw error;
    }
}



async function dashBoard(req, res) {
    try {
        const userId = req.session.currentUserId;
        let count = null;
        const cart = await Cart.findOne({ userId: userId });
        let banners = await banner.find({ $and: [{ isDeleted: false }, { isActive: true }] }).populate('product');

        if (req.session.userId) {
            count = cart.products.length;
        }

        const pageNum = parseInt(req.query.page) || 1;
        const nextPage = pageNum + 1;
        const prevPage = pageNum - 1;
        const perPage = 8;

        let docCount;

        const categoryNames = await categoryName();
        const brandNames = await brandName();

        if (req.session.uesrid) {
            delete req.session.uesrid;
        }

        const totalDocuments = await Product.countDocuments({ isDeleted: false });
        let data = await Product.find({ isDeleted: false })
            .skip((pageNum - 1) * perPage)
            .limit(perPage);
        const sortOrder = req.query.sort
        if (sortOrder) {

            sortedData = [...data].sort((a, b) => sortOrder * (a.price - b.price))
            data = sortedData.slice((pageNum - 1) * perPage, pageNum * perPage);
            console.log('the length is ', sortedData);

        }

        const search = req.query.search;

        if (search) {
            const searchnospecialchar = search.replace(/[^a-zA-Z0-9]/g, "");

            data = await Product.find({
                'name': { $regex: new RegExp(searchnospecialchar, 'i') }
            });

            console.log(data);
        }
        const products = await Product.find({ isDeleted: false }).populate('brandId', { _id: 0, name: 1 })
        const brand = req.query.brand;
        if (brand) {
            data = [];
            console.log('the length is ', products.length)
            for (let i = 0; i < products.length; i++) {
                if (products[i].brandId && products[i].brandId.name === brand) {
                    data.push(products[i]);
                }
            }


        }
        const categorie = req.query.category;
        const product = await Product.find({ isDeleted: false }).populate('categorieId', { _id: 0, name: 1 })
        if (categorie) {
            data = [];
            for (let i = 0; i < product.length; i++) {
                if (product[i].categorieId && product[i].categorieId.name === categorie) {
                    data.push(product[i]);
                }
            }
        }




        res.render('user/user', {
            data,
            page: '/',
            currentPage: pageNum,
            totalDocuments,
            pages: Math.ceil(totalDocuments / perPage),
            nextPage: nextPage <= Math.ceil(totalDocuments / perPage) ? nextPage : null,
            prevPage: prevPage >= 1 ? prevPage : null,
            count,
            categoryNames,
            brandNames,
            formatCurrency,
            generateSlug,
            banners
        });
    } catch (error) {
        console.error(error);
        res.redirect('/error-page'); // Redirect to error page or handle the error accordingly
    }
}
async function categoryName() {
    try {
        const categoryNames = await Product.aggregate([
            {
                $match: { isDeleted: false }
            },
            {
                $sort: { crated_at: -1 }
            },
            {
                $lookup: {
                    from: 'categories', // Assuming the name of the categories collection
                    localField: 'categorieId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $group: {
                    _id: '$category.name'
                }
            },
            {
                $match: {
                    _id: { $ne: null } // Filter out null or undefined categorieId
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id'
                }
            }
        ]);

        return categoryNames.map(category => category.name);
    } catch (error) {
        console.log(error);
        throw error; // Propagate the error to the caller
    }
}
async function categoryFilter(req, res) {
    try {
        const categorie = req.params.categoryname;
        var categoryNames = await categoryName();
        const products = await Product.find({ isDeleted: false }).populate('categorieId', { _id: 0, name: 1 })
        console.log(`products is ${products[2].categorieId.name}`);
        let filterResult = [];
        console.log('the length is ', products.length)
        for (let i = 0; i < products.length; i++) {
            if (products[i].categorieId && products[i].categorieId.name === categorie) {
                filterResult.push(products[i]);
            }
        }
        console.log('result is herre boss')
        console.log(filterResult);


        res.render('user/categoryresult', { filterResult, categoryNames, categorie, formatCurrency, generateSlug })
    } catch (error) {
        console.log(error)
        res.redirect('/error-page');
    }


}




async function ProductList(req, res) {
    try {
        const userId = req.session.currentUserId;
        let count = null;
        const cart = await Cart.findOne({ userId: userId });

        if (req.session.userId) {
            count = cart.products.length;
        }

        const pageNum = parseInt(req.query.page) || 1;
        const nextPage = pageNum + 1;
        const prevPage = pageNum - 1;
        const perPage = 8;

        let docCount;

        const categoryNames = await categoryName();
        const brandNames = await brandName();

        if (req.session.uesrid) {
            delete req.session.uesrid;
        }

        const totalDocuments = await Product.countDocuments({ isDeleted: false });
        let data = await Product.find({ isDeleted: false })
            .skip((pageNum - 1) * perPage)
            .limit(perPage);
        const sortOrder = req.query.sort
        if (sortOrder) {

            sortedData = [...data].sort((a, b) => sortOrder * (a.price - b.price))
            data = sortedData.slice((pageNum - 1) * perPage, pageNum * perPage);
            console.log('the length is ', sortedData);

        }

        const search = req.query.search;

        if (search) {
            const searchnospecialchar = search.replace(/[^a-zA-Z0-9]/g, "");

            data = await Product.find({
                'name': { $regex: new RegExp(searchnospecialchar, 'i') }
            });

            console.log(data);
        }

        const products = await Product.find({ isDeleted: false }).populate('brandId', { _id: 0, name: 1 })
        const brand = req.query.brand;
        if (brand) {
            data = [];
            console.log('the length is ', products.length)
            for (let i = 0; i < products.length; i++) {
                if (products[i].brandId && products[i].brandId.name === brand) {
                    data.push(products[i]);
                }
            }


        }
        const categorie = req.query.category;
        const product = await Product.find({ isDeleted: false }).populate('categorieId', { _id: 0, name: 1 })
        if (categorie) {
            data = [];
            for (let i = 0; i < product.length; i++) {
                if (product[i].categorieId && product[i].categorieId.name === categorie) {
                    data.push(product[i]);
                }
            }
        }

        res.render('user/productlistingpage', {
            data,
            page: '/ProductList',
            currentPage: pageNum,
            totalDocuments,
            pages: Math.ceil(totalDocuments / perPage),
            nextPage: nextPage <= Math.ceil(totalDocuments / perPage) ? nextPage : null,
            prevPage: prevPage >= 1 ? prevPage : null,
            count,
            categoryNames,
            brandNames,
            formatCurrency,
            generateSlug
        });
    } catch (error) {
        console.error(error);
        res.redirect('/error-page');
    }
}





function generateSlug(str) {
    return str
        .toLowerCase()             // Convert to lowercase
        .replace(/\s+/g, '-')      // Replace spaces with dashes
        .replace(/[^\w-]+/g, '');  // Remove non-word characters (except dashes)
}

function formatCurrency(amount, currencyCode = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currencyCode,
    }).format(amount);
}

async function shareLink(req, res) {
    try {
        const email = req.params.email
        console.log(email);
        const sendReferal = await sendReferalCode(email, req);
        if (sendReferal) {
            return res.json({ success: true, message: 'email send success fully.' })
        } else {
            return res.json({ success: false, message: 'failed to send the email.' })
        }


    } catch (error) {
        console.log(error)
    }
}
async function sendReferalCode(email, req) {
    const userId = req.session.currentUserId
    const user = await User.findById(userId)
    console.log(user)
    const refferalcode = user.refferalcode
    console.log(refferalcode)
    mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: 'Hello Customer.',
        html: `<p>This is your link. <b>http://localhost:3000/signup/?refferalcode=${refferalcode}</b> You will get 50rs wallet balance, by signup using this refferal link.</p>
        <p><b>join us</b></p>`
    }
    transporter.sendMail(mailOptions, (err, res) => {
        if (err) {
            console.log(err)
        } else {
            console.log('mail send')
        }
    })
}
const aggregateReviews = async (criteria) => {
    console.log(criteria);
    try {
        const products = await Product.find(criteria);

        if (products.length === 0) {
            console.log('No products found for the given criteria.');
            return null; // or handle this case according to your application logic
        }

        const result = await Product.aggregate([
            {
                $match: criteria,
            },
            {
                $unwind: "$reviews",
            },
            {
                $group: {
                    _id: null,
                    averageScore: { $avg: "$reviews.scores" },
                    reviews: { $push: "$reviews" },
                },
            },
        ]);

        if (result.length > 0) {
            const averageScore = result[0].averageScore;
            const reviews = result[0].reviews;
            console.log('Average Score:', averageScore);
            console.log('Reviews:', reviews);
            return { averageScore, reviews };
        } else {
            console.log('No reviews found for the given criteria.');
            return { averageScore: 0, reviews: 0 }; // or handle this case according to your application logic
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
};
async function ProductDetails(req, res) {
    try {
        const id = req.params.id;
        const productid = new ObjectId(id)
        const slug = req.params.slug; console.log(slug);
        let { averageScore, reviews } = await aggregateReviews({ _id: productid });
        console.log(averageScore, reviews)

        const categoryid = await Product.findById({ _id: id }, { _id: 0, categorieId: 1 });
        const brandid = await Product.findById({ _id: id }, { _id: 0, brandId: 1 });
        const catname = await Category.findById({ _id: categoryid.categorieId }, { _id: 0, name: 1 });
        const bname = await Brand.findById({ _id: brandid.brandId }, { _id: 0, name: 1 });
        const categoryname = catname.name;
        const brandname = bname.name;
        Product.findById({ _id: id }).then((products) => {
            const productSlug = generateSlug(products.name);
            res.render('user/productdetails', {
                categoryname, brandname, products, productSlug, formatCurrency, averageScore, reviews
            });


        }).catch((err) => {
            res.redirect('/');
            console.log(err);
            console.log('error is at product details');

        });
    } catch (error) {

        return res.redirect('/');
    }

}
async function userForgotPasswordPage(req, res) {
    try {
        res.render('user/forgottpage');
    } catch (error) {
        console.log(error);
    }
}
async function userForgotPassword(req, res) {
    const userEmail = req.params.email;
    console.log(userEmail);
    req.session.forgetpasswordEmail = userEmail;
    const isuser = await User.findOne({ email: userEmail });
    console.log(isuser);
    if (isuser) {
        const userId = isuser._id;
        const user = {
            _id: userId,
            email: userEmail
        };
        console.log(`your userId is ${userId}.`);
        await sendOtpVerificationEmail(user, req, res).then((result) => {
            try {
                console.log(result);
                console.log('otp has been sent to your Email');
                return res.json({ success: true, message: 'Otp has been sent to your Email address.' });
            } catch (error) {
                console.log(error);
                return res.json({ success: false, message: 'Unknown Errror' });
            }

        });
    } else {
        console.log('Entered Email is not exist');
        return res.json({ success: false, message: 'Entered Email is not exist' });
    }
}

async function verifyForgotGet(req, res) {
    try {
        res.render('user/forgototp');
    } catch (error) {
        console.log(error);
    }
}
async function verifyForgotPost(req, res) {
    try {
        const newEmail = req.session.newEmail;
        let otp = req.body.otp;
        let userId = req.session.uesrid;
        console.log(newEmail);
        console.log(`userId: ${userId} and otp: ${otp}`);
        if (!userId || !otp) {
            return res.render('user/forgototp');
        } else {
            const userOtpVerificationRecords = await userOtpVerification.find({ userId });
            if (userOtpVerificationRecords.length <= 0) {
                return res.render('user/forgototp');

            } else {
                const { expired_at } = userOtpVerificationRecords[0];
                const hashedOtp = userOtpVerificationRecords[0].otp;
                if (expired_at < Date.now()) {
                    await userOtpVerification.deleteMany({ userId });
                    return res.render('user/forgototp');
                } else {
                    const validOtp = await bcrypt.compare(otp, hashedOtp);

                    if (!validOtp) {
                        return res.render('user/forgototp');
                    } else {
                        await userOtpVerification.deleteMany({ userId });
                        notifier.notify({
                            title: 'Notifications',
                            message: 'Email Verified successfully ',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });
                        return res.render('user/newpassordfield');
                    }
                }
            }
        }
    } catch (error) {
        delete req.session.uesrid;
        return res.render('user/forgototp');
    }
}
async function newPassword(req, res) {
    try {
        const password = req.params.password;
        const cpassword = req.params.cpassword;
        console.log(`password :${password}  cpassword:${cpassword} and Email is ${req.session.forgetpasswordEmail}`);
        if (password === cpassword) {
            const hashedpassword = await bcrypt.hash(password, 10);
            if (hashedpassword) {
                const updated = await User.findOneAndUpdate({ email: req.session.forgetpasswordEmail }, { $set: { password: hashedpassword } });
                if (updated) {
                    console.log('password updated successfully');
                    return res.json({ success: true, message: 'password updated successfully' });
                } else {
                    console.log('Somthing went wrong while updating the hashed password at newpassword/:pa.....');
                    return res.json({ success: false, message: 'Somthing went wrong while updating the hashed password at newpassword/:pa.....' });
                }
            } else {
                console.log('Somthing went wrong while hashing the password');
                return res.json({ success: false, message: 'Somthing went wrong while hashing the password' });
            }
        } else {
            console.log('passwords are not matching');
            return res.json({ success: false, message: 'passwords are not matching' });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: 'Unknown Error' });
    }
}

module.exports = {
    userSignupView,
    userSignupPost,
    LoginView,
    LoginPost,
    verifyOtp,
    resendVerification,
    dashBoard,
    ProductDetails,
    userForgotPassword,
    userForgotPasswordPage,
    verifyForgotGet,
    verifyForgotPost,
    newPassword,
    shareLink,
    categoryFilter,
    ProductList


};