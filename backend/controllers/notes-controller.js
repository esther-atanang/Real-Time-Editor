const Note = require("../model/Note");
const Tag = require("../model/Tag");
const NoteTag = require("../model/NoteTag");
const User = require("../model/User")
const NoteStatus = require("../model/User_Note_Status");
const { transporter } = require("../config/node-mailer");
const Notification = require("../model/Notification");
const jwt = require("jsonwebtoken")
const Comment = require("../model/Comment");
const shareNote = async (req, res) =>{
    try{
        const {emails, url , permission} = req.body;
     
        //Validates the request body.
        if(!Array.isArray(emails) || emails.length === 0 || url === '' || typeof url !== "string" || !['view','edit','comment'].includes(permission)){
            return(
                res
                .status(400)
                .json({
                     success: false,
                     message:`Invalid payload: expecting { emails: string[], url: string, permission: "view"|"comment"|"edit" }`
                })
            )
        }
        //Create a Promise for all.
        const sendMails = emails.map( (email)=>{
                  const token = jwt.sign({
                email: email,
                permission: permission
            },process.env.TOKEN_SECRET,{expiresIn:'2d'})

           const urlToken = `${url}?token=${token}`
           
            const mailOptions = {
                from: "estheratanang@gmail.com",
                to: email,
                subject: "Hello from Snitch!",
                text: `Here's an invite to be apart of my stitch: ${urlToken}`,
            }
           return transporter.sendMail(mailOptions)
           .then((info)=>({email,status:"fulfilled",info}))
           .catch((err)=>({email, status:"rejected", err}))
        })

        const results = await Promise.all(sendMails);

        const successes = results.filter((res)=> res.status == "fulfilled").map((res)=>res.email);
        const failures = results.filter((res)=>res.status === "rejected").map((res)=>res.email);
      
        return(
            res.status(200)
            .json({
                success: failures.length === 0,
                sendCount: successes.length,
                fails: failures.length
            })
        )
    }catch(err){
       
        res.status(500)
        .json({
            success: false,
            message: "Internal Server error, Please try again later!"
        })
    }
}


const getAllNotes = async (req, res) => {
    try {
        const { _id } = req.info;
        let allUserNotes = await NoteStatus.find({authorID:_id,isArchived:false}).populate({
            path: "notes",
            populate:{
                path:"tags",
                populate: {
                     path: "tagId",
                     select: "name noteId",
                    },
            }
        }).lean()
       
        //Gets the Note
        if(Array.isArray(allUserNotes) && allUserNotes.length > 0){
            allUserNotes = allUserNotes.flatMap((value)=>value.notes);

            const transformedNotes = allUserNotes.map((note) => {
                const tags = note.tags.map((tag) => ({
                    id: tag.tagId._id,
                    name: tag.tagId.name,
                }));
    
                return {
                    ...note,
                    tags,
                };
            });
    
           return( res.status(200).json({
                success: true,
                message: `The user has ${transformedNotes.length} note(s)`,
                data: transformedNotes,
            })
        );
        }
        res.status(200).json({
            success: true,
            message: `The user has no note(s)`,
            data: [],
        });
    } catch (err) {
       
        res.status(500).json({
            success: false,
            message: "Something went wrong, Please try again later.",
        });
    }
};

