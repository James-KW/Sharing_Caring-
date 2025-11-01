const fs = require('fs');
const path = require('path');

// File-based storage in /tmp directory (works in Vercel)
const STORAGE_FILE = '/tmp/file_storage.json';

// Initialize storage file if it doesn't exist
function initStorage() {
    try {
        if (!fs.existsSync(STORAGE_FILE)) {
            fs.writeFileSync(STORAGE_FILE, JSON.stringify({}));
            console.log('Storage file initialized');
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

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

// Clean up old files (older than 24 hours)
function cleanupOldFiles() {
    try {
        const storage = readStorage();
        const now = new Date();
        let changed = false;
        
        for (const fileId in storage) {
            const fileInfo = storage[fileId];
            const uploadTime = new Date(fileInfo.uploadTime);
            const hoursDiff = (now - uploadTime) / (1000 * 60 * 60);
            
            // Delete files older than 24 hours or already downloaded
            if (hoursDiff > 24 || fileInfo.downloaded) {
                delete storage[fileId];
                changed = true;
                console.log(`Cleaned up file: ${fileId}`);
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

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Initialize storage
        initStorage();
        
        // Clean up old files first
        cleanupOldFiles();

        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        
        const buffer = Buffer.concat(chunks);
        
        if (buffer.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file data received' 
            });
        }

        // Generate unique file ID
        const fileId = generateFileId();
        const fileName = req.headers['file-name'] || `file-${fileId}`;
        const fileSize = buffer.length;
        
        // Read current storage
        const storage = readStorage();
        
        // Store file info
        storage[fileId] = {
            fileName: fileName,
            fileData: buffer.toString('base64'),
            fileSize: fileSize,
            uploadTime: new Date().toISOString(),
            downloaded: false,
            downloadCount: 0,
            mimeType: req.headers['content-type'] || 'application/octet-stream'
        };
        
        // Write back to storage
        if (writeStorage(storage)) {
            console.log(`✅ File uploaded: ${fileName} (${fileId}) - Size: ${fileSize} bytes`);
            console.log(`📁 Total files in storage: ${Object.keys(storage).length}`);
            
            res.status(200).json({
                success: true,
                fileId: fileId,
                message: 'File uploaded successfully',
                downloadUrl: `/api/download/${fileId}`
            });
        } else {
            throw new Error('Failed to save file to storage');
        }
        
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Upload failed: ' + error.message
        });
    }
};

function generateFileId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}
