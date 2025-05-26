const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comment:String
},{timestamps:true})

const CommentsSchema = new mongoose.Schema({
     note:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Note'
     },
     userComment:[CommentSchema]
});

module.exports = mongoose.model("Comment", CommentsSchema);