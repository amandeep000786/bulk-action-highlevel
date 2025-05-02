"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = uploadMiddleware;
const uploadService_1 = require("../services/uploadService");
function uploadMiddleware(req, res) {
    return (0, uploadService_1.handleFileUpload)(req, res);
}
