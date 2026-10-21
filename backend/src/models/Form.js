import mongoose from 'mongoose';
import { FIELD_TYPES, DEFAULT_CONFIRMATION } from '../constants.js';

const { Schema } = mongoose;

const fieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    label: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '', maxlength: 500 },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    maxFiles: { type: Number, default: 1, min: 1, max: 10 },
  },
  { _id: false },
);

const formSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    adminKeyHash: { type: String, required: true, unique: true, select: false },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    fields: { type: [fieldSchema], default: [] },
    confirmationMessage: { type: String, default: DEFAULT_CONFIRMATION, maxlength: 500 },
    isOpen: { type: Boolean, default: true },
    closesAt: { type: Date, default: null },
    maxResponses: { type: Number, default: null, min: 1 },
    responseCount: { type: Number, default: 0, min: 0 },
    resultsPublic: { type: Boolean, default: true },
    socialLinks: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Form = mongoose.models.Form || mongoose.model('Form', formSchema);
