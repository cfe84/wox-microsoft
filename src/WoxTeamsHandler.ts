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
import { CalendarHandler } from "./handlers/CalendarHandler";
import { ChatHandler } from "./handlers/ChatHandler";
import { PersonHandler } from "./handlers/PersonHandler";

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
      new UserInfoHandler(deps),
      new CalendarHandler(deps),
      new ChatHandler(deps),
      new PersonHandler(deps)
    ]
  }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    const isAuthenticated = this.deps.configurationStore.isAuthenticated()

    const handlers = this.handlers
      .filter(handler => isAuthenticated || !handler.settings.requiresLogin)

    if (rpcAction.method === "query") {
      const results = await Promise.all(handlers
        .map(handler => {
          try {
            return handler.processQueryAsync(rpcAction)
          }
          catch (error) {
            this.deps.logger.log(`Error in execution handler ${handler.settings.prefix}: ${error}`)
            return []
          }
        }))
      const aggregatedResults = results.flat()
      return {
        result: aggregatedResults,
      };
    } else {
      this.deps.logger.log(`[handler.processAsync] this is a command ${rpcAction.method}`)
      const handler = this.handlers.filter(handler => rpcAction.method.startsWith(handler.settings.prefix))
      const results = await Promise.all(handler.map(h => h.processCommandAsync(rpcAction)))
      const result = results.flat()
      return {
        result
      }
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