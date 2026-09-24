import React, { useEffect, useState } from 'react';
import { Database, FileSpreadsheet, History, Layers } from 'lucide-react';
import { useImportWizard } from '../../hooks/useImportWizard';
import { WizardStepper } from './wizard/WizardStepper';
import { Step1File } from './wizard/Step1File';
import { Step2Structure } from './wizard/Step2Structure';
import { Step3Columns } from './wizard/Step3Columns';
import { Step4Unpivot } from './wizard/Step4Unpivot';
import { Step5Cleaning } from './wizard/Step5Cleaning';
import { Step6Semantic } from './wizard/Step6Semantic';
import { Step7Verification } from './wizard/Step7Verification';
import { Step8Upload } from './wizard/Step8Upload';
import { importService, BackendHealth } from '../../services/importService';

interface DataImportPageProps {
  onNavigateToImportedFiles: (tab?: 'history' | 'datasets', fileId?: string) => void;
  currentUserEmail?: string;
}

export const DataImportPage: React.FC<DataImportPageProps> = ({
  onNavigateToImportedFiles,
  currentUserEmail = 'utilisateur@omoda-jaecoo.tn',
}) => {
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

  const wizard = useImportWizard(currentUserEmail);

  // Check backend health on mount
  useEffect(() => {
    let isMounted = true;
    importService.getHealth().then((h) => {
      if (isMounted && h) {
        setBackendHealth(h);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Données</span>
            <span className="text-slate-600">/</span>
            <span className="text-[#ff284d]">Assistant d'importation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            Assistant d'Import Universel (Power BI Style)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Importez n'importe quel fichier tabulaire (.xlsx, .xls, .csv). Détection automatique des schémas,
            dépivotage large/long, harmonisation, réconciliation d'intégrité et stockage par lots sur MongoDB Atlas.
          </p>
        </div>

        {/* Database Health Badge & Quick links */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendHealth?.database?.connected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">Base :</span>
            <span className="font-mono text-slate-200 font-semibold">
              {backendHealth?.database?.name || 'MongoDB Atlas'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToImportedFiles('datasets')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-[#ff284d]" />
            <span>Jeux de données</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToImportedFiles('history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Historique</span>
          </button>
        </div>
      </div>

      {/* Stepper (Steps 1 to 8) */}
      <WizardStepper
        currentStep={wizard.currentStep}
        onStepClick={(step) => wizard.goToStep(step)}
        maxAccessibleStep={wizard.fileConfig.file ? 8 : 1}
      />

      {/* Wizard Step Container */}
      <div className="transition-all duration-300">
        {/* Step 1: File Selection & CSV Params */}
        {wizard.currentStep === 1 && (
          <Step1File
            fileConfig={wizard.fileConfig}
            onFileSelected={wizard.handleFileSelected}
            onCsvConfigChange={wizard.handleCsvConfigChange}
            isProcessing={wizard.isProcessing}
            processingMessage={wizard.processingMessage}
            errorMessage={wizard.errorMessage}
            onNext={wizard.nextStep}
          />
        )}

        {/* Step 2: Data Structure (Sheets, Header Row, Bounds, Fill Down, Skip Totals) */}
        {wizard.currentStep === 2 && (
          <Step2Structure
            fileConfig={wizard.fileConfig}
            structureConfig={wizard.structureConfig}
            setStructureConfig={wizard.setStructureConfig}
            rawSheetPreview={wizard.rawSheetPreview}
            onSheetChange={wizard.handleSheetChange}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 3: Column Typing, Roles, Formats & Labels */}
        {wizard.currentStep === 3 && (
          <Step3Columns
            columns={wizard.columns}
            setColumns={wizard.setColumns}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 4: Wide-to-Long Format Transformation (Unpivot) */}
        {wizard.currentStep === 4 && (
          <Step4Unpivot
            columns={wizard.columns}
            unpivotConfig={wizard.unpivotConfig}
            setUnpivotConfig={wizard.setUnpivotConfig}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 5: Data Cleaning, Trim, Casing & Interactive Variant Merging */}
        {wizard.currentStep === 5 && (
          <Step5Cleaning
            cleaningConfig={wizard.cleaningConfig}
            setCleaningConfig={wizard.setCleaningConfig}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 6: Semantic Mapping Suggestions (Purely Optional) */}
        {wizard.currentStep === 6 && (
          <Step6Semantic
            columns={wizard.columns}
            semanticMapping={wizard.semanticMapping}
            setSemanticMapping={wizard.setSemanticMapping}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 7: Integrity Verification & 50 Rows Preview */}
        {wizard.currentStep === 7 && (
          <Step7Verification
            fileConfig={wizard.fileConfig}
            structureConfig={wizard.structureConfig}
            verificationData={wizard.verificationData}
            onNext={wizard.nextStep}
            onPrev={wizard.prevStep}
          />
        )}

        {/* Step 8: Chunked Batch Upload, Checksums & Server Reconciliation */}
        {wizard.currentStep === 8 && (
          <Step8Upload
            fileConfig={wizard.fileConfig}
            structureConfig={wizard.structureConfig}
            uploadState={wizard.uploadState}
            isUploading={wizard.isUploading}
            reconciliationResult={wizard.reconciliationResult}
            duplicateConflict={wizard.duplicateConflict}
            uploadedDatasetId={wizard.uploadedDatasetId}
            errorMessage={wizard.errorMessage}
            onStartUpload={wizard.executeUpload}
            onCancelUpload={wizard.cancelUpload}
            onReset={wizard.resetWizard}
            onViewData={(datasetId) => onNavigateToImportedFiles('datasets', datasetId)}
            onViewAnalytics={(datasetId) => onNavigateToImportedFiles('datasets', datasetId)}
          />
        )}
      </div>
    </div>
  );
};
