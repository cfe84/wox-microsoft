import { ConfigurationStore } from "../ConfigurationStore";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Logger } from "../woxlib/Logger";
import { Result } from "../woxlib/Result";
import { ResultItem } from "../woxlib/ResultItem";
import { Authentication } from "../Authentication";
import { IHandler, IHandlerSettings } from "../IHandler";
import { consts } from "../consts";

export interface ConfigurationHandlerDeps {
  configurationStore: ConfigurationStore
  authentication: Authentication
  logger: Logger
}

const prefix = "configuration"

export class ConfigurationHandler implements IHandler {
  static loginMethod = prefix + ".login"
  static logoutMethod = prefix + ".logout"

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
  async handleLogoutAsync() {
    await this.deps.authentication.logoutAsync()
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    const command = rpcAction.parameters[0]
    const commandIsMicrosoft = command && (command.startsWith("microsoft") || command.startsWith("msft"))
    const commandIsLogIn = command && ("login".startsWith(command.replace(/\s/g, "")))
    const commandIsLogout = command && ("logout".startsWith(command.replace(/\s/g, "")))
    const isAuthenticated = this.deps.configurationStore.isAuthenticated()
    const logInAction = {
      IcoPath: consts.icons.microsoft,
      JsonRPCAction: {
        method: ConfigurationHandler.loginMethod,
        parameters: [],
      },
      Subtitle: isAuthenticated ? "Log in again" : "You need to log in first",
      Title: "Log in to Microsoft",
      Score: 200
    };
    const logOutAction = {
      IcoPath: consts.icons.microsoft,
      JsonRPCAction: {
        method: ConfigurationHandler.logoutMethod,
        parameters: [],
      },
      Subtitle: "Log out from your account",
      Title: "Log out from Microsoft",
      Score: 200
    };
    const actions = []
    if (isAuthenticated && (commandIsMicrosoft || commandIsLogout)) {
      actions.push(logOutAction)
    }
    if (!isAuthenticated && (commandIsMicrosoft || commandIsLogIn)) {
      actions.push(logInAction)
    }
    return actions
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    this.deps.logger.log(`[Configuration.Command]: ${rpcAction.method}`)
    switch (rpcAction.method) {
      case ConfigurationHandler.loginMethod:
        await this.handleLoginAsync()
        break;
      case ConfigurationHandler.logoutMethod:
        await this.handleLogoutAsync()
        break;
      default:
        this.deps.logger.log(`Didn't find method: ${JSON.stringify(rpcAction)}`);
    }
    return []
  }
}