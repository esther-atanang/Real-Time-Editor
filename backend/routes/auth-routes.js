const express = require('express');
const router = express.Router();
const{loginUser, signUpUser, resetPassword, forgotPassword, updateUserAccount, getUserProfile} = require("../controllers/auth-controller");
const {googleAuthMiddleware, checkIfUser } = require("../middleware/auth-middleware")
const multer = require('multer');
const storage = multer.diskStorage({
 destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + "." + file.mimetype.split("/")[1])
  }
})
const upload = multer({ storage:storage });

router.post("/login",googleAuthMiddleware,loginUser);
router.post("/signup",signUpUser);
router.post("/reset-password",resetPassword);
router.post("/forgot-password",forgotPassword);
router.put("/update-profile", checkIfUser,upload.single("image"),updateUserAccount);
router.get('/get-profile',checkIfUser,getUserProfile);

module.exports = router