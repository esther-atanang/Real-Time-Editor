let io;
const User = require("../model/User");

function IOInit(server){
    const { Server } = require("socket.io");
    io = new Server(server,{
        connectionStateRecovery:{
            // the backup duration of the sessions and the packets
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true,
        },
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });
    io.on("connection", (socket) => {
        console.log("user connected ", socket.id)
        socket.on("join-room", (id) => {
            if(id){
                socket.join(id)
            }
        });
        
        socket.on("active", async (data) => {
            try {
                const paths = data.path.split('/');
                const user = await User.findOne({ email: data.email });
    
                if (!user) {
                    console.log("User not found!");
                    return;
                }
                socket.join(user.email);
                
                socket.activeUser = {
                    user: user._id.toString(), // Ensure it's a string
                    pathOn: paths.length > 2 ? paths[2] : '', // Update the active path
                };
    
                console.log(`Socket ${socket.id} is active for user ${socket.activeUser.user} on path ${socket.activeUser.pathOn}`);
            } catch (err) {
                console.error("Error in active event:", err);
            }
        });

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