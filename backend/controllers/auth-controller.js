const User = require("../model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const { transporter } = require("../config/node-mailer")
const { uploadImage } = require("../controllers/Image-controller")
const Image = require("../model/Image");
const fs = require("fs")

const loginUser = async(req, res) =>{
    try{
        console.log(req)
        const { _id, Email, Password,token } = req.body;
     
        if(token){
            //Then the user logged in with google.
            return(
                res
                .status(200)
                .json({
                    success: true,
                    message: "User has Logged In successfully!",
                    data: {
                       _id: _id,
                       email: Email,
                       token: token
                    }
                })
            )
        }
        const user = await User.findOne({email: Email});
        // console.log(user)
        if(user){
            //Checks if password Matches
            const passwordMatch = await bcrypt.compare(Password,user.password)
            if(passwordMatch){
                //I should add a jwt
                const token = jwt.sign({
                    data:{
                        _id: user._id,
                        email: user.email, 
                    },
                },process.env.TOKEN_SECRET);
                return(
                res
                .status(200)
                .json({
                    success: true,
                    message: "User has Logged In successfully!",
                    data: {
                       _id: user._id,
                       email: user.email,
                       token: token
                    }
                })
            )
            }
            return( 
                res.status(400)
                .json({
                    success:false,
                    message: "Incorrect password"
                })
            )
        }
        res
        .status(401)
        .json({
            success:false,
            message: "User does not exist!"
        })

    }catch(error){
        console.log("Error",error);
        res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        })
    }
}

const signUpUser = async(req, res) =>{
    try{
        const { Email, Password, Username='', Location='', Bio='' } = req.body;
        const isAlreadyUser = await User.findOne({email:Email});
        if(isAlreadyUser){
            return(
                res
                .status(400)
                .json({
                    success: false,
                    message: "User already exist!"
                })
            )
        }
        //What of if they did not enter their email or password?
        if(Password){
          const hashedPassword = await bcrypt.hash(Password,saltRounds);
          if(hashedPassword){
              const user = await User.create({
                    email: Email,
                    password: hashedPassword,
                    username: Username,
                    location: Location,
                    bio: Bio,
              });
              if(user){
               return( 
                res
                .status(201)
                .json({
                    success: true,
                    message: "User created successfully!",
                    data: user
                })
            )
              }
          }

        }
    }catch(error){
        console.log(error)
        res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        })
    }
}

const resetPassword = async(req, res) =>{
    try{
        //I need to confirm if the token is correct
        const { password,token } = req.body;
        try{
            const verifiedUser = await jwt.verify(token, process.env.TOKEN_SECRET);
            if(verifiedUser.id){
                const hashedPassword = await bcrypt.hash(password,saltRounds);
                const updatedUser = await User.findByIdAndUpdate(verifiedUser.id,{password: hashedPassword});
                if(updatedUser){
                   return(
                    res
                    .status(201)
                    .json({
                        success: true,
                        message: "Password updated successfully",
                        data: updatedUser
                    })
                )
                }
            }
        }catch(err){
            return(
                res
                .status(401)
                .json({
                    success: false,
                    message: "Invalid token!"
                })
            )
        }

    }catch(error){
        console.log(error)
        res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        })
    }
}

const forgotPassword = async(req, res) =>{
    try{
       const { Email } = req.body;
       if(Email){
        const userExist = await User.findOne({email:Email});
        if(userExist){
            //send a reset link to the user through node mailer with a token!
            const userToken = jwt.sign({
                id: userExist._id,
               email: userExist.email
            },process.env.TOKEN_SECRET,{expiresIn: '15m'});
           if(userToken){
            const redirectLink = `http://localhost:3000/auth/reset-password?token=${userToken}`;
            const mail = await transporter.sendMail({
                from:'"Notes"<notes.dev.app>',
                to:`${Email}`,
                subject:"Reset Password Link",
                html:`<p>Here's the link to reset your password:${redirectLink}</p>`
            })
            if(mail.messageId){
                return(
                res
                .status(201)
                .json({
                   success: true,
                   message:"Link has been sent to your mail!",
                })
            )
            }
           }
        }
        return(
            res
            .status(404)
            .json({
                success: false,
                message: "User does not exist!"
            })
        );
       }
    }catch(error){
        console.log(error);
        res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        })
    }
}

const updateUserAccount = async(req, res) =>{
    try{      
        const {username,email,bio,location,url} = req.body;
        const {_id} = req.info;
        const image = req.file;
        const updatedProfile = {};
        if(username) updatedProfile.username = username;
        if(email) updatedProfile.email = email;
        if(bio) updatedProfile.bio = bio;
        if(location) updatedProfile.location = location;
        if(typeof url === "string"){
            updatedProfile.image = url;
        } 

        if(image){
            const profileImage = await uploadImage(image.path,_id);
            fs.unlinkSync(image.path);
            if(profileImage && profileImage.url) updatedProfile.image = profileImage.url;
        }
        /**
         * update the User's profile
         */
        const userProfile = await User.findByIdAndUpdate(_id,updatedProfile,{new:true});
        return(
            res.status(200)
            .json({
                success: true,
                message:"You Account has updated successfully!",
                data: userProfile
            })
        )
    }catch(err){
        console.log(err);
         res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        })
    }
}

const getUserProfile = async(req, res) =>{
    try{
        const {_id} = req.info;
        const userProfile = await User.findById(_id);
        return(
            res.status(200)
            .json({
                success: true,
                message:"Account gotten successfully",
                data: userProfile
            })
        )
    }catch(err){
        console.log(err);
         res.status(500)
        .json({
            success: false,
            message: "An error occured, Please try again later."
        }) 
    }
}

module.exports = {
    loginUser,
    signUpUser,
    resetPassword,
    forgotPassword,
    updateUserAccount,
    getUserProfile,
}
