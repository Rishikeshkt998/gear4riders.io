const express = require('express');
const router = express.Router();


const Walletcontroller = require('../../controller/walletsController');

router.post('/addtowallet',Walletcontroller.addToWallet)
router.get('/',Walletcontroller.WalletView);
router.post('/verifywalletpayment',Walletcontroller.verifyWalletPayment);


module.exports = router;