const getNote = async (req, res) =>{
    try{
        //Generate a general share token which you will pass into the url. don't care about permission.
        const { _id } = req.info;
        const noteId = req.params.id;
        let permission = "edit";
        let token = undefined;
        const profiles = [];
        if(!noteId){
            return(
                res.status(404)
                .json({
                    status: false,
                    message: "No NoteId!"
                })
            )
        }
        // let _note = await Note.findById(noteId);
        // console.log(_note);
        let singleUserNote = await NoteStatus.find({noteID:noteId,authorID:_id}).populate({
            path: "notes",
            populate:{
                path:"tags",
                populate: {
                     path: "tagId",
                     select: "name noteId",
                    },
            }
        }).lean()
        console.log(singleUserNote, "<__HERE")
        singleUserNote = singleUserNote.map(value=>{
            return({
                ...value.notes[0],
                isArchived: value.isArchived
            })
        })
       
        //Get all the profiles 
        if(singleUserNote.length > 0){
            let author = await User.findOne({_id:singleUserNote[0].author})
            author = {
                image: author.image,
                username: author.username,
                email: author.email,
                permission: "edit",
                author: true
            }
            profiles.push(author)
            if(Array.isArray(singleUserNote[0].collaborators) && singleUserNote[0].collaborators.length > 0){
                for(const collaborator of singleUserNote[0].collaborators){
                    let user = await User.findOne({_id:collaborator.author});
                    user = {
                        id: collaborator.author,
                        image: user.image,
                        username: user.username,
                        email: user.email,
                        permission: collaborator.permission
                    }
                    profiles.push(user);
                }
            }
        }
      
       //This is to check if the user is the author of the note
        const isAuthor = (Array.isArray(singleUserNote) && singleUserNote.length > 0) ? singleUserNote[0].author.toString() === _id : false; 
      
        //This is for setting the permission level
        if(!isAuthor){
            const collaborator = singleUserNote[0].collaborators.length > 0 && singleUserNote[0].collaborators.find((collaborator)=> collaborator.author.toString() === _id);
            permission = collaborator.permission
        }
        if(permission === "edit"){
            const payload= {
                noteId:singleUserNote[0]._id,
                authorId: singleUserNote[0].author,
                anyone: true
            }
          
            const [edit_payload, view_payload, comment_payload]= await Promise.all(['edit', 'view', 'comment'].map( async (perm) => {
                const data = {
                    ...payload,
                    permission: perm
                };
                const token = jwt.sign(data,process.env.TOKEN_SECRET);
                return token;
             }));
             token ={
                edit:edit_payload,
                view: view_payload,
                comment: comment_payload
             }

        }
        //Fixing up the tag
        singleUserNote = singleUserNote.map((note) => {
            const tags = note.tags.map((tag) => ({
                id: tag.tagId._id,
                name: tag.tagId.name,
            }));

            return {
                ...note,
                tags,
            };
        });
        //Get collaborators and authors of the notes ---Their profile.

       if(singleUserNote){
         return(
            res
            .status(200)
            .json({
                success: true,
                message: "User Note has been successfully been gotten!",
                data: singleUserNote,
                isAuthor: isAuthor,
                profiles:profiles,
                permission: permission,
                token: token
            })
         )
       }
       return(
         res 
         .status(404)
         .json({
             success: false,
             message: "Note not found!"
         })
       )
    }catch(err){
        console.log("The errorr", err)
        res
        .status(500)
        .json({
            success:false,
            message: "Server error, please try again later."
        })
    }
}

const getArchivedNotes = async (req, res) => {
    try {
        const { _id } = req.info;
        let archivedUserNotes = await NoteStatus.find({authorID:_id,isArchived:true}).populate({
            path: "notes",
            populate:{
                path:"tags",
                populate: {
                     path: "tagId",
                     select: "name noteId",
                    },
            }
        }).lean()
        //Gets the Note
        if(Array.isArray(archivedUserNotes) && archivedUserNotes.length > 0){
        archivedUserNotes = archivedUserNotes.flatMap((value)=>value.notes)
       
        archivedUserNotes = archivedUserNotes.map((note) => {
            const tags = note.tags.map((tag) => ({
                id: tag.tagId._id,
                name: tag.tagId.name,
            }));

            return {
                ...note,
                tags,
            };
        });

        return res.status(200).json({
            success: true,
            message: `The user has ${archivedUserNotes.length} archived note(s)`,
            data: archivedUserNotes,
        });
    }

        res.status(200).json({
            success: false,
            message: "The User has no archived notes...",
            data: [],
        });
    } catch (err) {
        console.error("Errorrrggg",err);
        res.status(500).json({
            success: false,
            message: "Server error, please try again later.",
        });
    }
};

