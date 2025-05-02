"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postBulkAction = void 0;
const bulkAction_service_1 = require("../services/bulkAction.service");
const postBulkAction = async (req, res) => {
    try {
        const result = await (0, bulkAction_service_1.createBulkAction)(req.body);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to create bulk action' });
    }
};
exports.postBulkAction = postBulkAction;
