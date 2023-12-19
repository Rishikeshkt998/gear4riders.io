const express = require('express');
const app = express();
const path = require('path');

const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const morgan = require('morgan');
// const mongoose = require('mongoose');
const { dbconnect } = require('./config');
const nocache = require('nocache');
const upload = require('./utils/multer');
const cookieParser = require('cookie-parser');
var cron = require('node-cron');
app.use(nocache());
const orderCancelFunction=require('./utils/orderExpiry')
const userstaticroutes = require('./routers/StaticRoutes/UserStaticRoutes');
const adminAuthroutes = require('./routers/AuthRoutes/AdminAuthRoutes');
const adminStaticRoutes = require('./routers/StaticRoutes/AdminStaticRoutes');
const PaymentRoutes = require('./routers/AuthRoutes/PaymentRoutes');
const CartRoutes = require('./routers/AuthRoutes/CartRoutes');
const wishListRoutes = require('./routers/AuthRoutes/WishListRoutes');
const checkOutRoutes = require('./routers/AuthRoutes/checkOutRoutes');
const walletRoutes = require('./routers/AuthRoutes/WalletRoutes');
const userProfileRoutes = require('./routers/AuthRoutes/userProfileRoutes');
const orderRoutes = require('./routers/AuthRoutes/OrderRoutes');
const reviewRoutes = require('./routers/AuthRoutes/reviewRoutes');
const bannerRoutes = require('./routers/AuthRoutes/bannerRoutes');









const adminAuth = require('./middleware/adminAuth');
const userAuth = require('./middleware/userAuth');
// const nodemon = require('nodemon');







app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'public/stylesheet')));
app.use(express.static('public/image'));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.static('controller'));
app.use(upload);
app.use(session({
    secret: uuidv4(),
    saveUninitialized: true,
}));

require('dotenv/config');
//middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(morgan('tiny'));
console.log(process.env.SECRET);
app.use((req, res, next) => {

    res.locals.NoUser = req.session.userlogin;

    next();
});

app.use('/admin', adminStaticRoutes);

app.use('/', userstaticroutes);
app.use('/adminauth', adminAuth, adminAuthroutes);
app.use('/cart', userAuth, CartRoutes);
app.use('/wishlist', userAuth, wishListRoutes);
app.use('/checkout', userAuth, checkOutRoutes);
app.use('/wallet', userAuth, walletRoutes);
app.use('/profile', userAuth, userProfileRoutes);
app.use('/order', userAuth, orderRoutes);
app.use('/review', userAuth, reviewRoutes);
app.use('/payment', userAuth, PaymentRoutes);
app.use('/banner', adminAuth,bannerRoutes);









// app.get('*', (req, res) => {
//     res.status(404).render('404');
//   });
app.all('*',(req,res,next)=>{
    const err=new Error(`cant find  ${req.originalUrl} on the server`);
    err.status='fail';
    err.statusCode=404;
    next(err);
});
app.use((error,req,res,next)=>{
    error.statusCode=error.statusCode||500;
    error.status=error.status||'error';
    res.locals.error = error;
    res.render('user/error');
    next();
});

app.get('*', function (req, res, next) {
    res.locals.cart = req.session.cart;
    next();
});


cron.schedule('* * 30 * *',orderCancelFunction);





dbconnect();

app.listen(3000, () => {
    console.log('server is running http://localhost:3000');
});