const archiveNote = async(req, res) =>{
    try{
        //I need to get a note, update it and save it 
        const { _id } = req.info;
        const  noteId = req.params.id;
        if(noteId){
            //I want to get the note and Update it
            const userNote = await NoteStatus.findOneAndUpdate({noteID:noteId, authorID:_id},{isArchived:true},{new:true});
            if(userNote){
                return(
                    res
                    .status(200)
                    .json({
                        success: true,
                        message: "The Note has successfully been archived.",
                        data: userNote
                    })
                )
            }
        }
     res
     .status(400)
     .json({
        success: false,
        message: "Note was not archived!"
     })
    }catch(err){
        res
        .status(500)
        .json({
            success:false,
            message: "Server error, please try again later."
        })
    }
}
const restoreNote = async(req, res) =>{
    try{
         //I need to get a note, update it and save it 
         const { _id } = req.info;
         const  noteId = req.params.id;
         if(noteId){
             //I want to get the note and Update it
             const userNote = await NoteStatus.findOneAndUpdate({noteID:noteId, authorID:_id},{isArchived:false},{new:true});
             
             if(userNote){
                 return(
                     res
                     .status(200)
                     .json({
                         success: true,
                         message: "The Note has successfully been restored.",
                         data: userNote
                     })
                 )
             }
         }
      res
      .status(400)
      .json({
         success: false,
         message: "Note was not restored!"
      })

    }catch(err){
        res
        .status(500)
        .json({
            success:false,
            message: "Server error, please try again later."
        })
    }
}

const createNote = async (req, res) =>{
    try{

    /**
     * Represents the structure of the data object.
     * @property {String} title - Required; cannot be empty.
     * @property {String[]} tags - Not Required; if empty, an empty array is stored.
     * @property {String} content - Required;
     * @property {String} author - Required; 
     */
    const {_id } = req.info;
   
    const { title, tags = [], content, documentID} = req.body;
    if(!title){
        return(
            res
            .status(400)
            .json({
                success: false,
                message: "The Title of the Note is required"
            })
        )
    }
   
        //Create Note
        const userNote = await Note.create({
            title: title,
            content: content,
            author: _id,
            documentID: documentID
        })

        //Create Status Relation
        if(userNote){
            await NoteStatus.create({
               authorID: _id,
               noteID: userNote._id,
               isArchived: false
           })
        }

        //Handle Tags only if non empty
        if(Array.isArray(tags) && tags.length > 0){
        for(const tagName of tags) { 
                let tag = await Tag.findOne({name:{$regex:`^${tagName}$`,$options:'i'}});
                if(!tag){
                    tag = await Tag.create({name:tagName,author:_id});
                }
                if(tag && tag.author !== _id){
                    tag = await Tag.findByIdAndUpdate(tag._id,{
                        $addToSet:{
                            coAuthors:{
                                owner:_id
                            }
                        }
                    }, {new:true});
                }
                 await NoteTag.updateOne(
                    {noteId: userNote._id, tagId: tag._id},
                    {noteId: userNote._id, tagId: tag._id},
                    { 'upsert':true} //If it alredy exists then don't create it
                )
            };
        }
        //This adds the tags that were created within the note
        let singleUserNote = await Note.findOne({_id:userNote._id }).populate({path:"tags",select:"tagId -noteId",populate:{
            path:"tagId",
            select:"name"
        }}).lean();
       
        const userTags = singleUserNote.tags.length > 0 ?  singleUserNote.tags.map((tag) => ({
            id: tag.tagId._id,
            name: tag.tagId.name,
        })) : [];

        return(
            res
            .status(201)
            .json(
                {
                    success: true,
                    message: "Note has been successfully created!",
                    data: {
                        ...singleUserNote,
                        tags: userTags
                    }
                }
            )
       )
    
   

    }catch(err){
        console.log(err)
        res.
        status(500)
        .json({
         success: false,
         message: "Something went wrong, Please try again!"   
        })
    }
}; 

