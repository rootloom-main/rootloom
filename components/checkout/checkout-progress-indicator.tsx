'use client';

import { cn } from "@/lib/utils";
import { Check, ShieldCheck } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: 'account' | 'address' | 'payment';
}

export function CheckoutProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const steps = [
    { key: 'account', label: '1. Account', desc: 'Secure verification' },
    { key: 'address', label: '2. Address', desc: 'Shipping details' },
    { key: 'payment', label: '3. Payment', desc: 'Secure checkout' }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mb-10 px-4">
      {/* Header Badge */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-6">
        <ShieldCheck className="h-4 w-4 text-deep-forest" />
        <span>SECURE CHECKOUT FUNNEL</span>
      </div>

      <div className="flex items-center justify-between relative px-2 sm:px-6">
        {/* Connecting line */}
        <div className="absolute left-6 right-6 sm:left-14 sm:right-14 top-5 -translate-y-1/2 h-[3px] bg-stone-200 -z-10 rounded-full">
          <div 
            className="h-full bg-deep-forest transition-all duration-500 rounded-full"
            style={{
              width: currentStep === 'account' 
                ? '0%' 
                : currentStep === 'address' 
                  ? '50%' 
                  : '100%'
            }}
          />
        </div>
        
        {steps.map((step, index) => {
          const isCompleted = 
            (currentStep === 'address' && index < 1) || 
            (currentStep === 'payment' && index < 2);
          const isActive = currentStep === step.key;
          
          return (
            <div key={step.key} className="flex flex-col items-center select-none text-center">
              <div 
                className={cn(
                  "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm border-[3px] transition-all duration-300 shadow-sm",
                  isCompleted 
                    ? "bg-deep-forest border-deep-forest text-white" 
                    : isActive 
                      ? "bg-white border-deep-forest text-deep-forest ring-4 ring-deep-forest/15 scale-110 font-black" 
                      : "bg-white border-stone-200 text-stone-400"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5 stroke-[3px]" /> : index + 1}
              </div>
              <div className="mt-2.5">
                <p 
                  className={cn(
                    "text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                    isActive ? "text-deep-forest font-black" : isCompleted ? "text-stone-700" : "text-stone-400"
                  )}
                >
                  {step.label.split('. ')[1]}
                </p>
                <p className="hidden sm:block text-[9px] font-medium text-stone-400 tracking-normal mt-0.5 max-w-[120px] mx-auto leading-tight">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
