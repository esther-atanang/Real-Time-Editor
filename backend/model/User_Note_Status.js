const { mongoose, Schema } = require("mongoose");

const UserNoteStatusSchema = new Schema({
    authorID: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    noteID:{
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Note'
    },
    isArchived:{
        type: Boolean,
        required: true,
        default: false
    }
}, {timestamps: true ,toObject:{virtuals:true},toJSON:{virtuals: true}});

UserNoteStatusSchema.virtual(
    'notes',
    {
        ref:'Note',
        localField: 'noteID',
        foreignField: '_id'
    }
)


module.exports = mongoose.model('UserNoteStatus', UserNoteStatusSchema);