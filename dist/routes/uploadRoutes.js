"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/uploadRoutes.ts
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controllers/uploadController");
const router = express_1.default.Router();
// File upload route
router.post('/uploads', uploadController_1.uploadMiddleware, (req, res) => {
    res.status(200).send({ message: 'Upload successful' });
});
exports.default = router;
