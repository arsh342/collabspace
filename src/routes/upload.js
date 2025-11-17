const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateSession } = require("../middleware/auth");
const { logger } = require("../middleware/logger");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|mp4|wav|avi|mov/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, documents, and media files are allowed."));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// @route   POST /api/upload
// @desc    Upload a file for chat attachment
// @access  Private
router.post("/", authenticateSession, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/api/files/${req.file.filename}`,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    logger.info(`File uploaded: ${req.file.originalname} by user ${req.user._id}`);

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: fileInfo,
    });

  } catch (error) {
    logger.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
});

// @route   GET /api/files/:filename
// @desc    Serve uploaded files
// @access  Private (optional - you might want to make some files public)
router.get("/files/:filename", authenticateSession, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Get file stats for proper headers
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type
    let contentType = "application/octet-stream";
    if ([".jpg", ".jpeg", ".png", ".gif"].includes(fileExtension)) {
      contentType = `image/${fileExtension.slice(1)}`;
    } else if (fileExtension === ".pdf") {
      contentType = "application/pdf";
    } else if ([".doc", ".docx"].includes(fileExtension)) {
      contentType = "application/msword";
    } else if (fileExtension === ".txt") {
      contentType = "text/plain";
    } else if ([".mp3", ".wav"].includes(fileExtension)) {
      contentType = `audio/${fileExtension.slice(1)}`;
    } else if ([".mp4", ".avi", ".mov"].includes(fileExtension)) {
      contentType = `video/${fileExtension.slice(1)}`;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);
        
    // For images, allow inline display; for others, suggest download
    if (contentType.startsWith("image/")) {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filename)}"`);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    logger.error("File serving error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to serve file",
      error: error.message,
    });
  }
});

module.exports = router;