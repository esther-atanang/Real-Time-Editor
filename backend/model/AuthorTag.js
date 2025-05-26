const { mongoose, Schema } = require("mongoose");

const AuthorTagSchema = new Schema({
    authorId:{
        type: Schema.Types.ObjectId,
        required:true,
        ref: 'User'
    },
    tagId:{
        type: Schema.Types.ObjectId,
        required:true,
        ref: 'Tag'
    }
});

module.exports = mongoose.model('AuthorTag',AuthorTagSchema);

