const express = require('express');
const router = express.Router();


const userProfileController = require('../../controller/userProfilController');
const addressDataValidate=require("../../validations/addressvalidation")
router.get('/userprofilepage', userProfileController.getUserprofile);
router.get('/getaddressbook', userProfileController.getAddressBook);
router.post('/useraddresssave',addressDataValidate, userProfileController.userProfileAddressSave);
router.get('/addaddress', userProfileController.addAddressBook);
router.get('/editaddressbook/:id', userProfileController.editAddressBook);
router.post('/updateaddressbook/:id',addressDataValidate,userProfileController.updateAddressBook);
router.get('/removeaddressbook/:id', userProfileController.removeAddressBook);
router.post('/updateuserprofile/:id', userProfileController.updateUserProfile);
router.get('/changeEmail/:email', userProfileController.updateUserEmail);
router.post('/verifyuseremail', userProfileController.userVerifyOtp);
router.get('/verifyemailotp', userProfileController.userEmailOtp);


module.exports = router;