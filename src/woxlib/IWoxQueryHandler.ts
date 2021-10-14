import { JsonRPCAction } from "./JsonRPCAction";
import { Result } from "./Result";

export interface IWoxQueryHandler {
  processAsync(rpcAction: JsonRPCAction): Promise<Result>;
}
