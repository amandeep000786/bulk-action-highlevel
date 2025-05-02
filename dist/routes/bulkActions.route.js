"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bulkAction_controller_1 = require("../controllers/bulkAction.controller");
const router = express_1.default.Router();
router.post('/bulk-actions', bulkAction_controller_1.postBulkAction);
exports.default = router;
