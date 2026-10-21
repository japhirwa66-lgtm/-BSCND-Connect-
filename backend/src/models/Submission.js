import mongoose from 'mongoose';

const { Schema } = mongoose;

const submissionSchema = new Schema(
  {
    form: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    // { [fieldId]: value } — field ids are validated to be safe object keys
    answers: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

submissionSchema.index({ form: 1, createdAt: -1 });

export const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
