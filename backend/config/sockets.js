let io;
function IOInit(server){
    const { Server } = require("socket.io");
    io = new Server(server,{
        connectionStateRecovery:{
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true,
        },
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });
    io.on("connection", (socket) => {
        socket.on("join-room", (id) => {
            if(id){
                socket.join(id)
            }
        });

     

       socket.on('join-notify-room',(email, cb)=>{
         if(email){ 
             socket.join(email);
         };
         cb(null, "OK");
       }) 

       socket.on("leave-notify-room",(id)=>{
         socket.leave(id);
       })
    
        socket.on("leave-room", (id) => {
            socket.leave(id);
        });
    
        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
        });
    });
    return io;
}

function getIO(){
    if(!io) throw new Error("Socket.io was not initialized");
    return io;
}

module.exports = {IOInit,getIO};