const deleteNote = async (req, res) =>{
    try{
        const {_id,email} = req.info;
        const id = req.params.id;
        const note = await Note.findById(id);
        if(!id && !note){
            return(
                res
                .status(404)
                .json({
                    success:false,
                    message: "You did not pass an id of the note!"
                })
            ) 
        }
        const isAuthor = note.author.toString() === _id.toString();
        const isCollaborator = note.collaborators.some(
        (c) => c.author.toString() === _id.toString()
        );

        if(isCollaborator && !isAuthor){
            await NoteStatus.findOneAndDelete({authorID:_id,noteID:id})
            const collaboratorRemoved = await Note.findByIdAndUpdate(id,{
                "$pull":{
                    "collaborators":{
                        author: _id,
                        email: email
                    }
                }
            }, { new: true})
            if(collaboratorRemoved){
                return(
                    res.status(200)
                    .json({
                        success: true,
                        message: "User has been removed from the list of collaborators"
                    })
                )
            }
        }
        if(isAuthor){
            const deletedNote = await Note.findOneAndDelete({_id:id, author:_id});
            //I also want to delete any association with the note
            if(deletedNote){
                await NoteStatus.findOneAndDelete({authorID:_id,noteID:id})
                await NoteTag.deleteMany({noteId:id});
               
                     return(
                         res
                         .status(200)
                         .json({
                             success: true,
                             message: "Note has been successfully deleted"
                         })
                     )
            }
          return(
            res
            .status(400)
            .json({
                success: false,
                message: "Note not found!"
            })
          )
        }
        return(
            res
            .status(403)
            .json({
                success:false,
                message: "You are not authorized to delete this note!"
            })
        )

    }catch(err){
        console.log(err)
        res.
        status(500)
        .json({
         success: false,
         message: "Something went wrong, Please try again!"   
        })
    }
}


const editNote = async (req, res) =>{
    try{
        //You should be able to edit the tags, title, and content
        /**
         * Represents the structure of the request object.
         * @property {String} title - Required, If user did not change title then return Null
         * @property {String[]} tags - Required, relatedTags Array can also be null if user have not added any new tags and unrelated Tags can be null if user has not deleted any tag
         * @property {String} content - Required, If user did not change tags then return Null
         */
        //Get the author
        const {_id} = req.info;
        //Get the Id of the note
        const noteId = req.params.id;
        //We need to check if that note exists
        const{ title, content, unrelatedTags = [], relatedTags = []} = req.body;
        //What matters more is the tags, because what if a user deleted a tag
        //I need to check if the note exists
        const updatedFields = {};
        if(title !== null)  updatedFields.title = title; //If title then add title to the updatedFields
        if(content !== null) updatedFields.content = content; //Same with the content.
        updatedFields.lastModifiedBy = _id;
        const updatedUserNote = await Note.findByIdAndUpdate(noteId,{$set:updatedFields}, {new:true});
      
        // This related tags is for when the user has added a new tag.
        if(relatedTags.length > 0){
            for (const tagName of relatedTags) {
                // Check if the tag already exists
                let existingTag = await Tag.findOne({name:{$regex:`^${tagName}$`,$options:'i'}});
                if(!existingTag){
                     existingTag = await Tag.create({
                         name: tagName,
                         author: _id
                     })
                }
                //This is for if the tag exists but the user is not the author.
                if (existingTag && existingTag.author !== _id) {
                    // Create a new tag if it doesn't exist
                    existingTag = await Tag.findByIdAndUpdate(existingTag._id,{
                        $addToSet:{
                            coAuthors:{
                                owner:_id
                            }
                        }
                    },{new:true});
                }
            
                // Check if the relationship between the note and the tag already exists
                const existingNoteTagRelation = await NoteTag.findOne({
                    noteId: updatedUserNote._id,
                    tagId: existingTag._id,
                });
            
                if (!existingNoteTagRelation) {
                    // Create the relationship if it doesn't exist
                    await NoteTag.create({
                        noteId: updatedUserNote._id,
                        tagId: existingTag._id,
                    });
                }
            }
        }
        //This are the tags that no longer relates to the note, or have been deleted by the user.
        if(unrelatedTags.length > 0){
            for(const tag of unrelatedTags){
                const _tag = await Tag.exists({name:{'$regex':`^${tag}$`, '$options':'i'}});
                if(_tag){
                await NoteTag.deleteOne({noteId:updatedUserNote._id, tagId: _tag._id});
                }
            }
        }
        // I have to add the tags or I will get an error!
        if(updatedUserNote){
            const singleUserNote = await Note.findOne({_id:updatedUserNote._id, author: updatedUserNote.author}).populate({path:"tags",select:"tagId -noteId",populate:{
                path:"tagId",
                select:"name"
            }}).lean(); // Returns plain JavaScript objects
           
                const tags = singleUserNote.tags.map((tag) => ({
                    id: tag.tagId._id,
                    name: tag.tagId.name,
                }));
              console.log(tags)
            // I will return an array here
            return(
                res
                .status(201)
                .json({
                    success:true,
                    message: "Your Note has been updated!",
                    data: {
                        ...singleUserNote,
                        tags:tags
                    }
                })
            )
        };
        
    }catch(err){
        console.log(err)
        res.
        status(500) 
        .json({
         success: false,
         message: "Something went wrong, Please try again!"   
        })
    }
}

