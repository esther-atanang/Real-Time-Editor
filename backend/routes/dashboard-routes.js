const express = require("express");
const router = express.Router();
const { changePassword } = require("../controllers/settings-controller");
const { checkIfUser, checkIfOwnerOfNote } = require("../middleware/auth-middleware");
const { createNote, deleteNote, editNote, getAllNotes, getNote, getArchivedNotes, restoreNote, archiveNote, getAllTags,getAllNotesForTag, createNoteForTag, search, shareNote, addCommentForANote, getAllCommentsForANote, getNotifications, readNotifications, changePermission} = require("../controllers/notes-controller");

//GetNotifications
router.get("/notifications", checkIfUser, getNotifications);
//read notifications
router.put("/notifications", checkIfUser, readNotifications);
//Tags
router.get("/tags", checkIfUser, getAllTags);
//Notes
router.get('/all-notes', checkIfUser, getAllNotes);

//get all Note for tag
router.get("/all-notes/:tag",checkIfUser, getAllNotesForTag);

//get a single Note
router.get("/note/:id", checkIfUser, checkIfOwnerOfNote , getNote)

//get all archived Notes
router.get("/archived-note", checkIfUser, getArchivedNotes);

//restore a Note
router.get("/restore-note/:id", checkIfUser, restoreNote);

//Archive a Note
router.get("/archive-note/:id", checkIfUser, archiveNote);

//Get search results
router.get('/search/:searchQuery', checkIfUser, search);

//Add a note
router.post('/all-notes/create', checkIfUser, createNote);

router.post('/all-notes/create/:tag', checkIfUser, createNoteForTag);

// add a comment
router.post("/all-notes/:id/comment", checkIfUser, addCommentForANote);


//Change the user permission
router.put("/change-permission/:id", checkIfUser, changePermission);

//get all comments
router.get("/all-notes/:id/comment", checkIfUser, getAllCommentsForANote);

//edit note
router.put("/all-note/edit/:id", checkIfUser, editNote);

//Delete Note
router.delete("/all-notes/delete/:id", checkIfUser, deleteNote);

//Archive Note (you can still edit and delete note)

//settings
router.post("/setting/change-password", checkIfUser, changePassword);

//Share Note
router.post("/note/share",checkIfUser, shareNote);


module.exports = router;