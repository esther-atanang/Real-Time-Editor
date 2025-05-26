const User = require("../model/User");
const bcrypt = require("bcrypt");
const saltRounds =  10;

const changePassword = async (req, res) =>{
    try{
        const { oldPassword, newPassword } = req.body;
        const user = await User.findOne({email:req.info.email});
        console.log(req.body)
        if(user){
            //I have to check if password matches the hashed password

            const passwordMatches = await bcrypt.compare(oldPassword,user.password)
            if(passwordMatches){
                //ecrypt password and then store it on the database
                const password = await bcrypt.hash(newPassword,saltRounds);
                const updatePassword = await User.updateOne({email:req.info.email},{$set:{password: password}});
                if(updatePassword){
                    return(
                        res
                        .status(201)
                        .json({
                            success: true,
                            message: "Password has successfully been updated!"
                        })
                    )
                }
            }
            return(
                res.status(400)
                .json({
                    success:false,
                    message: "Wrong Passsword, You need to enter the right password, to be able to create another one."
                })
            );
        }else{
            return(
                res
                .status(404)
                .json({
                    success: false,
                    message: "User does not exist"
                })
            )
        }
    }catch(err){
        console.log(err);
        res
        .status(500)
        .json({
            success: false,
            message: "Something went wrong, Please try again later."
        });
    }
}

module.exports = {
    changePassword,
}