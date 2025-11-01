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
    const { query } = req;
    const fileId = req.url.split('/').pop();
    
    // In production, get from database
    const fileStorage = new Map(); // This would be your actual storage
    const downloadCounts = new Map();
    
    // Check if file exists
    const fileInfo = fileStorage.get(fileId);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'File not found or link has expired'
      });
    }
    
    // Check if already downloaded
    if (fileInfo.downloaded) {
      return res.status(410).json({
        success: false,
        message: 'This file has already been downloaded and the link has expired'
      });
    }
    
    // Mark as downloaded
    fileInfo.downloaded = true;
    fileStorage.set(fileId, fileInfo);
    
    // In production, you would:
    // 1. Get the actual file from cloud storage
    // 2. Set appropriate headers for download
    // 3. Stream the file to the response
    
    console.log(`File downloaded: ${fileInfo.fileName} (${fileId})`);
    
    // For demo purposes, return file info
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      message: 'File download initiated',
      fileInfo: {
        name: fileInfo.fileName,
        size: fileInfo.fileSize,
        uploaded: fileInfo.uploadTime
      },
      note: 'In production, this would serve the actual file'
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed: ' + error.message
    });
  }
};
