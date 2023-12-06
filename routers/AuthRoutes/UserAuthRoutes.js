const express = require('express');
const router = express.Router();
const{body,validationResult}=require('express-validator');


const userAuthcontroller = require('../../controller/userAuthController');
const addressDataValidate=require("../../validations/addressvalidation")



router.get('/carts', userAuthcontroller.getCart);
router.post('/add/:productId/:image/:name/:price/:discount/:slug', userAuthcontroller.postCart);
router.get('/buynow/:id/:image/:name/:price/:discount/:quantity',userAuthcontroller.buyNow);
router.get('/remove/:id', userAuthcontroller.removeFromCart);
router.post('/addtowhishlist/:id',userAuthcontroller.addToWhishList);
router.get('/removewhishlist/:id',userAuthcontroller.removeFromWhishlist);
router.get('/wishlist',userAuthcontroller.wishListView);
router.get('/logout', userAuthcontroller.userLogout);
router.get('/incrementCount/:id', userAuthcontroller.incrementQuantity);
router.get('/decrementCount/:id', userAuthcontroller.decrementQuantity);
router.get('/checkoutpage', userAuthcontroller.checkOut);
router.get('/displayaddress', userAuthcontroller.displayAddress);
router.post('/place-order', userAuthcontroller.placeOrder);
router.get('/applyCoupon',userAuthcontroller.couponControl);
router.post('/verifyPayment',userAuthcontroller.verifyOnlinePayment);
router.get('/orderdisplay/:orderId', userAuthcontroller.orderDisplay);
router.get('/paymentfail', userAuthcontroller.paymentFailed);
router.get('/invoice/:orderId', userAuthcontroller.invoiceDownload);
router.post('/saveaddress',addressDataValidate, userAuthcontroller.saveAddress);
router.get('/addressremove/:id', userAuthcontroller.removeAddress);
router.post('/updateaddress/:id', userAuthcontroller.updateAddress);
router.get('/editaddress', userAuthcontroller.editAddress);
router.get('/payment/:addressId/:name/:fulladdress/:pincode/:landmark/:district/:city/:phone/:alternatephone', userAuthcontroller.paymentPage);
router.post('/postPayment', userAuthcontroller.postOrder);
router.post('/addtowallet',userAuthcontroller.addToWallet)
router.get('/orderlist', userAuthcontroller.getOrderList);
router.get('/ordercancel/:id', userAuthcontroller.orderCancel);
router.get('/vieworderdetails/:id', userAuthcontroller.orderDetailsPage);
router.get('/userprofilepage', userAuthcontroller.getUserprofile);
router.get('/getaddressbook', userAuthcontroller.getAddressBook);
router.post('/useraddresssave',addressDataValidate, userAuthcontroller.userProfileAddressSave);
router.get('/addaddress', userAuthcontroller.addAddressBook);
router.post('/updateaddressbook/:id', userAuthcontroller.updateAddressBook);
router.get('/removeaddressbook/:id', userAuthcontroller.removeAddressBook);
router.post('/updateuserprofile/:id', userAuthcontroller.updateUserProfile);
router.get('/changeEmail/:email', userAuthcontroller.updateUserEmail);
router.post('/verifyuseremail', userAuthcontroller.userVerifyOtp);
router.get('/verifyemailotp', userAuthcontroller.userEmailOtp);
router.get('/temp',userAuthcontroller.temp);
router.post('/verifywalletpayment',userAuthcontroller.verifyWalletPayment);



















module.exports = router;


