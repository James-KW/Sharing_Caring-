const fs = require('fs');
const path = require('path');

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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const storage = readStorage();
        const fileCount = Object.keys(storage).length;
        
        res.status(200).json({
            success: true,
            fileCount: fileCount,
            files: Object.keys(storage),
            storage: storage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Status check failed: ' + error.message
        });
    }
};