const getAllNotesForTag = async (req, res) => {
    try {
        const { _id } = req.info;//author id
        const tagName = req.params.tag;
        const tag = await Tag.findOne({
            name: { $regex: `^${tagName}$`, $options: "i" },
            author: _id,
        }).populate({
            path: "notes",
            select: "-tagId noteId",
        });
       ;
    const notesForTag = tag.notes; // Renamed `_notes` to `notesForTag`
    const noteStatuses = ( Array.isArray(notesForTag) && notesForTag.length > 0) ? notesForTag.map(async (note) => { // Renamed `userNotes` to 
        const noteStatus = await NoteStatus.findOne({ authorID: _id, noteID: note.noteId }).populate({
            path: "notes",
            populate:{
                path:"tags",
                select: "tagId -noteId",
                populate:{
                    path:"tagId",
                    select: "name"
                }
            }
        }).lean() ; // Renamed `userNote` to `noteStatus`
        return noteStatus;
    }) : [];
    const resolvedNoteStatuses = await Promise.all(noteStatuses); // Renamed `gottenNotes` to `resolvedNoteStatuses`
   

    const transformedNotes = (Array.isArray(resolvedNoteStatuses) && resolvedNoteStatuses.length) ? resolvedNoteStatuses.map((value)=>{
            return{
                ...value.notes[0],
                isArchived: value.isArchived
            }
        }) : []
    return(
        res.status(200)
        .json({
            success: false,
            message: "Data gotten!",
            data: transformedNotes
        })
    )
       
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Something went wrong, please try again later!",
        });
    }
};

const createNoteForTag = async(req, res) =>{
    try{
        /**
         * Represents the structure of the data object.
         * @property {String} title - Required; cannot be empty.
         * @property {String[]} tags - Not Required; if empty, an empty array is stored.
         * @property {String} content - Required;
         * @property {String} author - Required; 
         */
        const {_id } = req.info;
        const tagName = req.params.tag;
        const { title, content} = req.body;
        if(title){
            //I need to create the note first so I can get the id.
            const userNote = await Note.create({
                title: title,
                content: content,
                author: _id
            })
            await NoteStatus.create({
                authorID: _id,
                noteID: userNote._id,
                isArchived:false
            })
            //I need to check if there are tags, if there are then create a tag object and then link it to the Notes model.
            const tag = await Tag.findOneAndUpdate({name:tagName, author:_id},{name:tagName, author:_id},{upsert:true});
            if(tag){
               const noteTagRel = await NoteTag.updateOne(
                    {noteId: userNote._id, tagId: tag._id},
                    {noteId: userNote._id, tagId: tag._id},
                    { 'upsert':true,'new':true}, //If it alredy exists then don't create it
                )
                if(noteTagRel){
                        return(
                            res
                            .status(201)
                            .json(
                                {
                                    success: true,
                                    message: "Note has been successfully created!",
                                    data: userNote
                                }
                            )
                       )
                }

            }
         }else{
            return(
                res
                .status(404)
                .json({
                    success: false,
                    message: "Tag does not exist"
                })
            )  
         }
        
        return(
            res
            .status(400)
            .json({
                success: false,
                message: "The Title of the Note is required"
            })
        )
    
        }catch(err){
            console.log(err)
            res.
            status(500)
            .json({
             success: false,
             message: "Something went wrong, Please try again!"   
            })
        }
}

