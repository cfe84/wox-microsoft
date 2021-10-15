import { JsonRPCAction } from "./JsonRPCAction";

export interface ResultItem {
  Title: string;
  Subtitle: string;
  IcoPath: string;
  /**
   * Higher is better
   */
  Score?: number;
  JsonRPCAction?: JsonRPCAction;
  ContextMenu?: ResultItem[]
}
