require("dotenv").config();
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const Note = require("./model/Note")
const Comment = require("./model/Comment");
const Notification = require("./model/Notification")
const User = require("./model/User");
const app = express();
const PORT = process.env.PORT || 3000;
const connectToDB = require("./db/index");
const authRoutes = require("./routes/auth-routes")
const dashboardRoutes = require("./routes/dashboard-routes");
const cors = require("cors");
const { IOInit, getIO } = require("./config/sockets");


const server = createServer(app);
IOInit(server);
const io = getIO();

//connect your database
connectToDB();

app.use(cors());
app.use(express.json());

//auth routes
app.use("/api/auth/",authRoutes);
app.use("/api/dashboard/", dashboardRoutes);





//Watch for changes that might occur;
Note.watch().on("change",(data)=>{ 
    setTimeout(async()=>{
        //Can I use last modifiedby.
        let lastModifiedBy = (data.hasOwnProperty("updateDescription") && data.updateDescription.hasOwnProperty("updatedFields")) ? data.updateDescription.updatedFields.lastModifiedBy : undefined;
        //Sort this out
        const roomId = data.documentKey._id.toString();  
        
        io.to(roomId).emit("update", data); 
        const userNote = await Note.findOne({_id:roomId});
        if(!userNote){ 
            return;
        }

        if(!lastModifiedBy)lastModifiedBy = userNote.lastModifiedBy;
        const { author, collaborators} = userNote;
        //I want to get all the users 
        const usersToNotify = new Set([author.toString(),...collaborators.map((collaborator)=> collaborator.author.toString() )]);
        
  
        io.sockets.sockets.forEach((socket) => {
            if (socket.activeUser && (socket.activeUser.pathOn.toString() === roomId.toString() || socket.activeUser.user.toString() === lastModifiedBy.toString() ) ) {
                // console.log(`User ${socket.activeUser.user} is active on the note, skipping notification.`);
                usersToNotify.delete(socket.activeUser.user); // Remove active user from the notification list
            }
        })
     
    //    for (const user of usersToNotify) {
    //         try {
    //             const otherUser = await User.findOne({_id:lastModifiedBy})
    //             const notification = await Notification.findOneAndUpdate(
    //                 { user: user },
    //                 {
    //                     $push: {
    //                         messages: {
    //                             otherUser: lastModifiedBy,
    //                             did: `${otherUser.email} updated your Note`,
    //                         },
    //                     },
    //                 },
    //                 { new: true, upsert: true } // Create the document if it doesn't exist
    //             );
    //             const notifiedUser = await User.findOne({ _id: user });
    //             io.to(notifiedUser.email).emit("notification", notification);

    //         } catch (err) {
    //             console.error(`Failed to notify user ${user}:`, err);
    //         }
    //     }
    },5000);
})

Comment.watch([], { fullDocument: 'updateLookup' }).on("change",(data)=>{
     const noteId = data.fullDocument?.note;
   
    setTimeout(()=>{
        io.to(noteId.toString()).emit("dbUpdate", data.fullDocument);
    },5000); 
})
    

server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
});
