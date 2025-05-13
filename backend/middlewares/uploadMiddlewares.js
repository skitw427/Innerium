const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SNAPSHOT_STORAGE_PATH = path.join(__dirname, '..', 'storage', 'snapshots');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, SNAPSHOT_STORAGE_PATH);
  },
  filename: function (req, file, cb) {
    // 일단 고유한 임시 파일명으로 저장
    const tempFilename = `temp_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, tempFilename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', '지원하지 않는 파일 형식입니다. PNG, JPEG, WEBP만 업로드 가능합니다.'), false);
  }
};

const uploadSnapshot = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: fileFilter
});

module.exports = { uploadSnapshot };