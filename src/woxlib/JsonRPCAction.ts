export interface JsonRPCAction {
  method: "query" | string;
  parameters: string[];
  dontHideAfterAction?: boolean;
  contextData?: "ctxData" | string;
}
