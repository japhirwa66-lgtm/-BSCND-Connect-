import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Photo metadata. Files are stored in Cloudinary when configured (production), otherwise in MongoDB
 * (local development fallback). A photo is "unclaimed" (swept after 24h) until a submitted
 * response references it; claiming removes `expiresAt`, so it is never swept.
 */
const uploadSchema = new Schema(
  {
    form: { type: Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
    token: { type: String, required: true, unique: true },
    provider: { type: String, enum: ['mongo', 'cloudinary'], default: 'mongo' },
    // mongo provider (local dev fallback): bytes live in the document
    data: { type: Buffer, select: false, required() { return this.provider !== 'cloudinary'; } },
    // cloudinary provider: only the reference is stored
    url: { type: String },
    publicId: { type: String },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    name: { type: String, default: '', maxlength: 120 },
    claimed: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// Unattached uploads are purged by the in-process sweeper (services/uploads.js) so Cloudinary files are removed too.
uploadSchema.index({ claimed: 1, expiresAt: 1 });

export const Upload = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);
