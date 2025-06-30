const mongoose  = require("mongoose");

class DB{
    constructor(){
        this._connect();
    }

    _connect(){
        mongoose.connect(process.env.MONGODB_URI)
        .then(()=>{
             console.log("MongoDB has successfully connected!")
        }).catch((err)=>{
             console.log(err)
             process.exit(1)
        })
    }
}

module.exports = new DB()