import { Logger } from "./woxlib/Logger";
import { IWoxQueryHandler } from "./woxlib/IWoxQueryHandler";
import { JsonRPCAction } from "./woxlib/JsonRPCAction";
import { ResultItem } from "./woxlib/ResultItem";
import { Result } from "./woxlib/Result";

export class WoxTeamsHandler implements IWoxQueryHandler {
  constructor(private logger: Logger) { }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    if (rpcAction.method === "query") {
      const results = {
        IcoPath: "images/teams.png",
        JsonRPCAction: {
          method: "copyToCliboard",
          parameters: ["1234"],
        },
        Subtitle: "Hurray!",
        Title: "Teams 1234",
      };

      return {
        result: [results],
      };
    } else if (rpcAction.method === "copyToCliboard") {
      this.logger.log(rpcAction.parameters[0]);
    } else {
      this.logger.log(JSON.stringify(rpcAction));
    }
    return {
      result: [],
    };
  }
}