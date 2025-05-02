import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';

export class DbHelper<T extends Document> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async find(query: FilterQuery<T>): Promise<T[]> {
    return this.model.find(query).exec();
  }

  async findOne(query: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(query).exec();
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>) {
    return this.model.updateMany(filter, update).exec();
  }

  async create(data: Partial<T> | Partial<T>[]): Promise<T | T[]> {
    return this.model.create(data);
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteMany(filter: FilterQuery<T>) {
    return this.model.deleteMany(filter).exec();
  }
}
