const express = require('express')
const router = express.Router()
const AdminStaticController=require('../../controller/AdminStaticController')
// const checkAdminAuth=require("../../middleware/adminAuth")
// router.use(checkAdminAuth)
const adminsignupDatavalidate=require("../../validations/adminsignupvalidation")
const adminloginDatavalidate=require("../../validations/adminloginvalidation")
router.get('/login',AdminStaticController.adminLoginPage)
router.post('/login',adminloginDatavalidate,AdminStaticController.adminLogin)
router.get('/signup',AdminStaticController.adminSignupView)
router.post('/signup',adminsignupDatavalidate,AdminStaticController.adminSignupPost)





module.exports = router