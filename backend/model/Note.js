const mongoose  = require("mongoose");
const { Schema } = mongoose;


const CollaboratorSchema = new Schema({
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    email:{
      type: String,
      required:true,
      trim: true   
    },
    permission:{
        type:String,
        enum:['edit','view'],
        default: 'view',
        required: true,
        trim: true,
    }
})
const NoteSchema = new Schema({
    title: {type:String,required:true, trim:true},
    content: {type:String},
    documentID: {type:String},//Will it have a default if none is given or a required Field
    author: {
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User'
    },
    collaborators:[
     {
        type:CollaboratorSchema,
        maxLength: 5,
        maxLength: [5,"You can only have a max of 5 Collaborators per Note!"]
     }
    ],  
    lastModifiedBy:{
       type: mongoose.Schema.Types.ObjectId, 
       ref:'User'
    }
},{timestamps:true, strictPopulate:false ,toJSON:{virtuals:true}, toObject:{virtuals:true} }); //The linked fields will be included in the JSON output

NoteSchema.virtual(
    'tags',
    {
        ref:'NoteTag',
        localField: '_id',
        foreignField:'noteId' //If the local note id is equal to the noteId in the Notetag document then it will add the tag items.
    }
)


module.exports = mongoose.model('Note',NoteSchema);