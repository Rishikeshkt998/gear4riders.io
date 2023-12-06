const mongoose=require('mongoose');

module.exports.dbconnect=()=>{
    mongoose.connect(process.env.MONGO)
        .then(() => {
            console.log('database cnnection is ready');
        })
        .catch((err) => {
            console.log(err);
        });
};