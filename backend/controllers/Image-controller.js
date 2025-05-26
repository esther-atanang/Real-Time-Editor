const cloudinary = require("../config/cloudinary")

const uploadImage = async(imagePath,public_id)=>{
    const options ={
        use_filename: false,
        unique_filename: true,
        overwrite:true,
        public_id: public_id,
    }
    try{
        const result = await cloudinary.uploader.upload(imagePath,options);
        return ({
            url: result.secure_url,
            image_public_id: result.public_id,
        });
    }catch(err){
        console.log(err)
        return null
    }
}

// const getImage
module.exports = { uploadImage }