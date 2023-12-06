
const checkUserAuth=(req,res,next)=>{
    if(req.session.userlogin){
        next()
    }else{
        return res.redirect("/login")
    }
}


module.exports=checkUserAuth
