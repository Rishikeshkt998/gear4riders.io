const express = require('express');
const router = express.Router();


const PaymentController = require('../../controller/paymentsController');
const addressDataValidate=require("../../validations/addressvalidation")



router.post('/place-order', PaymentController.placeOrder);
router.get('/applyCoupon',PaymentController.couponControl);
router.post('/verifyPayment',PaymentController.verifyOnlinePayment);
router.get('/:addressId/:name/:fulladdress/:pincode/:landmark/:district/:city/:phone/:alternatephone', PaymentController.paymentPage);
router.post('/postPayment', PaymentController.postOrder);



















module.exports = router;


