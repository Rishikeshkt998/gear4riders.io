const express = require('express');
const router = express.Router();


const wishListController = require('../../controller/wishListController');


router.post('/addtowhishlist/:id',wishListController.addToWhishList);
router.get('/removewhishlist/:id',wishListController.removeFromWhishlist);
router.get('/',wishListController.wishListView);



module.exports = router;