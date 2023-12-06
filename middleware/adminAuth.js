
const checkAdminAuth=(req,res,next)=>{
    if(req.session.login){
        next()
    }else{
        return res.redirect("admin/login")
    }
}


module.exports=checkAdminAuth
