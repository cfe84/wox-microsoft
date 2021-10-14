import { ConfigurationStore } from "./ConfigurationStore";
import { ResultItem } from "./woxlib/ResultItem";

export interface ConfigurationHandlerDeps {
  configurationStore: ConfigurationStore
}

export class ConfigurationHandler {
  constructor(private deps: ConfigurationHandlerDeps) { }

  getAuthenticationActions(): ResultItem[] {
    const results = {
      IcoPath: "images/teams.png",
      JsonRPCAction: {
        method: "copyToCliboard",
        parameters: ["1234"],
      },
      Subtitle: "Hurray!",
      Title: "Teams 1234",
    };
    return [results]
  }
}