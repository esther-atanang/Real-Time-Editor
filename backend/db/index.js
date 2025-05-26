const mongoose  = require("mongoose");

const connectToDB =  async() =>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDb has successfully connected!")
    }catch(error){
        console.log("An Error Occurred: ",error)
        process.exit(1)
    }
}

module.exports = connectToDB;