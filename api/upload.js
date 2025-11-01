const fs = require('fs');
const path = require('path');

// In-memory storage for demo (use database in production)
let fileStorage = new Map();
let downloadCounts = new Map();

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // In a real implementation, you'd parse the multipart form data
    // For this demo, we'll simulate file processing
    
    // Generate unique file ID
    const fileId = generateFileId();
    const fileName = req.headers['file-name'] || 'file';
    const fileSize = parseInt(req.headers['content-length']) || 0;
    
    // Store file info (in production, save to database and file to cloud storage)
    fileStorage.set(fileId, {
      fileName: fileName,
      fileSize: fileSize,
      uploadTime: new Date().toISOString(),
      downloaded: false
    });
    
    downloadCounts.set(fileId, 0);
    
    console.log(`File uploaded: ${fileName} (${fileId})`);
    
    res.status(200).json({
      success: true,
      fileId: fileId,
      message: 'File uploaded successfully',
      downloadUrl: `/api/download/${fileId}`
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
};

function generateFileId() {
  return Math.random().toString(36).substring(2, 10) + 
         Math.random().toString(36).substring(2, 10);
}
