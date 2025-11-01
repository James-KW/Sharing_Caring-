const fs = require('fs');
const path = require('path');

// Simple in-memory storage (resets on server restart)
const fileStorage = new Map();
const downloadCounts = new Map();

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
    // Get file data from request
    const chunks = [];
    
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Check if file data exists
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
    
    // Store file info
    fileStorage.set(fileId, {
      fileName: fileName,
      fileData: buffer,
      fileSize: fileSize,
      uploadTime: new Date().toISOString(),
      downloaded: false
    });
    
    downloadCounts.set(fileId, 0);
    
    console.log(`File uploaded: ${fileName} (${fileId}) - Size: ${fileSize} bytes`);
    
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