//Get all tags
const getAllTags = async (req, res) =>{
    try{
       
        const { _id } = req.info;
        const tags = await Tag.find({$or:[{author:_id}, {"coAuthors.owner":_id}]});
        if(tags.length > 0){
            return(
                res
                .status(200)
                .json({
                    success: true,
                    message: "All the tags has been successfully gotten!",
                    data: tags
                })

            )
        }
      res
      .status(200)
      .json({
        success: false,
        message: "No tags were found",
        data:tags
      })
    }catch(error){
        res
        .status(500)
        .json({
            success:false,
            message:"Something went wrong, Please try again later!"
        })
    }
}

const search = async (req, res)=>{
    try{ 
        const { _id } = req.info;
        const searchQuery = req.params.searchQuery.toLowerCase(); //The search query can either be a title tag or content.
        //The get all of the notes that belong to a user.
        const userNotes = await Note.find({$or:[{author:_id},{'collaborators.author':_id}]},{_id:1, title:1, author:1,content:1, updatedAt:1, createdAt: 1,collaborators:1}).populate({path:"tags", select:"tagId -noteId -_id",
            populate:{
            path:"tagId",
            select:"name noteId",
            
        }});
      if(userNotes){
       const searchResult = userNotes.filter((note)=>{
            const tags = note.tags.map((value)=>(value.tagId.name).toLowerCase())          
             if(note.title.toLowerCase().includes(searchQuery) || note.content.toLowerCase().includes(searchQuery) || tags.includes(searchQuery)) return note;
        })        
       if(searchResult.length > 0){
        return(
             res.status(200)
             .json({
                success: true,
                message: `(${searchResult.length}) result(s) have been gotten`,
                data: searchResult
             })
        )
       }
       return(
        res.status(200)
        .json({
            success:false,
            message: 'No Results found!',
            data: []
        })
       )
    }
    return(
        res.status(200)
        .json({
            success: false,
            message:'No user notes found, You probably have no notes to search through!'
        })
    )
    }catch(err){
        res.status(500)
        .json({
            success:false,
            message: "Server error, Please try again later!"
        })
    }
}

const addCommentForANote = async(req, res) =>{
    try{
        const { _id } = req.info;
        const noteId = req.params.id;

        const { userComment } = req.body;
        let comment = await Comment.findOne({note: noteId});
        if(!comment){
             comment = await Comment.create({
                note: noteId,
                userComment: [{
                    user:_id,
                    comment: userComment
                }]
             });
        }else{
            comment = await Comment.findOneAndUpdate({note: noteId},{
                $push:{
                    userComment:{
                        user:_id,
                        comment: userComment
                    }
                }
            }, {new: true})
        }

        if(comment){
            return(
                res.status(201)
                .json({
                    success: true,
                    message:"Comment has been added!",
                    data: comment
                })
            )
        }

        //Now if the user passed a comment
    }catch(err){
        console.log(err);
        res.status(500)
        .json({
            success:false,
            message: "Server error, Please try again later!"
        });
    }
}

const getAllCommentsForANote = async(req, res) =>{
    try{
        const {_id} = req.info;
        const{ id } = req.params;
        const comments = await Comment.findOne({note:id}).lean();
        if(!comments || !('userComment' in comments) || ('userComment' in comments) && (comments.userComment.length == 0)){
            return(
                res.status(200)
                .json({
                    success: true,
                    message: "No comments on this note!",
                    data: []
                })
            )
        }

        for(const user of comments.userComment){
            const profile = await User.findOne({_id:user.user});
            user.username = profile.username
        }
        return(
            res.status(200)
            .json({
                success: true,
                data: {...comments, current_user:_id},
                message: "Data Fetched!"
            })
        )

    }catch(err){
        console.log(err);
        res.status(500)
        .json({
            success:false,
            err: err,
            message: "Server error, Please try again later!"
        });
    }
}

