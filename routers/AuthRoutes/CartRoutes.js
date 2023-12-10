const express = require('express');
const router = express.Router();


const CartController = require('../../controller/CartController');


router.get('/incrementCount/:id', CartController.incrementQuantity);
router.get('/decrementCount/:id', CartController.decrementQuantity);
router.get('/carts', CartController.getCart);
router.post('/add/:productId/:image/:name/:price/:discount/:brandId/:categorieId/:slug', CartController.postCart);
router.get('/remove/:id', CartController.removeFromCart);


module.exports = router;
