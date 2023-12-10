
const Address = require('../models/address');
const User = require('../models/user');
const userOtpVerification = require('../models/otp');
const notifier = require('node-notifier');
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const bcrypt = require('bcrypt');

const { validationResult } = require('express-validator');


async function getUserprofile(req, res) {
    try {
        const userId = req.session.currentUserId;
        const UserData = await User.findOne({ _id: userId });
        console.log(UserData);
        res.render('user/userprofilepage', { UserData });

    } catch (error) {
        console.log('can\'t profile details');
    }
}
async function updateUserProfile(req, res) {
    try {
        const id = req.params.id;

        const user = await User.findOne({ _id: id });


        user.name = req.body.name;
        user.address = req.body.address;
        user.phone = req.body.phone;

        await user.save();


        res.redirect('/profile/userprofilepage');
    } catch (error) {
        console.error('Error updating user profile:', error);

        res.status(500).send('Unable to update profile. Please try again later.');
    }
}




async function updateUserEmail(req, res) {
    try {
        const email = req.params.email;
        const isEmail = await User.findOne({ email: email });
        console.log(`there are ${isEmail} numbers`);
        if (!isEmail) {
            const updated = await User.findByIdAndUpdate(req.session.currentUserId, { $set: { email: email } });
            console.log(`updatedddd   is ${updated}`);
            await User.findByIdAndUpdate(req.session.currentUserId, { $set: { verified: false } });
            await sendOtpVerificationEmail(updated, req, res).then((result) => {
                try {
                    console.log('otp has been sent to your Email');
                    console.log(result);
                    return res.json({ success: true, message: 'Otp has been sent to your Email address.' });
                } catch (error) {
                    console.log(error);
                }

            });
        } else {
            console.log('You provided Email is already been using ...');
            return res.json({ success: false, message: 'You provided Email is already using!' });
        }
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: 'Unknown Error' });
    }
}


function userEmailOtp(req, res) {
    res.render('user/useremailotp');

}


async function userVerifyOtp(req, res) {
    try {
        let otp = req.body.otp;
        let userId = req.session.uesrid;
        console.log(`userId: ${userId} and otp: ${otp}`);
        if (!userId || !otp) {
            return res.render('user/useremailotp',);
        } else {
            const userOtpVerificationRecords = await userOtpVerification.find({ userId });
            if (userOtpVerificationRecords.length <= 0) {
                return res.render('user/useremailotp');

            } else {
                const { expired_at } = userOtpVerificationRecords[0];
                const hashedOtp = userOtpVerificationRecords[0].otp;
                if (expired_at < Date.now()) {
                    await userOtpVerification.deleteMany({ userId });
                    return res.render('user/useremailotp');
                } else {
                    const validOtp = await bcrypt.compare(otp, hashedOtp);
                    console.log((validOtp));

                    if (!validOtp) {
                        return res.render('user/useremailotp');
                    } else {
                        await User.updateOne({ _id: userId }, { verified: true });
                        await userOtpVerification.deleteMany({ userId });
                        notifier.notify({
                            title: 'Notifications',
                            message: 'Email Verified successfully ',
                            icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                            sound: true,
                            wait: true
                        });
                        return res.redirect('/profile/userprofilepage');
                    }
                }
            }
        }
    } catch (error) {
        delete req.session.uesrid;
        return res.render('user/useremailotp');
    }
}






async function getAddressBook(req, res) {
    const userid = req.session.currentUserId;
    const userId = new ObjectId(userid);
    if (userId) {
        const userAddress = await Address.findOne({ userId: userId });

        if (userAddress && userAddress !== null) {
            var addressList = userAddress.address;
        }
        res.render('user/useraddress', { addressList });

    } else {
        console.log('not userid');
        return res.redirect('/users/login');
    }
}
async function addAddressBook(req, res) {
    try {
        res.render('user/addressbookadd', { errors: '', invalid: '' });

    } catch (error) {
        console.log(`Error at address get...${error}`);
    }

}


