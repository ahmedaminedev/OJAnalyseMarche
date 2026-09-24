import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WizardStepId,
  FileConfig,
  StructureConfig,
  ColumnSetting,
  UnpivotConfig,
  CleaningConfig,
  SemanticMappingConfig,
  ColumnStatSummary,
  QualitySummary,
  ChecksumItem,
  UploadChunkState,
  ReconciliationReportUI,
  VariantMergeRule,
  WizardColumnType,
  WizardColumnRole,
} from '../types/wizard';
import { calculateFileHash, detectCsvDelimiter } from '../utils/csvDetector';
import { isPeriodHeader } from '../utils/unpivotHelper';
import { suggestSemanticMapping } from '../utils/semanticDetector';
import { workerClient } from '../services/workerClient';
import { importService, DuplicateFileConflict } from '../services/importService';

export function useImportWizard(currentUserEmail: string = 'utilisateur@omoda-jaecoo.tn') {
  const [currentStep, setCurrentStep] = useState<WizardStepId>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Raw workbook data across sheets
  const [rawWorkbook, setRawWorkbook] = useState<Record<string, unknown[][]>>({});
  const rawFileBufferRef = useRef<ArrayBuffer | null>(null);

  // 1. File Config
  const [fileConfig, setFileConfig] = useState<FileConfig>({
    file: null,
    fileName: '',
    fileSizeBytes: 0,
    fileHash: '',
    fileType: 'unknown',
    csvDelimiter: ';',
    csvEncoding: 'UTF-8',
    availableSheets: [],
  });

  // 2. Structure Config
  const [structureConfig, setStructureConfig] = useState<StructureConfig>({
    activeSheetName: '',
    headerRowIndex: 0,
    firstDataRowIndex: 1,
    lastDataRowIndex: null,
    ignoreEmptyRows: true,
    ignoreTotalRows: true,
    fillDownMergedCells: false,
  });

  // Raw rows for preview in step 2 (first 10 rows of sheet)
  const [rawSheetPreview, setRawSheetPreview] = useState<unknown[][]>([]);

  // 3. Column Settings
  const [columns, setColumns] = useState<ColumnSetting[]>([]);

  // 4. Unpivot Config
  const [unpivotConfig, setUnpivotConfig] = useState<UnpivotConfig>({
    enabled: false,
    fixedColumnKeys: [],
    unpivotColumnKeys: [],
    attributeColumnName: 'Période',
    valueColumnName: 'Volume',
    attributeIsDate: true,
  });

  // 5. Cleaning Config
  const [cleaningConfig, setCleaningConfig] = useState<CleaningConfig>({
    autoTrim: true,
    textCase: 'preserve',
    variantMerges: [],
  });

  // 6. Semantic Mapping Config
  const [semanticMapping, setSemanticMapping] = useState<SemanticMappingConfig>({});

  // 7. Verification & Quality Report
  const [verificationData, setVerificationData] = useState<{
    previewRows: Record<string, any>[];
    totalRowCount: number;
    columnStats: ColumnStatSummary[];
    checksums: ChecksumItem[];
    qualityReport: QualitySummary;
  }>({
    previewRows: [],
    totalRowCount: 0,
    columnStats: [],
    checksums: [],
    qualityReport: { errors: 0, warnings: 0, infos: 0, issues: [] },
  });

  // 8. Upload & Reconciliation State
  const [uploadState, setUploadState] = useState<UploadChunkState>({
    chunkIndex: 0,
    totalChunks: 1,
    sentRows: 0,
    totalRows: 0,
    percent: 0,
    retries: 0,
    statusText: '',
    isCancelled: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const isCancelledRef = useRef({ current: false });
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationReportUI | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateFileConflict | null>(null);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);

  // Cached full transformed rows
  const fullTransformedRowsRef = useRef<Record<string, any>[]>([]);

  /**
   * Step 1: File selection & parsing
   */
  const handleFileSelected = useCallback(async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingMessage('Calcul de l’empreinte cryptographique SHA-256...');

    try {
      const hash = await calculateFileHash(file);
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const isXls = file.name.toLowerCase().endsWith('.xls');
      const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
      const fileType: 'xlsx' | 'xls' | 'csv' | 'unknown' = isCsv ? 'csv' : isXls ? 'xls' : isXlsx ? 'xlsx' : 'unknown';

      setProcessingMessage('Lecture et analyse de la structure du classeur...');
      const buffer = await file.arrayBuffer();
      rawFileBufferRef.current = buffer;

      const parseResult = await workerClient.runTask<{
        sheets: Record<string, unknown[][]>;
        sheetNames: string[];
        detectedDelim: string;
      }>('PARSE_FILE', {
        buffer,
        fileName: file.name,
        fileType,
        csvDelimiter: ';',
        csvEncoding: 'UTF-8',
      });

      const sheetNames = parseResult.sheetNames;
      if (sheetNames.length === 0) {
        throw new Error('Le fichier ne contient aucune feuille ou ligne de données exploitable.');
      }

      const initialSheet = sheetNames[0];
      const initialRawMatrix = parseResult.sheets[initialSheet] || [];

      setFileConfig({
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        fileHash: hash,
        fileType,
        csvDelimiter: parseResult.detectedDelim || ';',
        csvEncoding: 'UTF-8',
        availableSheets: sheetNames,
      });

      setRawWorkbook(parseResult.sheets);
      setRawSheetPreview(initialRawMatrix.slice(0, 10));

      // Auto-detect header row index
      let headerIdx = 0;
      while (
        headerIdx < initialRawMatrix.length &&
        (!initialRawMatrix[headerIdx] ||
          initialRawMatrix[headerIdx].every((c) => c === null || c === undefined || String(c).trim() === ''))
      ) {
        headerIdx++;
      }
      if (headerIdx >= initialRawMatrix.length) headerIdx = 0;

      setStructureConfig({
        activeSheetName: initialSheet,
        headerRowIndex: headerIdx,
        firstDataRowIndex: headerIdx + 1,
        lastDataRowIndex: null,
        ignoreEmptyRows: true,
        ignoreTotalRows: true,
        fillDownMergedCells: false,
      });

      // Advance to Step 2
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Erreur lecture fichier:', err);
      setErrorMessage(err?.message || 'Erreur lors de la lecture du fichier.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, []);

  /**
   * Re-parse CSV if user modifies delimiter or encoding in Step 1
   */
  const handleCsvConfigChange = useCallback(
    async (delimiter: string, encoding: string) => {
      if (!rawFileBufferRef.current || fileConfig.fileType !== 'csv') return;

      setIsProcessing(true);
      setProcessingMessage('Réanalyse du fichier CSV avec les nouveaux paramètres...');
      try {
        const parseResult = await workerClient.runTask<{
          sheets: Record<string, unknown[][]>;
          sheetNames: string[];
          detectedDelim: string;
        }>('PARSE_FILE', {
          buffer: rawFileBufferRef.current,
          fileName: fileConfig.fileName,
          fileType: 'csv',
          csvDelimiter: delimiter,
          csvEncoding: encoding,
        });

        const initialSheet = parseResult.sheetNames[0];
        const initialRawMatrix = parseResult.sheets[initialSheet] || [];

        setFileConfig((prev) => ({
          ...prev,
          csvDelimiter: delimiter,
          csvEncoding: encoding,
        }));
        setRawWorkbook(parseResult.sheets);
        setRawSheetPreview(initialRawMatrix.slice(0, 10));
      } catch (err: any) {
        setErrorMessage(err?.message || 'Erreur re-parsing CSV.');
      } finally {
        setIsProcessing(false);
        setProcessingMessage('');
      }
    },
    [fileConfig.fileType, fileConfig.fileName]
  );

  /**
   * Handle sheet selection change in Step 2
   */
  const handleSheetChange = useCallback(
    (sheetName: string) => {
      const matrix = rawWorkbook[sheetName] || [];
      let headerIdx = 0;
      while (
        headerIdx < matrix.length &&
        (!matrix[headerIdx] || matrix[headerIdx].every((c) => c === null || c === undefined || String(c).trim() === ''))
      ) {
        headerIdx++;
      }
      if (headerIdx >= matrix.length) headerIdx = 0;

      setStructureConfig((prev) => ({
        ...prev,
        activeSheetName: sheetName,
        headerRowIndex: headerIdx,
        firstDataRowIndex: headerIdx + 1,
        lastDataRowIndex: null,
      }));
      setRawSheetPreview(matrix.slice(0, 10));
    },
    [rawWorkbook]
  );

  /**
   * Build initial column settings when transitioning from Step 2 to Step 3
   */
  const buildInitialColumnsFromStructure = useCallback(() => {
    const matrix = rawWorkbook[structureConfig.activeSheetName] || [];
    const headerRow = matrix[structureConfig.headerRowIndex] || [];
    const dataRows = matrix.slice(structureConfig.firstDataRowIndex, Math.min(structureConfig.firstDataRowIndex + 50, matrix.length));

    // Determine max cols
    let maxCols = headerRow.length;
    for (const r of dataRows) {
      if (r && r.length > maxCols) maxCols = r.length;
    }

    const seenLabels = new Map<string, number>();
    const newColumns: ColumnSetting[] = [];
    const periodCandidates: string[] = [];

    for (let c = 0; c < maxCols; c++) {
      const rawHeaderVal = headerRow[c];
      const isUnnamed = rawHeaderVal === null || rawHeaderVal === undefined || String(rawHeaderVal).trim() === '';
      const baseLabel = isUnnamed ? `Colonne ${c + 1}` : String(rawHeaderVal).trim();

      // Handle duplicate headers with suffix _2, _3
      let finalLabel = baseLabel;
      const count = seenLabels.get(baseLabel.toLowerCase()) || 0;
      if (count > 0) {
        finalLabel = `${baseLabel}_${count + 1}`;
      }
      seenLabels.set(baseLabel.toLowerCase(), count + 1);

      // Collect sample values from the first 20 data rows
      const samples: any[] = [];
      let numCount = 0;
      let dateCount = 0;
      let boolCount = 0;
      let emptyCount = 0;
      let excelErrCount = 0;
      let isAmbiguousDate = false;

      for (const row of dataRows) {
        const cell = row ? row[c] : null;
        if (cell === null || cell === undefined || String(cell).trim() === '') {
          emptyCount++;
        } else {
          if (samples.length < 5) samples.push(cell);
          const str = String(cell).trim();

          // Excel error check
          if (str.startsWith('#') && (str.endsWith('!') || str.endsWith('?') || str === '#N/A')) {
            excelErrCount++;
          }

          // Type inference
          if (typeof cell === 'number') {
            numCount++;
          } else if (typeof cell === 'boolean') {
            boolCount++;
          } else if (cell instanceof Date) {
            dateCount++;
          } else {
            // Check numeric string
            const cleanStr = str.replace(/[\s\u00A0\u202F€$£¥%]/g, '').replace(',', '.');
            if (cleanStr !== '' && !isNaN(Number(cleanStr))) {
              numCount++;
            } else if (/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.test(str)) {
              dateCount++;
              const m = str.match(/^(\d{1,2})[/-](\d{1,2})/);
              if (m) {
                const a = parseInt(m[1], 10);
                const b = parseInt(m[2], 10);
                if (a <= 12 && b <= 12) isAmbiguousDate = true;
              }
            } else if (!isNaN(Date.parse(str)) && str.length >= 8 && /\d/.test(str)) {
              dateCount++;
            }
          }
        }
      }

      const totalChecked = dataRows.length || 1;
      const nonEmpties = totalChecked - emptyCount;

      let detectedType: WizardColumnType = 'string';
      let detectedRole: WizardColumnRole = 'dimension';

      if (nonEmpties > 0) {
        if (numCount / nonEmpties >= 0.7) {
          detectedType = 'number';
          detectedRole = 'measure';
        } else if (dateCount / nonEmpties >= 0.7) {
          detectedType = 'date';
          detectedRole = 'date';
        } else if (boolCount / nonEmpties >= 0.7) {
          detectedType = 'boolean';
          detectedRole = 'dimension';
        }
      }

      const key = `c_${c}`;

      if (isPeriodHeader(finalLabel)) {
        periodCandidates.push(key);
      }

      newColumns.push({
        key,
        originalHeader: isUnnamed ? '' : String(rawHeaderVal).trim(),
        label: finalLabel,
        type: detectedType,
        role: detectedRole,
        isUnnamed,
        sampleValues: samples,
        nullCount: emptyCount,
        distinctCount: new Set(samples).size,
        excelErrorsCount: excelErrCount,
        dateFormatChoice: 'auto',
        isDateAmbiguous: isAmbiguousDate,
      });
    }

    setColumns(newColumns);

    // Setup Unpivot candidates
    if (periodCandidates.length >= 2) {
      const fixed = newColumns.filter((c) => !periodCandidates.includes(c.key)).map((c) => c.key);
      setUnpivotConfig({
        enabled: true,
        fixedColumnKeys: fixed,
        unpivotColumnKeys: periodCandidates,
        attributeColumnName: 'Période',
        valueColumnName: 'Volume',
        attributeIsDate: true,
      });
    } else {
      setUnpivotConfig({
        enabled: false,
        fixedColumnKeys: newColumns.map((c) => c.key),
        unpivotColumnKeys: [],
        attributeColumnName: 'Période',
        valueColumnName: 'Volume',
        attributeIsDate: true,
      });
    }

    // Semantic Mapping initial suggestion
    const suggestions = suggestSemanticMapping(newColumns);
    setSemanticMapping(suggestions);
  }, [rawWorkbook, structureConfig]);

  /**
   * Recompute full data transformation and verification report
   */
  const runFullTransformation = useCallback(async () => {
    setIsProcessing(true);
    setProcessingMessage('Application des transformations et calcul du rapport d’intégrité...');

    try {
      const matrix = rawWorkbook[structureConfig.activeSheetName] || [];

      const result = await workerClient.runTask<{
        transformedRows: Record<string, any>[];
        previewRows: Record<string, any>[];
        totalRowCount: number;
        finalColumns: ColumnSetting[];
        columnStats: ColumnStatSummary[];
        checksums: ChecksumItem[];
        qualityReport: QualitySummary;
        detectedVariants: VariantMergeRule[];
      }>('PROCESS_TRANSFORMATION', {
        rawMatrix: matrix,
        structure: structureConfig,
        columns,
        unpivot: unpivotConfig,
        cleaning: cleaningConfig,
      });

      fullTransformedRowsRef.current = result.transformedRows;

      setVerificationData({
        previewRows: result.previewRows,
        totalRowCount: result.totalRowCount,
        columnStats: result.columnStats,
        checksums: result.checksums,
        qualityReport: result.qualityReport,
      });

      // Update variants in Step 5 if not yet populated
      if (cleaningConfig.variantMerges.length === 0 && result.detectedVariants.length > 0) {
        setCleaningConfig((prev) => ({
          ...prev,
          variantMerges: result.detectedVariants,
        }));
      }

      return result;
    } catch (err: any) {
      console.error('Erreur transformation:', err);
      setErrorMessage(err?.message || 'Erreur lors du traitement des données.');
      throw err;
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [rawWorkbook, structureConfig, columns, unpivotConfig, cleaningConfig]);

  /**
   * Step 8: Upload execution with chunking, retry, cancellation & reconciliation
   */
  const executeUpload = useCallback(
    async (forceReplace: boolean = false) => {
      setIsUploading(true);
      setErrorMessage(null);
      setDuplicateConflict(null);
      isCancelledRef.current = { current: false };

      try {
        // Ensure data is freshly transformed
        let transformedRows = fullTransformedRowsRef.current;
        let vData = verificationData;

        if (transformedRows.length === 0) {
          const runRes = await runFullTransformation();
          transformedRows = runRes.transformedRows;
          vData = {
            previewRows: runRes.previewRows,
            totalRowCount: runRes.totalRowCount,
            columnStats: runRes.columnStats,
            checksums: runRes.checksums,
            qualityReport: runRes.qualityReport,
          };
        }

        const uploadResult = await importService.uploadWizardDataset({
          fileName: fileConfig.fileName,
          fileHash: fileConfig.fileHash,
          fileSizeBytes: fileConfig.fileSizeBytes,
          sheetName: structureConfig.activeSheetName,
          currentUserEmail,
          columns,
          rows: transformedRows,
          checksums: vData.checksums,
          qualityReport: vData.qualityReport,
          mapping: semanticMapping,
          replaceIfExists: forceReplace,
          onProgress: (p) => {
            setUploadState(p);
          },
          isCancelledRef: isCancelledRef.current,
        });

        setReconciliationResult(uploadResult.reconciliation);
        setUploadedDatasetId(uploadResult.datasetId);
      } catch (err: any) {
        console.error('Erreur téléversement wizard:', err);
        if (err.isDuplicate) {
          setDuplicateConflict({
            isDuplicate: true,
            existingDatasetId: err.existingDatasetId,
            existingFileName: err.existingFileName,
            existingImportedAt: err.existingImportedAt,
            message: err.message,
          });
        } else if (err.reconciliation) {
          setReconciliationResult(err.reconciliation);
          setErrorMessage(err.message || 'Écart détecté lors de la réconciliation serveur.');
        } else {
          setErrorMessage(err?.message || 'Échec de l’envoi des données sur MongoDB.');
        }
      } finally {
        setIsUploading(false);
      }
    },
    [
      currentUserEmail,
      fileConfig,
      structureConfig.activeSheetName,
      columns,
      semanticMapping,
      verificationData,
      runFullTransformation,
    ]
  );

  /**
   * Cancel in-progress upload
   */
  const cancelUpload = useCallback(() => {
    isCancelledRef.current = { current: true };
    setUploadState((prev) => ({
      ...prev,
      isCancelled: true,
      statusText: 'Annulation en cours...',
    }));
  }, []);

  /**
   * Navigation controls
   */
  const goToStep = useCallback(
    async (step: WizardStepId) => {
      setErrorMessage(null);

      // Transitions logic
      if (currentStep === 2 && step >= 3) {
        buildInitialColumnsFromStructure();
      }

      if (step === 7 || step === 8) {
        await runFullTransformation();
      }

      setCurrentStep(step);
    },
    [currentStep, buildInitialColumnsFromStructure, runFullTransformation]
  );

  const nextStep = useCallback(async () => {
    if (currentStep < 8) {
      await goToStep((currentStep + 1) as WizardStepId);
    }
  }, [currentStep, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setErrorMessage(null);
      setCurrentStep((prev) => (prev - 1) as WizardStepId);
    }
  }, [currentStep]);

  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setIsProcessing(false);
    setErrorMessage(null);
    setRawWorkbook({});
    rawFileBufferRef.current = null;
    fullTransformedRowsRef.current = [];
    setFileConfig({
      file: null,
      fileName: '',
      fileSizeBytes: 0,
      fileHash: '',
      fileType: 'unknown',
      csvDelimiter: ';',
      csvEncoding: 'UTF-8',
      availableSheets: [],
    });
    setColumns([]);
    setReconciliationResult(null);
    setDuplicateConflict(null);
    setUploadedDatasetId(null);
  }, []);

  return {
    currentStep,
    isProcessing,
    processingMessage,
    errorMessage,
    setErrorMessage,
    // Step 1
    fileConfig,
    handleFileSelected,
    handleCsvConfigChange,
    // Step 2
    structureConfig,
    setStructureConfig,
    rawSheetPreview,
    handleSheetChange,
    // Step 3
    columns,
    setColumns,
    // Step 4
    unpivotConfig,
    setUnpivotConfig,
    // Step 5
    cleaningConfig,
    setCleaningConfig,
    // Step 6
    semanticMapping,
    setSemanticMapping,
    // Step 7
    verificationData,
    runFullTransformation,
    // Step 8
    uploadState,
    isUploading,
    reconciliationResult,
    duplicateConflict,
    uploadedDatasetId,
    executeUpload,
    cancelUpload,
    // Nav
    goToStep,
    nextStep,
    prevStep,
    resetWizard,
  };
}
