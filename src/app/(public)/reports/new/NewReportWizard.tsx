"use client";

import { useState, useEffect } from "react";
import { ReportSubmissionProvider } from "@/components/reports/submit/ReportSubmissionContext";
import { useReportSubmission } from "@/components/reports/submit/ReportSubmissionContext";
import WizardShell from "@/components/reports/submit/WizardShell";
import Step1Photos from "@/components/reports/submit/Step1Photos";
import Step2Location from "@/components/reports/submit/Step2Location";
import Step3Details from "@/components/reports/submit/Step3Details";
import Step4Category from "@/components/reports/submit/Step4Category";
import Step5Review from "@/components/reports/submit/Step5Review";
import type { TenantSummary } from "@/db/queries/tenants";
import type { CategorySummary } from "@/db/queries/categories";

const DRAFT_KEY = "cityops:wizard:draft";

interface PhotoDraft {
  name: string;
  type: string;
  dataUrl: string;
}

interface NewReportWizardProps {
  tenants: TenantSummary[];
  categories: CategorySummary[];
}

interface WizardStepsProps {
  tenants: TenantSummary[];
  categories: CategorySummary[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

function WizardSteps({
  tenants,
  categories,
  currentStep,
  setCurrentStep,
}: WizardStepsProps) {
  const { dispatch } = useReportSubmission();

  // Restore wizard draft saved before redirect to sign-in
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_KEY);
      if (!stored) return;
      sessionStorage.removeItem(DRAFT_KEY);
      const draft = JSON.parse(stored) as {
        lat: number; lng: number;
        tenantId: string; tenantName: string;
        categoryId: string; categoryName: string;
        title: string; description: string; locationText: string;
        photos: PhotoDraft[];
      };
      const attachments: File[] = (draft.photos ?? []).map((p) => {
        const byteString = atob(p.dataUrl.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        return new File([ab], p.name, { type: p.type });
      });
      dispatch({
        type: "RESTORE_DRAFT",
        draft: {
          lat: draft.lat,
          lng: draft.lng,
          tenantId: draft.tenantId,
          tenantName: draft.tenantName,
          categoryId: draft.categoryId,
          categoryName: draft.categoryName,
          title: draft.title,
          description: draft.description,
          locationText: draft.locationText,
        },
        attachments,
      });
      setCurrentStep(5);
    } catch {
      // Silently ignore — sessionStorage unavailable or data malformed
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {currentStep === 1 && (
        <Step1Photos
          onNext={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 2 && (
        <Step2Location
          tenants={tenants}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}
      {currentStep === 3 && (
        <Step3Details
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
          onGoToStep={setCurrentStep}
        />
      )}
      {currentStep === 4 && (
        <Step4Category
          categories={categories}
          onBack={() => setCurrentStep(3)}
          onNext={() => setCurrentStep(5)}
        />
      )}
      {currentStep === 5 && (
        <Step5Review
          onBack={() => setCurrentStep(4)}
          onGoToStep={setCurrentStep}
        />
      )}
    </>
  );
}

export default function NewReportWizard({
  tenants,
  categories,
}: NewReportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <ReportSubmissionProvider>
      <WizardShell currentStep={currentStep}>
        <WizardSteps
          tenants={tenants}
          categories={categories}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      </WizardShell>
    </ReportSubmissionProvider>
  );
}

