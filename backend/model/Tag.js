const mongoose = require("mongoose");
const {Schema, model} = mongoose;

const CoAuthorSchema = new Schema({
    owner:  {type:mongoose.Schema.Types.ObjectId, ref:"User"}
})

const TagSchema = new Schema({
     name:{type:String,required:true,trim:true},
     author: {type:mongoose.Schema.Types.ObjectId,ref:"User"},
     coAuthors:[
       {type: CoAuthorSchema}
     ]
},{
    timestamps:true,
    toJSON:{
        virtuals:true //Include the linked documents in the JSON output?:token
    },
    toObject:{
        virtuals:true
    }
})

//It does not link the tables at all, the tables are still very much seperate but creates an illusion to make it look like the table are connected.
TagSchema.virtual(
    'notes',
    {
        ref: 'NoteTag',
        localField: '_id',
        foreignField:'tagId', //If the local tag id matches the tagId in the NoteTag table then you will add the notes to the tag when printing out the JSON output.
    }
);

TagSchema.virtual(
    'authors',
    {
        ref: 'AuthorTag',
        localField: '_id',
        foreignField: 'tagId'
    }
)



module.exports = model('Tag',TagSchema);