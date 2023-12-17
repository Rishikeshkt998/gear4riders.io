const Admin = require('../models/admin');

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');


function adminLoginPage(req, res) {
    // res.render('admin/login')
    try {
        if (req.session.login) {
            res.redirect('/adminauth/admindashboard');
        } else {
            res.render('admin/admin-login', { errors: '', invalid: '' });
        }

    } catch (err) {
        console.log(err);

    }

}

async function adminLogin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return res.status(400).json({success:false,errors:errors.array()})
        return res.render('admin/admin-login', { errors: errors.mapped(), invalid: '' });
    } else {
        try {
            const isadmin = await Admin.findOne({ email: req.body.email });
            if (!req.body.email) {
                return res.render('admin/admin-login', { errors: '', invalid: 'the input field must not be blank' });

            } else if (!isadmin) {
                return res.render('admin/admin-login', { errors: '', invalid: 'email id does not exists' });

            }
            const password = req.body.password;
            if (req.body.email && password) {
                const admin = await Admin.findOne({ email: req.body.email });
                if (admin) {
                    const ismatch = await bcrypt.compare(password, admin.password);
                    if (ismatch) {
                        req.session.name = admin.name;
                        req.session.login = true;
                        console.log('req.session.login' + req.session.login);
                        res.redirect('/adminauth/admindashboard');
                    } else {
                        req.session.message = {
                            message: 'You entered the wrong password.',
                            type: 'danger'
                        };
                        res.redirect('/admin/login');
                    }
                    // await bcrypt.compare(password,admin.password).then((result)=>{
                    //     req.session.name=admin.name
                    //     req.session.login=true
                    //     res.redirect('/products')
                    // }).catch((err)=>{
                    //     console.log('Incorrect password.')
                    //     console.log(err)
                    //     res.redirect('/admin/login')
                    // })
                } else {
                    req.session.message = {
                        message: 'Admin with entered email is not exsts',
                        type: 'warning'
                    };
                    res.redirect('/admin/login');
                }
            } else {
                req.session.message = {
                    message: 'The input field must not be blank!',
                    type: 'warning'
                };
                res.redirect('/admin/login');
            }

        } catch (error) {
            console.log(error);
            req.session.message = {
                message: '!Unknown error!',
                type: 'danger'
            };
            res.redirect('/admin/login');
        }
    }

}
function adminSignupView(req, res) {
    res.render('admin/adminsignup', { errors: '' });
}

async function adminSignupPost(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // return res.status(400).json({success:false,errors:errors.array()})
        return res.render('admin/adminsignup', { errors: errors.mapped() });
    }
    var pass;
    await bcrypt.hash(req.body.password, 10).then((hash) => {
        pass = hash;
    }).catch((err) => {
        console.log('An error occured while hashing the password' + err);
        res.redirect('/admin/signup');
    });
    const data = new Admin({
        name: req.body.name,
        email: req.body.email,
        password: pass
    });
    await data.save().then((result) => {
        res.redirect('/admin/login');
    }).catch((err) => {
        console.log(err);
        res.send(err);
    });

}



module.exports = {
    adminLoginPage,
    adminLogin,
    adminSignupView,
    adminSignupPost
};