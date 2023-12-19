const Product = require('../models/product');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const banner= require('../models/banner');

async function bannerView (req, res) {
    try {
        const bannerData = await banner.find({ isDeleted: false }).populate('product')

        res.render('admin/banner', {  bannerData });
    } catch (error) {
        console.log(error)
    }
}
async function addBanner(req, res) {
    try {
        const products = await Product.find({ isDeleted: false });
        return res.render('admin/add-banner', {  products });
    } catch (error) {
        console.log(error)
    }
}

async function bannerDelete(req, res) {
    try {
        const id = req.params.id
        
        const bannerDeleted = await banner.findByIdAndUpdate(id, { $set: { isDeleted: true } })
        console.log(bannerDeleted)
        return res.redirect('/banner')
    } catch (error) {
        console.log(error)
    }
}



async function postBanner(req, res) {

    const data = req.body;
    console.log(data);

    if (data) {
        try {
            const croppedImages = req.files.map(file => file.filename);
            console.log(croppedImages);

            // Update product information
            const Banner = new banner({
                title: req.body.title,
                product: req.body.product,
                image: [...croppedImages],
                description: req.body.description,
                
                
            })
            const saved = await Banner.save()
            console.log(saved)
            res.json({ success: true, message: 'updated successfully' });
        } catch (err) {
            console.error(err);
            res.send(err);
        }
    } else {
        res.redirect('/banner');
    }
}

async function editBanner (req, res) {
    try {
        const id = req.params.id
        const bannerData=await banner.findById(id).populate('product')
        console.log(bannerData)
        const products = await Product.find({ isDeleted: false })
        return res.render('admin/edit-banner', {  bannerData, products })
    } catch (error) {
        console.log(error)
    }
}

async function editBannerPost (req,res) {
    const data = req.body;
    console.log(data);

    if (data) {
        try {
            // const croppedImages = req.files.map(file => file.filename);
            // console.log(croppedImages);
            const id = req.params.id;
            const bannerimages = await banner.findById(id);
            console.log(bannerimages);
            let compinedimage = [...bannerimages.image]
            let arrayimage = []
            if (req.files.length) {
                for (let i = 0; i < req.files.length; i++) {
                    arrayimage[i] = req.files[i].filename
                }
                compinedimage = [...productimages.image, ...arrayimage]
            }

            // Update product information
            const Banner = {
                title: req.body.title,
                product: req.body.product,
                image: compinedimage ,
                description: req.body.description,
                
                
            }
            Bannerupdated = await banner.findByIdAndUpdate(id, Banner, { new: true });
            console.log(Bannerupdated );
            res.json({ success: true, message: 'updated successfully' });
        } catch (err) {
            console.error(err);
            res.send(err);
        }
    } else {
        res.redirect('/banner');
    }

}




module.exports = {
    addBanner,
    postBanner,
    bannerView,
    bannerDelete,
    editBanner,
    editBannerPost
}