async function userProfileAddressSave(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

        return res.render('user/addressbookadd', { errors: errors.mapped(), invalid: '' });
    }
    const userId = req.session.currentUserId;
    try {
        const existingAddress = await Address.findOne({ userId: userId });

        if (existingAddress) {

            const updatedData = {
                name: req.body.name,
                fulladdress: req.body.fulladdress,
                pincode: req.body.pincode,
                landmark: req.body.landmark,
                district: req.body.district,
                state: req.body.state,
                phone: req.body.phone,
                alternatephone: req.body.alternatephone,
            };

            existingAddress.address.push(updatedData);
            existingAddress.modified_at = new Date();
            await existingAddress.save();

            res.redirect('/profile/getaddressbook');
        } else {
            const newAddress = new Address({
                userId: userId,
                address: [
                    {
                        name: req.body.name,
                        fulladdress: req.body.fulladdress,
                        pincode: req.body.pincode,
                        landmark: req.body.landmark,
                        district: req.body.district,
                        state: req.body.state,
                        phone: req.body.phone,
                        alternatephone: req.body.alternatephone,
                    },
                ],
            });

            await newAddress.save();

            res.redirect('/profile/getaddressbook');
        }
    } catch (error) {
        console.error(`An error occurred: ${error}`);
    }

}
async function updateAddressBook(req, res) {
    try {
        const id = req.params.id;
        const data = req.body;
        console.log(data);
        console.log(`id is ${id}  and the data is ${data}`);
        const update = await Address.findOneAndUpdate({ 'address._id': id }, {
            $set: {
                'address.$.name': data.name,
                'address.$.phone': data.phone,
                'address.$.fulladdress': data.fulladdress,
                'address.$.pincode': data.pincode,
                'address.$.district': data.district,
                'address.$.landmark': data.landmark,
                'address.$.alternatephone': data.alternatephone,
            }
        });
        if (update) {
            console.log('successfully updated...');
            res.redirect('/profile/getaddressbook');
        } else {
            console.log('updation failed..');

        }

    } catch (error) {
        console.log('Error while updating the address At /users/updateAddress');
    }
}

async function removeAddressBook(req, res) {
    const userId = req.session.currentUserId;
    const addressId = req.params.id;

    try {
        const userAddress = await Address.findOne({ userId: userId });

        if (userAddress) {

            const addressIndex = userAddress.address.findIndex(address => address._id.toString() === addressId);

            if (addressIndex !== -1) {

                userAddress.address.splice(addressIndex, 1);
                userAddress.modified_at = new Date();
                await userAddress.save();
                console.log('Address removed from the user\'s address list');
            }
        } else {

            res.status(404).send('No address found for the user.');
            return;
        }

        res.redirect('/profile/getaddressbook');
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        res.status(500).send('An error occurred while removing the address.');
    }
}

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
});
const sendOtpVerificationEmail = async ({ _id, email }, req, res) => {
    console.log('Entered into the function.');
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;


        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: 'Email verification',
            html: `<p>Enter <b>${otp}</b> in the app to verify your email address.</p>
            <p>This code will <b>Expires in one hour</b></p>`
        };

        const saltrounds = 10;
        req.session.emailAddress = email;
        req.session.uesrid = _id;
        console.log(`your Email is ${req.session.emailAddress} and User id is ${req.session.uesrid}`);
        const hashedOtp = await bcrypt.hash(otp, saltrounds);
        const newOtpVerification = await new userOtpVerification({
            userId: _id,
            otp: hashedOtp,
            created_at: Date.now(),
            expired_at: Date.now() + 3600000,
        });

        await newOtpVerification.save();
        await transporter.sendMail(mailOptions, (err, res) => {
            if (err) {
                console.log(err);
                console.log('unknown error ');
                return res.json({ success: false, message: 'Unknown Error.error' });
            } else {
                console.log('otp successfull');
                notifier.notify({
                    title: 'Notifications',
                    message: 'OTP has send to your Email address. please check your Inbox. ',
                    icon: path.join(__dirname, 'public/assets/sparelogo.png'),
                    sound: true,
                    wait: true
                });
            }
        });

    } catch (error) {
        console.log(error);
        console.log('Error is at Catch ');
        return res.json({ success: false, message: 'Unknown Error.' });

    }
};


module.exports = {
    getUserprofile,
    userProfileAddressSave,
    updateAddressBook,
    removeAddressBook,
    updateUserProfile,
    userEmailOtp,
    userVerifyOtp,
    updateUserEmail,
    getAddressBook,
    addAddressBook,
}


