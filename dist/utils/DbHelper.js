"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHelper = void 0;
class DbHelper {
    constructor(model) {
        this.model = model;
    }
    async findById(id) {
        return this.model.findById(id).exec();
    }
    async find(query) {
        return this.model.find(query).exec();
    }
    async findOne(query) {
        return this.model.findOne(query).exec();
    }
    async updateById(id, update) {
        return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    }
    async updateMany(filter, update) {
        return this.model.updateMany(filter, update).exec();
    }
    async create(data) {
        return this.model.create(data);
    }
    async deleteById(id) {
        return this.model.findByIdAndDelete(id).exec();
    }
    async deleteMany(filter) {
        return this.model.deleteMany(filter).exec();
    }
}
exports.DbHelper = DbHelper;
