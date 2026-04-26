// api/image-uploader.js

/**
 * Image upload karne ka function (Firebase Storage)
 * @param {File} file - User dwara select ki gayi image file
 * @returns {Promise<String>} - Upload hone ke baad Firebase ka secure Download URL return karega
 */
async function uploadImageToFirebase(file) {
    if (!file) {
        alert("🚨 Please select an image first!");
        return null;
    }

    try {
        console.log("⏳ Uploading Image to Firebase Storage...");
        
        // Same naam ki image overwrite na ho, isliye Date.now() add kiya hai
        const uniqueFileName = Date.now() + "_" + file.name;
        
        // Firebase Storage me 'products' naam ka folder banega
        const storageRef = storage.ref('products/' + uniqueFileName);

        // Upload process start
        const uploadTask = await storageRef.put(file);

        // Upload success hone par Download URL get karo
        const downloadURL = await uploadTask.ref.getDownloadURL();
        
        console.log("✅ Image Uploaded Successfully:", downloadURL);
        return downloadURL;

    } catch (error) {
        console.error("❌ Image Upload Failed:", error);
        alert("🚨 Image upload failed. Check console for errors.");
        return null;
    }
}
