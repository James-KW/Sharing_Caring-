const fs = require('fs');
const path = require('path');

// File-based storage (/tmp directory in Vercel)
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

function cleanupOldFiles() {
    try {
        const storage = readStorage();
        const now = new Date();
        let changed = false;
        
        for (const fileId in storage) {
            const fileInfo = storage[fileId];
            const uploadTime = new Date(fileInfo.uploadTime);
            const hoursDiff = (now - uploadTime) / (1000 * 60 * 60);
            
            // Delete files older than 24 hours
            if (hoursDiff > 24) {
                delete storage[fileId];
                changed = true;
                console.log(`Cleaned up old file: ${fileId}`);
            }
        }
        
        if (changed) {
            writeStorage(storage);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
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
        const fileId = pathParts[pathParts.length - 1];
        
        console.log('Download request for fileId:', fileId);
        
        // Clean up old files first
        cleanupOldFiles();
        
        // Read storage
        const storage = readStorage();
        
        // Check if file exists
        const fileInfo = storage[fileId];
        if (!fileInfo) {
            console.log('File not found:', fileId);
            return res.status(404).json({
                success: false,
                message: 'File not found or link has expired'
            });
        }
        
        // Check if already downloaded (one-time download)
        if (fileInfo.downloaded) {
            console.log('File already downloaded:', fileId);
            
            // Delete the file after first download
            delete storage[fileId];
            writeStorage(storage);
            
            return res.status(410).json({
                success: false,
                message: 'This file has already been downloaded and the link has expired'
            });
        }
        
        // Mark as downloaded
        fileInfo.downloaded = true;
        fileInfo.downloadCount = (fileInfo.downloadCount || 0) + 1;
        fileInfo.lastDownloadTime = new Date().toISOString();
        storage[fileId] = fileInfo;
        
        // Write updated storage
        if (!writeStorage(storage)) {
            throw new Error('Failed to update storage');
        }
        
        // Convert base64 back to buffer
        const fileBuffer = Buffer.from(fileInfo.fileData, 'base64');
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
        res.setHeader('Content-Length', fileInfo.fileSize);
        res.setHeader('Cache-Control', 'no-cache');
        
        // Send the file data
        res.write(fileBuffer);
        res.end();
        
        console.log(`File downloaded successfully: ${fileInfo.fileName} (${fileId})`);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Download failed: ' + error.message
        });
    }
};
