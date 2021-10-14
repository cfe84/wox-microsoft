import { Logger } from "./woxlib/Logger";
import { IWoxQueryHandler } from "./woxlib/IWoxQueryHandler";
import { JsonRPCAction } from "./woxlib/JsonRPCAction";
import { Result } from "./woxlib/Result";
import { ConfigurationStore } from "./ConfigurationStore";
import { ConfigurationHandler } from "./handlers/ConfigurationHandler";
import { Authentication } from "./Authentication";
import { IHandler } from "./IHandler";
import { UserInfoHandler } from "./handlers/UserInfoHandler";
import { Graph } from "./Graph";

export interface WoxTeamsHandlerDeps {
  logger: Logger,
  graph: Graph,
  configurationStore: ConfigurationStore,
  authentication: Authentication
}

export class WoxTeamsHandler implements IWoxQueryHandler {
  private authenticationHandler: ConfigurationHandler
  private handlers: IHandler[]
  constructor(private deps: WoxTeamsHandlerDeps) {
    this.authenticationHandler = new ConfigurationHandler(deps)
    this.handlers = [
      this.authenticationHandler,
      new UserInfoHandler(deps)
    ]
  }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    const isAuthenticated = this.deps.configurationStore.isAuthenticated()

    const handlers = this.handlers
      .filter(handler => isAuthenticated || !handler.settings.requiresLogin)

    if (rpcAction.method === "query") {
      const results = await Promise.all(handlers
        .map(handler => handler.processQueryAsync(rpcAction)))
      const aggregatedResults = results.flat()
      return {
        result: aggregatedResults,
      };
    } else if (rpcAction.method === "copyToCliboard") {
      this.deps.logger.log(rpcAction.parameters[0]);
    } else {
      this.deps.logger.log(JSON.stringify(rpcAction));
    }
    return {
      result: [],
    };
  }
}

// const results = {
//   IcoPath: "images/teams.png",
//   JsonRPCAction: {
//     method: "copyToCliboard",
//     parameters: ["1234"],
//   },
//   Subtitle: "Hurray!",
//   Title: "Teams 1234",
// };