const { Hocuspocus } = require("@hocuspocus/server");
const Y = require('yjs');
const {client, removeUsers} = require('../config/redis-config')
const User = require("../model/User");
const Note = require("../model/Note");
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');



const hocuspocus = new Hocuspocus({
    name: "hocuspocus-fra1-01", 
    async onAuthenticate(data){
        const {token} = data;
        const context = {}
        if(token){
            const userId = await jwt.verify(token,process.env.TOKEN_SECRET);
            const user = await User.findById(userId.data._id);
            context.user = {
                id: user._id,
                username: user.username,
                email: user.email
            }
            return context;
        }
        return context
    },
  async onLoadDocument(data){
   const docId = data.documentName;
   const ydoc = data.document;
   const doc = await Note.findOne({ documentID: docId });
   if (doc && doc.content) {
    try {
        const encodedData = Uint8Array.from(Buffer.from(doc.content, 'base64'));
        Y.applyUpdate(ydoc, encodedData);
    } catch (err) {
        console.error('[onLoadDocument] Failed to apply update:', err);
    }
}

return ydoc;
  },
  async onAwarenessUpdate(data){
    const currentUsers = [...data.added, ...data.updated];
    const leftUsers = [...data.removed];

    // Remove users who left
    if (leftUsers.length) {
        await Promise.all(leftUsers.map(value => removeUsers(value.toString())));
    }

    // If no new/updated users, exit
    if (!currentUsers.length) return;

    const users = [...data.states];
    const documentName = data.documentName;

    const liveUsers = users.map(async (user) => {
        if (currentUsers.includes(user.clientId)) {
        const userName = user?.user?.name || "Unknown";
        const _user = {
            name: userName,
            doc_id: documentName.toString(),
        };
        await client.json.set(`active:${user.clientId}`, '$', _user);
        }
    });

    await Promise.all(liveUsers);

  },
  async onChange(data){
    
     const user = data.context.user;
     const documentName = data.documentName;
     const timestamp = Date.now();
     const userLog ={
        user_id: user.id.toString(),
        doc_id: documentName.toString(),
        timestamp: timestamp
     }
     
     const key= user.id.toString() + timestamp.toString();
     await client.json.set(`log:${key}`,'$',userLog);
        await client.expire(`log:${key}`, 60 * 5);
  }
})

module.exports = {hocuspocus}