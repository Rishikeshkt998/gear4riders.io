const express = require('express');
const router = express.Router();
const staticController=require('../../controller/usersStaticController');
const{body,validationResult}=require('express-validator');
const userLoginDatavalidate = require('../../validations/uservalidation');
const userSignupDatavalidate=require('../../validations/usersignupvalidation');

router.get('/signup',staticController.userSignupView);
router.post('/signup',userSignupDatavalidate,staticController.userSignupPost);
router.get('/login', staticController.LoginView);
router.post('/login',userLoginDatavalidate,staticController.LoginPost);
router.post('/verifyOtp', staticController.verifyOtp);
router.post('/resendotpVerficationCode', staticController.resendVerification);
router.get('/sharelink/:email',staticController.shareLink);
router.get('/categoryproduct/:categoryname',staticController.categoryFilter);






router.get('/',staticController.dashBoard);
router.get('/productdetails/:slug/:id',staticController.ProductDetails);
router.get('/ProductList',staticController.ProductList);




router.get('/forgotPassword', staticController.userForgotPasswordPage);
router.get('/forgotPassword/:email',staticController.userForgotPassword);
router.get('/verifyForgot',staticController.verifyForgotGet);
router.post('/verifyForgot',staticController.verifyForgotPost);
router.get('/newpassword/:password/:cpassword',staticController.newPassword);




module.exports = router;