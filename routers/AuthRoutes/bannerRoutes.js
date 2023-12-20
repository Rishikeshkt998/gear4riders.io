const express = require('express');
const router = express.Router();
const bannerController = require('../../controller/bannerController');

//coupon

router.get('/add-banner',bannerController.addBanner);
router.post('/banner-post',bannerController.postBanner);
router.get('/',bannerController.bannerView);
router.get('/delete-banner/:id',bannerController.bannerDelete);
router.get('/edit-banner/:id',bannerController.editBanner);
router.post('/updatebanner/:id',bannerController.editBannerPost);
router.get('/deletebannerImages/:id/:image', bannerController.deleteBannerImage);




module.exports = router;
