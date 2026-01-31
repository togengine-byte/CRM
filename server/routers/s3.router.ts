import { Router, Request, Response } from 'express';
import multer from 'multer';
import { 
  uploadToS3, 
  getSignedDownloadUrl, 
  getSignedUploadUrl, 
  deleteFromS3, 
  fileExistsInS3,
  getS3Folder 
} from '../lib/s3Service';

const router = Router();

// Configure multer for memory storage (we'll upload to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Upload file to S3
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const context = (req.body.context as 'quote' | 'work' | 'supplier' | 'customer' | 'general') || 'general';
    const folder = getS3Folder(context);

    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    res.json({
      success: true,
      key: result.key,
      url: result.url,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload multiple files to S3
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const context = (req.body.context as 'quote' | 'work' | 'supplier' | 'customer' | 'general') || 'general';
    const folder = getS3Folder(context);

    const results = await Promise.all(
      files.map(async (file) => {
        const result = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          folder
        );
        return {
          key: result.key,
          url: result.url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };
      })
    );

    res.json({
      success: true,
      files: results,
    });
  } catch (error) {
    console.error('Error uploading multiple files to S3:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get signed URL for viewing/downloading a file
router.get('/url/:key(*)', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

    const exists = await fileExistsInS3(key);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    const url = await getSignedDownloadUrl(key, expiresIn);
    res.json({ url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    res.status(500).json({ error: 'Failed to get file URL' });
  }
});

// Get presigned URL for direct upload from client
router.post('/presigned-upload', async (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, context } = req.body;

    if (!fileName || !mimeType) {
      return res.status(400).json({ error: 'fileName and mimeType are required' });
    }

    const folder = getS3Folder(context || 'general');
    const result = await getSignedUploadUrl(fileName, mimeType, folder);

    res.json({
      success: true,
      key: result.key,
      uploadUrl: result.uploadUrl,
    });
  } catch (error) {
    console.error('Error getting presigned upload URL:', error);
    res.status(500).json({ error: 'Failed to get upload URL' });
  }
});

// Delete file from S3
router.delete('/delete/:key(*)', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const exists = await fileExistsInS3(key);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    await deleteFromS3(key);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting from S3:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
