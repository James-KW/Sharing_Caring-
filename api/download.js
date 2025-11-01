// In-memory storage (same as upload.js)
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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Extract fileId from URL
    const pathParts = req.url.split('/');
    const fileId = pathParts[pathParts.length - 1];
    
    console.log('Download request for fileId:', fileId);
    
    // Check if file exists
    const fileInfo = fileStorage.get(fileId);
    if (!fileInfo) {
      console.log('File not found:', fileId);
      return res.status(404).json({
        success: false,
        message: 'File not found or link has expired'
      });
    }
    
    // Check if already downloaded
    if (fileInfo.downloaded) {
      console.log('File already downloaded:', fileId);
      return res.status(410).json({
        success: false,
        message: 'This file has already been downloaded and the link has expired'
      });
    }
    
    // Mark as downloaded
    fileInfo.downloaded = true;
    fileStorage.set(fileId, fileInfo);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
    res.setHeader('Content-Length', fileInfo.fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the file data
    res.write(fileInfo.fileData);
    res.end();
    
    console.log(`File downloaded successfully: ${fileInfo.fileName} (${fileId})`);
    
    // Delete file after 1 hour (optional cleanup)
    setTimeout(() => {
      if (fileStorage.has(fileId)) {
        fileStorage.delete(fileId);
        downloadCounts.delete(fileId);
        console.log(`File cleaned up: ${fileId}`);
      }
    }, 60 * 60 * 1000); // 1 hour
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed: ' + error.message
    });
  }
};
