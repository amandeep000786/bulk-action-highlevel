"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
exports.handleFileUpload = handleFileUpload;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csvParser_1 = require("./csvParser");
// Configure file storage location
const uploadDir = path_1.default.resolve(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir);
const storage = multer_1.default.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = (0, multer_1.default)({ storage });
// File upload handler
exports.uploadMiddleware = upload.single('file');
// Handles file upload, parsing, and returning data
async function handleFileUpload(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
    }
    try {
        // Parse CSV file
        const data = await (0, csvParser_1.parseCSV)(req.file.path);
        return res.status(200).json({
            message: 'File uploaded and parsed successfully',
            filePath: req.file.path,
            fileName: req.file.filename,
            data, // Send parsed data back
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error parsing CSV file', error: error.message });
    }
}
