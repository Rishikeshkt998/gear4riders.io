const express = require('express');
const router = express.Router();


const reviewController = require('../../controller/reviewController');


router.get('/:productid/:username',reviewController.userReviews);
router.post('/reviewpost',reviewController.reviewPost);




module.exports = router;


