const express = require('express');
const router = express.Router();


const Ordercontroller = require('../../controller/OrderController');


router.get('/orderdisplay/:orderId', Ordercontroller.orderDisplay);
router.get('/paymentfail', Ordercontroller.paymentFailed);
router.get('/invoice/:orderId', Ordercontroller.invoiceDownload);

router.get('/orderlist', Ordercontroller.getOrderList);
router.get('/ordercancel/:id', Ordercontroller.orderCancel);
router.get('/returnProduct/:id', Ordercontroller.ReturnOrder);
router.get('/vieworderdetails/:id', Ordercontroller.orderDetailsPage);


module.exports = router;