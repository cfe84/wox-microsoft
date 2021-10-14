import { Logger } from "./woxlib/Logger";
import { IWoxQueryHandler } from "./woxlib/IWoxQueryHandler";
import { JsonRPCAction } from "./woxlib/JsonRPCAction";
import { Result } from "./woxlib/Result";
import { ConfigurationStore } from "./ConfigurationStore";
import { ConfigurationHandler } from "./ConfigurationHandler";

export interface WoxTeamsHandlerDeps {
  logger: Logger,
  configurationStore: ConfigurationStore
}

export class WoxTeamsHandler implements IWoxQueryHandler {
  private authenticationHandler: ConfigurationHandler
  constructor(private deps: WoxTeamsHandlerDeps) {
    this.authenticationHandler = new ConfigurationHandler(deps)
  }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    if (!this.deps.configurationStore.isConfigured()) {
      return { result: this.authenticationHandler.getAuthenticationActions() }
    }
    if (rpcAction.method === "query") {
      return {
        result: [],
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