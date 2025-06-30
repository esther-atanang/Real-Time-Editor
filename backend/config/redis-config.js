const {createClient, SCHEMA_FIELD_TYPE} = require('redis');


const client = createClient({
      username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

client.on('error', err => console.log('Redis Client Error', err));

async function dropIndex(){
    try { 
   await client.ft.dropIndex('idx:active_users', { DD: true });
} catch (e) {
    // Index doesn't exist, which is fine
    console.log(e)
}
}



async function removeUsers(key){
    //This removes users that are no longer active on a note.
    try{
        await client.del(key)
    }catch(err){
        console.log(err)
    }
}
async function addActiveUsers(){
    try{
        await client.ft.create('idx:active_users', {
            '$.name':{
                type: SCHEMA_FIELD_TYPE.TEXT,
                AS: 'name'
            },
            '$.doc_id':{
                type: SCHEMA_FIELD_TYPE.TEXT,
                AS: 'doc_id',
            },
        },{
            ON: 'JSON',
            PREFIX: 'active:'
        })
    }  catch(err){
        // console.log(err);
    }
}

async function addChangeLog(){
    try{    
        await client.ft.create('idx:change_log',{
            '$.user_id':{
                 type: SCHEMA_FIELD_TYPE.TEXT,
                 AS: 'user_id'
            },
            '$.doc_id':{
                type: SCHEMA_FIELD_TYPE.TEXT,
                AS: 'doc_id'
            },
            '$.timestamp':{
                type: SCHEMA_FIELD_TYPE.NUMERIC,
                AS: 'date'
            }

        },{
            ON: 'JSON',
            PREFIX: 'log:'
        });

    }catch(err){
        // console.log(err);
    }
}



async function redisClient(){
    await client.connect();  // Ensure Redis is connected first
    // await dropIndex()
    await Promise.all([
        addActiveUsers(),
        addChangeLog(),
    ])
}

module.exports = {redisClient, client, removeUsers};