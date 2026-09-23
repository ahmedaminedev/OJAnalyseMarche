import mongoose, { Schema, Document } from 'mongoose';

export interface IImportRecord extends Document {
  id: string;
  fileName: string;
  fileSize: number;
  fileSizeBytes: number;
  importedAt: Date;
  importedBy: string;
  status: 'SUCCESS' | 'PARTIAL' | 'PROCESSING' | 'PENDING' | 'ERROR';
  availableSheets: string[];
  activeSheetName: string;
  totalRows: number;
  totalColumns: number;
  totalEmptyCells: number;
  issuesCount: {
    errors: number;
    warnings: number;
    info: number;
  };
  sheetSummaries: Array<{
    name: string;
    rows: number;
    columns: number;
  }>;
  previewData: {
    columns: any[];
    rows: any[];
  };
  issues: any[];
}

const ImportRecordSchema = new Schema<IImportRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileSizeBytes: { type: Number, required: true },
    importedAt: { type: Date, default: Date.now },
    importedBy: { type: String, default: 'admin@omoda-jaecoo.tn' },
    status: {
      type: String,
      enum: ['SUCCESS', 'PARTIAL', 'PROCESSING', 'PENDING', 'ERROR'],
      default: 'SUCCESS',
    },
    availableSheets: [{ type: String }],
    activeSheetName: { type: String, required: true },
    totalRows: { type: Number, required: true },
    totalColumns: { type: Number, required: true },
    totalEmptyCells: { type: Number, default: 0 },
    issuesCount: {
      errors: { type: Number, default: 0 },
      warnings: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    sheetSummaries: [
      {
        name: { type: String },
        rows: { type: Number },
        columns: { type: Number },
      },
    ],
    previewData: {
      columns: { type: Schema.Types.Mixed, default: [] },
      rows: { type: Schema.Types.Mixed, default: [] },
    },
    issues: { type: Schema.Types.Mixed, default: [] },
  },
  {
    timestamps: true,
  }
);

export const ImportRecordModel =
  mongoose.models.ImportRecord ||
  mongoose.model<IImportRecord>('ImportRecord', ImportRecordSchema);
