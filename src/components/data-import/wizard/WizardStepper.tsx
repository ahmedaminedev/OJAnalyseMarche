import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { WIZARD_STEPS, WizardStepId } from '../../../types/wizard';

interface WizardStepperProps {
  currentStep: WizardStepId;
  onStepClick?: (step: WizardStepId) => void;
  maxAccessibleStep?: WizardStepId;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onStepClick,
  maxAccessibleStep = 8,
}) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Mobile step display */}
      <div className="flex md:hidden items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff284d] to-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md">
            {currentStep}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Étape {currentStep} sur 8
            </div>
            <div className="text-sm font-bold text-white">
              {WIZARD_STEPS[currentStep - 1]?.label}
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
          {Math.round((currentStep / 8) * 100)}%
        </div>
      </div>

      {/* Desktop breadcrumb stepper */}
      <div className="hidden md:flex items-center justify-between gap-1 overflow-x-auto py-1">
        {WIZARD_STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && step.id <= maxAccessibleStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left whitespace-nowrap group ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#ff284d]/15 to-transparent border border-[#ff284d]/40 shadow-[0_0_15px_rgba(255,40,77,0.15)] text-white'
                    : isCompleted
                    ? 'hover:bg-slate-800/60 text-slate-300 cursor-pointer'
                    : 'opacity-40 text-slate-500 cursor-not-allowed'
                }`}
              >
                {/* Circle step indicator */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isCurrent
                      ? 'bg-[#ff284d] text-white shadow-[0_0_10px_rgba(255,40,77,0.5)]'
                      : 'bg-slate-800 border border-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>

                <div className="flex flex-col">
                  <span
                    className={`text-[11px] font-semibold tracking-wide uppercase transition-colors ${
                      isCurrent
                        ? 'text-[#ff284d]'
                        : isCompleted
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                  <span
                    className={`text-xs font-medium truncate max-w-[95px] ${
                      isCurrent ? 'text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </button>

              {idx < WIZARD_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
