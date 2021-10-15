export interface JsonRPCAction {
  method: "query" | "openUrl" | string;
  parameters: string[];
  dontHideAfterAction?: boolean;
  contextData?: "ctxData" | string;
}
