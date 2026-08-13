"use client";

import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

export interface SubmissionState {
  lat: number | null;
  lng: number | null;
  tenantId: string | null;
  tenantName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string;
  locationText: string;
  attachments: File[];
}

type SubmissionAction =
  | { type: "SET_LOCATION"; lat: number; lng: number }
  | { type: "SET_TENANT"; tenantId: string; tenantName: string }
  | { type: "CLEAR_TENANT" }
  | { type: "SET_CATEGORY"; categoryId: string; categoryName: string }
  | { type: "SET_DETAILS"; title: string; description: string; locationText: string }
  | { type: "SET_ATTACHMENTS"; attachments: File[] }
  | { type: "RESTORE_DRAFT"; draft: Omit<SubmissionState, "attachments">; attachments: File[] }
  | { type: "RESET" };

const initialState: SubmissionState = {
  lat: null,
  lng: null,
  tenantId: null,
  tenantName: null,
  categoryId: null,
  categoryName: null,
  title: "",
  description: "",
  locationText: "",
  attachments: [],
};

function submissionReducer(
  state: SubmissionState,
  action: SubmissionAction
): SubmissionState {
  switch (action.type) {
    case "SET_LOCATION":
      return { ...state, lat: action.lat, lng: action.lng };
    case "SET_TENANT":
      return { ...state, tenantId: action.tenantId, tenantName: action.tenantName };
    case "CLEAR_TENANT":
      return { ...state, tenantId: null, tenantName: null };
    case "SET_CATEGORY":
      return { ...state, categoryId: action.categoryId, categoryName: action.categoryName };
    case "SET_DETAILS":
      return {
        ...state,
        title: action.title,
        description: action.description,
        locationText: action.locationText,
      };
    case "SET_ATTACHMENTS":
      return { ...state, attachments: action.attachments };
    case "RESTORE_DRAFT":
      return { ...action.draft, attachments: action.attachments };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface ReportSubmissionContextValue {
  state: SubmissionState;
  dispatch: Dispatch<SubmissionAction>;
}

const ReportSubmissionContext = createContext<ReportSubmissionContextValue | null>(null);

interface ReportSubmissionProviderProps {
  children: ReactNode;
}

export function ReportSubmissionProvider({ children }: ReportSubmissionProviderProps) {
  const [state, dispatch] = useReducer(submissionReducer, initialState);
  return (
    <ReportSubmissionContext.Provider value={{ state, dispatch }}>
      {children}
    </ReportSubmissionContext.Provider>
  );
}

export function useReportSubmission(): ReportSubmissionContextValue {
  const ctx = useContext(ReportSubmissionContext);
  if (!ctx) {
    throw new Error("useReportSubmission must be used inside ReportSubmissionProvider");
  }
  return ctx;
}
