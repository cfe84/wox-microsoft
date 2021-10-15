import { JsonRPCAction } from "./woxlib/JsonRPCAction";
import { Result } from "./woxlib/Result";
import { ResultItem } from "./woxlib/ResultItem";

export interface IHandlerSettings {
  prefix: string,
  acceptCatchAll: boolean,
  requiresLogin: boolean
}

export interface IHandler {
  get settings(): IHandlerSettings
  processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]>
  processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]>
}