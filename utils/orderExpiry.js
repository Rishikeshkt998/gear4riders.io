
const Order = require('../models/order');



async function orderCancelFunction() {
    try {
        
        const ordersToCancel = await Order.updateMany({
            isDeleted: false,
            paymentstatus: 'PENDING',
            date: { $lt: { $add: ['$date', 30 * 24 * 60 * 60 * 1000] } },
            isCancelled: false  
        }, {
            $set: {
                isCancelled: true,
                status: 'Cancelled'
            }
        });

        console.log(`${ordersToCancel} orders canceled.`);
    } catch (error) {
        console.error(error);
    }
}


module.exports = orderCancelFunction
    