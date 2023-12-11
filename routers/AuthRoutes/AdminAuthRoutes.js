const express = require('express');
const router = express.Router();
const upload=require('../../utils/multer');
const productdatavalidate = require('../../validations/productvalidation');
const categoryDatavalidate = require('../../validations/categoryvalidation');
const brandDatavalidate = require('../../validations/brandvalidation');
const brandeditDatavalidate = require('../../validations/brandeditvalidation');
const adminAuthController = require('../../controller/AdminAuthController');
const couponDatavalidate=require('../../validations/couponvalidation')


//products
router.get('/products', adminAuthController.ProductView),
router.post('/products', productdatavalidate, adminAuthController.ProductPost),
router.get('/addproduct', adminAuthController.addProduct);
router.get('/editproduct/:id', adminAuthController.editProduct);
router.post('/updateproduct/:id', adminAuthController.updateProduct);
router.get('/deleteproduct/:id', adminAuthController.deleteProduct);
router.get('/deleteImages/:id/:image', adminAuthController.deleteImage);




//categories
router.get('/categories', adminAuthController.categorieView);

router.post('/categories', categoryDatavalidate, adminAuthController.categoriePost);
router.get('/addcategory', adminAuthController.addCategory);
router.get('/editcategory/:id', adminAuthController.editCategory);
router.post('/updatecategory/:id', categoryDatavalidate, adminAuthController.updateCategory);
router.get('/deletecategory/:id', adminAuthController.deleteCategory);


//brands

router.get('/brands', adminAuthController.brandView);
router.post('/brands', brandDatavalidate, adminAuthController.brandPost);
router.get('/addbrand', adminAuthController.addBrand);
router.get('/editbrand/:id', adminAuthController.editBrand);
router.post('/updatebrand/:id', brandeditDatavalidate, adminAuthController.updateBrand);
router.delete('/deletebrand/:id', adminAuthController.deleteBrand);

//user

router.get('/users', adminAuthController.userView);
router.get('/banuser/:id', adminAuthController.userBan);
router.get('/unbanuser/:id', adminAuthController.userUnban);
router.get('/orders', adminAuthController.orderView);
router.get('/adminorderdetails/:id', adminAuthController.AdminOrderDetails);

router.get('/changeStatus/:id/:status', adminAuthController.changeStatus);
router.get('/changePaymentStatus/:id/:totalAmount/:userId/:paymentstatus', adminAuthController.changePaymentStatus);

router.get('/logout', adminAuthController.adminLogout);


//coupon

router.get('/addcoupon',adminAuthController.addCoupon);
router.post('/couponpost',couponDatavalidate,adminAuthController.couponPost);
router.get('/couponview',adminAuthController.couponView);
router.get('/edit-coupon/:id',adminAuthController.editCoupon);
router.post('/updatecoupon/:id',couponDatavalidate,adminAuthController.updateCoupon);



router.get('/admindashboard',adminAuthController.adminDashboard);
router.get('/salesreport',adminAuthController.SalesReport);



module.exports = router;
