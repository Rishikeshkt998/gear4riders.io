const express = require('express');
const router = express.Router();


const checkoutController = require('../../controller/checkOutController');
const addressDataValidate=require("../../validations/addressvalidation")

router.get('/buynow/:id/:image/:name/:price/:discount/:brandId/:categorieId',checkoutController.buyNow);
router.get('/', checkoutController.checkOut);
router.get('/displayaddress', checkoutController.displayAddress);
router.post('/saveaddress',addressDataValidate, checkoutController.saveAddress);
router.get('/addressremove/:id', checkoutController.removeAddress);
router.post('/updateaddress/:id',addressDataValidate, checkoutController.updateAddress);
router.get('/editaddress/:id', checkoutController.editAddress);


module.exports = router;