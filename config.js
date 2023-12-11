const mongodb=require('mongodb')
const mongoose=require('mongoose');

module.exports.dbconnect=()=>{
    mongoose.connect(process.env.MONGO,{ useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            console.log('database cnnection is ready');
        })
        .catch((err) => {
            console.log(err);
        });
};