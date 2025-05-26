const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  username:{
    type:String,
    unique: true,
    trim: true
  },
  location:String,
  bio:String,
  image:String,
  email:{
     type: String,
     required: true,
     unique: true,
     trim: true,
  },
  password:{
    type:String,
    required: true
  },

},{timestamps:true});

module.exports = mongoose.model('User', UserSchema);