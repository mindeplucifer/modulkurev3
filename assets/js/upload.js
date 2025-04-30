// Upload module to Cloudinary
async function uploadToCloudinary(file, resourceType = 'auto') {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('resource_type', resourceType);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}

// Handle module upload
async function handleModuleUpload(title, description, category, pdfFile, thumbnailFile) {
    try {
        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('User not logged in');
        }
        
        // Check if user can upload
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists || !userDoc.data().isApproved || !userDoc.data().canUpload) {
            throw new Error('User not authorized to upload');
        }
        
        // Upload PDF to Cloudinary
        const pdfUpload = await uploadToCloudinary(pdfFile, 'auto');
        
        // Upload thumbnail to Cloudinary if provided
        let thumbnailUrl = '';
        if (thumbnailFile) {
            const thumbnailUpload = await uploadToCloudinary(thumbnailFile, 'image');
            thumbnailUrl = thumbnailUpload.secure_url;
        }
        
        // Create module document in Firestore
        const moduleData = {
            title: title,
            description: description,
            category: category,
            pdfUrl: pdfUpload.secure_url,
            thumbnailUrl: thumbnailUrl,
            uploadedBy: user.uid,
            uploadedByName: userDoc.data().name || user.displayName || '',
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isApproved: false,
            downloadCount: 0
        };
        
        await firebase.firestore().collection('modules').add(moduleData);
        
        return true;
    } catch (error) {
        console.error("Error handling module upload:", error);
        throw error;
    }
}

// Check if user can upload
async function checkUserCanUpload(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            return userDoc.data().isApproved && userDoc.data().canUpload;
        }
        
        return false;
    } catch (error) {
        console.error("Error checking if user can upload:", error);
        return false;
    }
}