const getNotifications = async(req,res) =>{
    try{
        //Create Paginations...
        //I think I should return unseen notifications
        const { _id } = req.info;
        const userNotifications = await Notification.findOne({user:_id}).lean();
        let messages = [];
        if(!userNotifications){
            return(res.status(200)
            .json({
                success:true,
                message: "No Notifications found!",
                data:messages,
            })
        )
        }
        if(userNotifications.hasOwnProperty("messages") && userNotifications.messages.length > 0){
            messages = userNotifications?.messages.filter((message)=>!message.read)
            .sort((a, b)=>new Date(b.createdAt) - new Date(a.createdAt))
             || [];
        }

       return(
         res.status(200)
         .json({
             success: true,
             message: "Notifications have been fetched!",
             data:messages
         })
       )
    }catch(err){
        console.log(err);
        res.status(500)
        .json({
            success:false,
            message: "Server error, Please try again later!"
        }); 
    }
}

const readNotifications = async(req,res) =>{
    try{
        const {_id} = req.info;
        let userNotifications = await Notification.findOne({user:_id});
        if(!userNotifications || userNotifications && userNotifications.messages.length === 0){
            return(
                res.status(200)
                .json({
                    success: true,
                    message: "No notifications found!"
                })
            )
        }
        //Write about what you learnt
        //Implement what is in open ai chatsss
        userNotifications = await Notification.findOneAndUpdate({user:_id},{
            $set:{
                "messages.$[elem].read": true
            }
        },
    {
        arrayFilters:[
            {"elem.read":false}
        ],
        new:true
    })
    return(res.status(200).json({
        success:true,
        message: "Updated",
        data: userNotifications
    }))
        
    }catch(err){
        console.log(err);
        res.status(500)
        .json({
            success:false,
            message: "Server error, Please try again later!"
        });  
    }
}

const changePermission = async(req,res) =>{
 try {
    const { _id } = req.info;
    const noteID = req.params.id;
    const { collaboratorID, permission } = req.body;

    const acceptedPermissions = ['edit', 'comment', 'view'];

    // Validate permission
    if (!acceptedPermissions.includes(permission)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission type.',
      });
    }

    // Only fetch needed fields to reduce payload size
    const note = await Note.findById(noteID).select('author collaborators');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.',
      });
    }

    // Check if requestor is the author
    if (note.author.toString() !== _id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'User is not the author of the note.',
      });
    }

    // Find the collaborator
    const collaborator = note.collaborators.find(
      (c) => c.author.toString() === collaboratorID.toString()
    );

    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'Collaborator not found.',
      });
    }

    // Check if the permission is already the same
    if (collaborator.permission.toLowerCase() === permission.toLowerCase()) {
      return res.status(200).json({
        success: true,
        message: "User's permission is already set to that.",
        data: note,
      });
    }

    // Only then perform the update
    const updatedNote = await Note.findByIdAndUpdate(
      noteID,
      {
        $set: {
          'collaborators.$[elem].permission': permission,
        },
      },
      {
        arrayFilters: [{ 'elem.author': collaboratorID }],
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'User permission updated!',
      data: updatedNote,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later!',
    });
  }
}

const deleteTag = async(req, res)=>{
    try{
        const {_id} = req.info
        const tagName = req.params.tagName;
        const tag = await Tag.findOne({name:tagName});
        if(tag){
            const userTag = await NoteStatus.findOneAndDelete({authorID:_id,tagId:tag._id})
            //What if it is the only user that is connected to this tag.
            const UserTags = await NoteStatus.find({tagId:tag._id});
            if(!UserTags.length){
                 await Tag.findByIdAndDelete(tag._id)
            }
            if(userTag){
                return(
                    res.status(200)
                    .json({
                        success: false,
                        message: "Tag has been deleted"
                    })
                )
            }
        }
    }catch(err){
        console.log(err)
        return res.status(500).json({
        success: false,
        message: 'Server error. Please try again later!',
        });
    }
}

module.exports = {
    search,
    getAllTags,
     getAllNotes,
     getArchivedNotes, 
     getAllNotesForTag,
     createNoteForTag,
     restoreNote, 
     archiveNote,
     getNote,
     createNote,
     editNote,
     deleteNote,
     deleteTag,
     shareNote,
     addCommentForANote,
     getAllCommentsForANote,
     getNotifications,
     readNotifications,
     changePermission
};