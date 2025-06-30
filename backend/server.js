require("dotenv").config();
const express = require("express");
const { createServer } = require("node:http");
require("./db/index");
const Note = require("./model/Note")
const Comment = require("./model/Comment");
const {hocuspocus} = require('./config/hocuspocus')
const PORT = 3002;
const authRoutes = require("./routes/auth-routes")
const dashboardRoutes = require("./routes/dashboard-routes");
const cors = require("cors");
const { IOInit, getIO } = require("./config/sockets");
const expressWebsockets = require("express-ws")
const {redisClient} = require('./config/redis-config')
const { NotifyUsers } = require("./controllers/notification-controller");



// Setup your express instance using the express-ws extension
const _app =  express();
const server = createServer(_app);
const { app } = expressWebsockets(_app,server);

IOInit(server);
const io = getIO();

//I will add much of the initializations some where, probably inside a main function.
// connect your database
redisClient();


app.use(cors());
app.use(express.json());

//auth routes
app.use("/api/auth/",authRoutes);
app.use("/api/dashboard/", dashboardRoutes);
//Web socket route
app.ws("/collaboration", (ws, req) => {
  hocuspocus.handleConnection(ws, req);
});

//Watch for changes that might occur;
Note.watch().on("change",(data)=>{ 
    setTimeout(()=>NotifyUsers(io, data),5000);
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

module.exports = app;