const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library")
const User = require("../model/User");
const Note = require("../model/Note");
const NoteStatus = require("../model/User_Note_Status")
const NoteTag = require("../model/NoteTag");
const Tag = require("../model/Tag");
const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
)

const googleAuthMiddleware = async (req, res,next) =>{
    try{
        const {Email, Password} = req.body;
        let tokenId = req.headers.authorization
        if(tokenId && !Email && !Password){ 
            const ticket = await client.verifyIdToken({
                idToken: tokenId.slice(7),
                audience:  process.env.GOOGLE_CLIENT_ID 
            })
            const payload = ticket.getPayload();
            if(payload.aud !== process.env.GOOGLE_CLIENT_ID){
                return (
                    res.status(401)
                .json({
                    message:"Unauthorized user!"
                }))
            }
            const {email} = payload;
            //It here I will sign the user in.
            /**
             * I need to check if the user exists 
             */
            let user = await User.exists({email:email}); //The password will be an empty string
            if(user){
                return(
                    res.status(400)
                    .json({
                        success: false,
                        message: "User already exists!"
                    })
                )
            }
            if(!user){
                user = await User.create({
                     email: email,
                     password: ' ',
                });
            }
            const authToken = jwt.sign({
               data:{
                _id: user._id,
                email: user.email    
            }
            },process.env.TOKEN_SECRET);
            if(authToken){
                 req.body = {
                    _id: user._id,
                    Email: user.email,
                    Password: user.password,
                    token: authToken
                }

                return next()
            }
        }else{
            return next()
        }
        return next()
    }catch(err){
        console.log("Hereee",err);
        res.status(500)
        .json({
            success: false,
            message: "Something went wrong, Please try again later."
        });
    }
}

const checkIfUser = async (req,res, next) =>{
    try{
        const bearersToken = req.header('Authorization') || undefined;
        const token = bearersToken ? bearersToken.split(" ")[1] : undefined; 
        if(token){
            let payload = await jwt.verify(token,process.env.TOKEN_SECRET);
            if(payload){
                req.info = payload.data;
                next();
            }else{
                return(
                    res
                    .status(401)
                    .json({
                        success: false,
                        message: "Access not granted!"
                    })
                );
            }

        }else{
            return(
                res.
                status(404)
                .json({
                    success:false,
                    message: "Token not found!"
                })
            )
        }
    }catch(err){
        console.log("Error",err);
        res.status(500)
        .json({
            err:err,
            success: false,
            message: "Something went wrong, Please try again later."
        });
    }
}

// I will add this whenever a user opens a singleNote, to check if the own the note or not
const checkIfOwnerOfNote = async (req, res, next) =>{
    try{
        const {_id,email} = req.info;
        const noteID = req.params.id;
        const token = req.query.token;
        
        const userNote = await Note.findOne({_id:noteID});
        console.log(userNote)
        if(!userNote){
            return(
                res.status(404)
                .json({
                    success:false,
                    message: "Note not found!"
                })
            )
        }
        if(_id && noteID){
            if(userNote.author.toString() === _id){
                return next()
            }
            const isCollaborator = userNote.collaborators.some((collaborator)=>collaborator.author.toString() === _id);
            if(isCollaborator) return next();
        }
        if(token && noteID && _id){
            const payload = await jwt.verify(token,process.env.TOKEN_SECRET);
           
            if(payload.hasOwnProperty("email") && payload.email !== email){
                return(
                    res.status(401)
                    .json({
                        success: false,
                        message: "You are not allowed to access this note!"
                    })
                )
            }
            if(payload.hasOwnProperty("anyone") && payload.anyone){
                //This is for general users
                if(payload.noteId === userNote._id.toString() && payload.authorId === userNote.author.toString()){
                    const collabNote = await Note.findByIdAndUpdate(noteID,
                        {
                         $addToSet:{
                            collaborators:{
                                email: email,
                                author: _id,
                                permission: payload.permission,
                             }
                         }
                    },{new:true});
                    //I have to get all the note tags 
                    const Tags = await NoteTag.find({noteId:collabNote._id});
                    for(let tag of Tags){
                        //I want to add user as a co-owner of the Tag;    
                        await Tag.updateOne(
                            { _id: tag.tagId, author: { $ne: _id } }, // Only update if the user is not the author
                            {
                                $addToSet: {
                                    coAuthors: {
                                        owner: _id,
                                    },
                                },
                            }
                        );
                    }
                         const status = await NoteStatus.create({
                         noteID: collabNote._id,
                         authorID: _id,
                         isArchived: false
                    })
                    if(collabNote && status){
                        return next();
                    }
                }
            }else{
            //This is for specific users
            if(payload && payload.hasOwnProperty("email")){   
                const collabNote = await Note.findByIdAndUpdate(noteID,
                    {
                     $addToSet:{
                        collaborators:{
                            email: email,
                            author: _id,
                            permission: payload.permission,
                         }
                     }
                },{new:true});  
                const Tags = await NoteTag.find({noteId:collabNote._id});
                for(let tag of Tags){
                    //I want to add user as a co-owner of the Tag;    
                    await Tag.updateOne(
                        { _id: tag.tagId, author: { $ne: _id } }, // Only update if the user is not the author
                        {
                            $addToSet: {
                                coAuthors: {
                                    owner: _id,
                                },
                            },
                        }
                    );
                }
                const status = await NoteStatus.create({
                     noteID: collabNote._id,
                     authorID: _id,
                     isArchived: false
                })
                if(collabNote && status){
                    return next();
                }
            }
        }
        }
        return res.status(401)
        .json({
             success: false,
             message: "You do not have permission to view this note!"
        })
    }catch(err){
        if(err.name === 'CastError'){
            return(
                res.status(404)
                .json({
                    success: false,
                    message: "Note does not exist!"
                })
            )
        }
        res.status(500)
        .json({
            success: false,
            message: "Internal server error, Please try again later."
        })
    }
}

module.exports = { checkIfUser, googleAuthMiddleware, checkIfOwnerOfNote };