const express = require('express')
const router = express.Router()
const adminController=require('../../controller/adminController')
// const checkAdminAuth=require("../../middleware/adminAuth")
// router.use(checkAdminAuth)
const adminsignupDatavalidate=require("../../validations/adminsignupvalidation")
const adminloginDatavalidate=require("../../validations/adminloginvalidation")
router.get('/login',adminController.adminLoginPage)
router.post('/login',adminloginDatavalidate,adminController.adminLogin)
router.get('/signup',adminController.adminSignupView)
router.post('/signup',adminsignupDatavalidate,adminController.adminSignupPost)





module.exports = router