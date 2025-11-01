const fs = require('fs');
const path = require('path');

// File-based storage in /tmp directory
const STORAGE_FILE = '/tmp/file_storage.json';

function readStorage() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading storage:', error);
    }
    return {};
}

function writeStorage(storage) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing storage:', error);
        return false;
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Extract fileId from URL
        const pathParts = req.url.split('/');
        let fileId = pathParts[pathParts.length - 1];
        
        // Remove any query parameters
        fileId = fileId.split('?')[0];
        
        console.log('🔍 Download request for fileId:', fileId);
        
        // Read storage
        const storage = readStorage();
        console.log('📁 Files in storage:', Object.keys(storage));
        
        // Check if file exists
        const fileInfo = storage[fileId];
        if (!fileInfo) {
            console.log('❌ File not found in storage:', fileId);
            console.log('📋 Available files:', Object.keys(storage));
            return res.status(404).json({
                success: false,
                message: 'File not found or link has expired'
            });
        }
        
        console.log('✅ File found:', fileInfo.fileName);
        
        // Check if already downloaded
        if (fileInfo.downloaded) {
            console.log('🚫 File already downloaded, deleting:', fileId);
            
            // Delete the file after download
            delete storage[fileId];
            writeStorage(storage);
            
            return res.status(410).json({
                success: false,
                message: 'This file has already been downloaded and the link has expired'
            });
        }
        
        // Mark as downloaded
        fileInfo.downloaded = true;
        fileInfo.downloadCount = 1;
        fileInfo.downloadTime = new Date().toISOString();
        storage[fileId] = fileInfo;
        
        // Write updated storage
        if (!writeStorage(storage)) {
            throw new Error('Failed to update storage');
        }
        
        // Convert base64 back to buffer
        const fileBuffer = Buffer.from(fileInfo.fileData, 'base64');
        
        // Set appropriate headers
        const mimeType = fileInfo.mimeType || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
        res.setHeader('Content-Length', fileInfo.fileSize);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-File-Name', encodeURIComponent(fileInfo.fileName));
        
        // Send the file data
        res.write(fileBuffer);
        res.end();
        
        console.log(`✅ File downloaded successfully: ${fileInfo.fileName} (${fileId})`);
        
    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download failed: ' + error.message
        });
    }
};
