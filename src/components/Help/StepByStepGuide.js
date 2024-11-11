import React, { useEffect } from 'react';
import { useThemeConstants } from '../Page/ThemeConstants';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const StepByStepGuide = ({ 
  isActive, 
  onComplete,
  onSkip,
  searchType,
  currentStep,
  setCurrentStep,
  querySource,
  steps
}) => {
  const themeConstants = useThemeConstants();
  const validatedCurrentStep = Math.min(Math.max(0, currentStep), steps.length - 1);
  const currentStepData = steps[validatedCurrentStep];

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const currentElement = document.getElementById(currentStepData.id);
    
    if (currentElement) {
      document.querySelectorAll('.step-highlight').forEach(el => {
        el.classList.remove('step-highlight');
        el.style.cssText = '';
      });

      currentElement.classList.add('step-highlight');
      currentElement.style.cssText = `
        position: relative;
        z-index: 41;
        pointer-events: auto;
        box-shadow: 0 0 0 4px ${themeConstants.buttonBackgroundColor};
        border-radius: 4px;
      `;

      currentElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      return () => {
        currentElement.classList.remove('step-highlight');
        currentElement.style.cssText = '';
      };
    }
  }, [isActive, validatedCurrentStep, steps, themeConstants]);

  if (!isActive || !currentStepData) return null;

  const isFirstStep = validatedCurrentStep === 0;
  const isLastStep = validatedCurrentStep === steps.length - 1;

  return (
    <div className={`${themeConstants.sectionBackgroundColor} rounded-lg shadow-xl p-4 sm:p-6 w-full`}>
      {/* Simplified mobile view with just title and navigation */}
      <div className="sm:hidden">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold truncate mr-2">
            Step {validatedCurrentStep + 1}: {currentStepData.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            Exit
          </button>
        </div>
        <div className="flex justify-between mt-4">
          {!isFirstStep ? (
            <button
              onClick={() => setCurrentStep(validatedCurrentStep - 1)}
              className={`px-3 py-1.5 ${themeConstants.buttonBackgroundColor} text-white rounded text-sm`}
            >
              Back
            </button>
          ) : <div />}
          {!isLastStep ? (
            <button
              onClick={() => setCurrentStep(validatedCurrentStep + 1)}
              className={`px-3 py-1.5 ${themeConstants.buttonBackgroundColor} text-white rounded text-sm`}
            >
              Next
            </button>
          ) : (
            <button
              onClick={onComplete}
              className={`px-3 py-1.5 ${themeConstants.buttonBackgroundColor} text-white rounded text-sm`}
            >
              Finish
            </button>
          )}
        </div>
      </div>

      {/* Full desktop view with all components */}
      <div className="hidden sm:block">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold truncate mr-2">{currentStepData.title}</h3>
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
          >
            Exit Guide
          </button>
        </div>
        
        <div className="min-h-[60px] mb-6">
          <p className="text-gray-600">{currentStepData.instruction}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {!isFirstStep && (
              <button
                onClick={() => setCurrentStep(validatedCurrentStep - 1)}
                className={`px-4 py-2 ${themeConstants.buttonBackgroundColor} text-white rounded hover:${themeConstants.buttonHoverColor} flex items-center`}
              >
                <ArrowLeft className="mr-2" size={16} />
                Back
              </button>
            )}
          </div>
          <div className="flex space-x-2">
            {!isLastStep ? (
              <button
                onClick={() => setCurrentStep(validatedCurrentStep + 1)}
                className={`px-4 py-2 ${themeConstants.buttonBackgroundColor} text-white rounded hover:${themeConstants.buttonHoverColor} flex items-center`}
              >
                Next
                <ArrowRight className="ml-2" size={16} />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className={`px-4 py-2 ${themeConstants.buttonBackgroundColor} text-white rounded hover:${themeConstants.buttonHoverColor}`}
              >
                Finish
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === validatedCurrentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepByStepGuide;