import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { FloatingAlert } from './FloatingAlert';

export interface FormStepDefinition {
  id: string;
  title: string;
  shortLabel: string;
  description?: string;
}

interface MultiStepFormProps {
  steps: FormStepDefinition[];
  currentStepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  canGoBack?: boolean;
  error?: string | null;
  warning?: string | null;
  onClearError?: () => void;
  onClearWarning?: () => void;
  children: React.ReactNode;
  submitButtonText?: string;
}

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  currentStepIndex,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
  canGoBack = true,
  error,
  warning,
  onClearError,
  onClearWarning,
  children,
  submitButtonText = 'Complete Registration',
}) => {
  const isLastStep = currentStepIndex === steps.length - 1;
  const currentStep = steps[currentStepIndex];
  const nextStep = !isLastStep ? steps[currentStepIndex + 1] : null;

  // Calculate progress percentage for progress bar
  const progressPercent = steps.length > 1
    ? (currentStepIndex / (steps.length - 1)) * 100
    : 100;

  const handleNextClick = () => {
    if (isLastStep) {
      if (onSubmit) onSubmit();
    } else {
      onNext();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Viewport-Fixed Floating Top Error Alert with 5s Auto-Fade */}
      <FloatingAlert
        message={error || null}
        type="error"
        onDismiss={() => {
          if (onClearError) onClearError();
        }}
        duration={5000}
      />

      {/* Viewport-Fixed Floating Top Warning Alert with 5s Auto-Fade */}
      <FloatingAlert
        message={warning || null}
        type="warning"
        onDismiss={() => {
          if (onClearWarning) onClearWarning();
        }}
        duration={5000}
        isOverrideable
      />

      {/* Step Tracker Indicator */}
      {steps.length > 1 && (
        <div className="step-tracker-container" aria-label="Registration Progress">
          <div className="step-tracker-line">
            <div
              className="step-tracker-line-progress"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`step-tracker-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="step-tracker-circle">
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="step-tracker-label">{step.shortLabel}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Step Header */}
      <div className="w-full mb-5">
        <h2 className="member-card-title">{currentStep.title}</h2>
        {currentStep.description && (
          <p className="member-card-subtitle">{currentStep.description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className="w-full">{children}</div>

      {/* Form Navigation Footer */}
      <div className="w-full form-nav-footer">
        {canGoBack && currentStepIndex > 0 ? (
          <button
            type="button"
            className="btn-form-back"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          className="btn-form-next"
          onClick={handleNextClick}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span>Processing...</span>
          ) : isLastStep ? (
            <>
              <span>{submitButtonText}</span>
              <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Next: {nextStep?.shortLabel || 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
