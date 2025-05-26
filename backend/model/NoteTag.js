const mongoose = require("mongoose");
const {Schema,model} = mongoose ;

const NoteTagSchema = new Schema({
     noteId:{type: mongoose.Schema.Types.ObjectId, ref:'Note', required:true},
     tagId:{type:mongoose.Schema.Types.ObjectId, ref:'Tag', required:true},
});

module.exports = model('NoteTag',NoteTagSchema);