const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
    noteId:String,
    profileImage:{
        type:String,
        default: null,
    },
    otherUser:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    did:{
        type:String,
        required:true
    },
    read:{
        type:Boolean,
        default: false,
        required:true
    }
},{timestamps:true})

//User //Message
const NotificationSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    messages:[MessageSchema]
},{timestamps:true});

module.exports = mongoose.model('Notification', NotificationSchema);