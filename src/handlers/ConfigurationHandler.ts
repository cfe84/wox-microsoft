import { ConfigurationStore } from "../ConfigurationStore";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Logger } from "../woxlib/Logger";
import { Result } from "../woxlib/Result";
import { ResultItem } from "../woxlib/ResultItem";
import { Authentication } from "../Authentication";
import { IHandler, IHandlerSettings } from "../IHandler";

export interface ConfigurationHandlerDeps {
  configurationStore: ConfigurationStore
  authentication: Authentication
  logger: Logger
}

const prefix = "configuration"

export class ConfigurationHandler implements IHandler {
  static loginMethod = prefix + ".login"

  constructor(private deps: ConfigurationHandlerDeps) {
  }
  get settings(): IHandlerSettings {
    return {
      acceptCatchAll: false,
      prefix,
      requiresLogin: false
    }
  }

  get prefix(): string {
    return this.prefix
  }
  get acceptCatchAll(): boolean {
    return false
  }

  async handleLoginAsync() {
    await this.deps.authentication.loginAsync()
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    const isAuthenticated = this.deps.configurationStore.isAuthenticated()
    const results = {
      IcoPath: "images/teams.png",
      JsonRPCAction: {
        method: ConfigurationHandler.loginMethod,
        parameters: [],
      },
      Subtitle: isAuthenticated ? "Log in again" : "You need to log in first",
      Title: "Log in",
    };
    return [results]
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<Result> {
    switch (rpcAction.method) {
      case ConfigurationHandler.loginMethod:
        await this.handleLoginAsync()
        break;
      default:
        this.deps.logger.log(`Didn't find method: ${JSON.stringify(rpcAction)}`);
    }
    return { result: [] }
  }
}