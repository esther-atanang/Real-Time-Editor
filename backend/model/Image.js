const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
    url: String,
    public_id:{
        type:String,
        unique: true,
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
},{timestamps:true});


module.exports = mongoose.model('Image',ImageSchema);