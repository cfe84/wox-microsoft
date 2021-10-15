import { consts } from "../consts";
import { Graph } from "../Graph";
import { IHandler, IHandlerSettings } from "../IHandler";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Result } from "../woxlib/Result";
import { ResultItem } from "../woxlib/ResultItem";

const prefix = "userinfo"

export interface UserInfoDependencies {
  graph: Graph
}

export class UserInfoHandler implements IHandler {
  constructor(private deps: UserInfoDependencies) { }
  get settings(): IHandlerSettings {
    return {
      acceptCatchAll: false,
      prefix,
      requiresLogin: true
    }
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    const user = await this.deps.graph.getUserInfo()
    const currentUser: ResultItem = {
      IcoPath: consts.icons.microsoft,
      Subtitle: user.userPrincipal,
      Title: user.displayName
    }
    return [currentUser]
  }

  processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    throw new Error("Method not implemented.");
  }

}