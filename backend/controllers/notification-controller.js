const Notification = require("../model/Notification")
const User = require("../model/User");
const Note = require("../model/Note");
const {client} = require('../config/redis-config')


async function NotifyUsers (io, data){
        let usersInAroom = io.sockets.adapter.rooms;
        const roomId =  data.documentKey._id.toString();
        io.to(roomId).emit("update", data); 
        const userNote = await Note.findOne({_id:roomId});
        if(!userNote) return;
        //Note owners
        const author = userNote.author;
        const collaborators = userNote.collaborators;

        const usersToNotify = new Set([author.toString(),...collaborators.map((collaborator)=> collaborator.author.toString() )]);

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; 
        const now = Date.now();
        let usersWhoMadeAChange = await client.ft.search('idx:change_log',`${roomId.toString()} @date:[${fiveMinutesAgo} ${now}]`);
       

        if(!usersWhoMadeAChange.total) return 
        usersWhoMadeAChange = new Set(usersWhoMadeAChange.documents.map((values)=>{
            return(values.value.user_id.toString())
        }));
        let usersToNotNotify = await client.ft.search('idx:active_users', roomId.toString(), {
            RETURN: ['name']
        });
        if(!usersToNotNotify.total) return;
        usersToNotNotify = await Promise.all(usersToNotNotify.documents.map(async(user)=>{
            const _user = await User.findOne({username: user.value.name})
            if(_user){
                return _user._id.toString()
            }
        }));

        usersInAroom = await Promise.all(Array.from(usersInAroom.keys()).map(async(email)=>{ 
            const user = await User.findOne({email:email}) 
            if(user) return user._id.toString()
        }));
        usersInAroom = usersInAroom.filter((id)=>id)

        const users = new Set( [...usersWhoMadeAChange,...usersToNotNotify,...usersInAroom] );
        for(const user of users){
            if(usersToNotify.has(user)){
                usersToNotify.delete(user) //I have to make sure that it is a bunch of ids or usernames
            }
        }
        if(!usersToNotify.size)return;
       for (const user of usersToNotify) {
            for(const userWhoMadeChange of usersWhoMadeAChange){
                try {
                    const otherUser = await User.findOne({_id:userWhoMadeChange});

                   const notification = await Notification.findOneAndUpdate(
                    { user: user },
                    {
                        $push: {
                            messages: {
                                profileImage:otherUser.image,
                                otherUser: otherUser._id,
                                did: `${otherUser.email} updated your Note`,
                                noteId: userNote._id
                            },
                        },
                    },
                    { new: true, upsert: true } // Create the document if it doesn't exist
                );
                
                const notifiedUser = await User.findOne({ _id: user });
                io.to(notifiedUser.email).emit("notification", notification);

            } catch (err) {
                console.error(`Failed to notify user ${user}:`, err);
            }
            }
           
        }
}

module.exports = {NotifyUsers}
