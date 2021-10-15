import { AccountInfo, ConfidentialClientApplication, Configuration, LogLevel } from "@azure/msal-node"
import * as open from "open"
import { URL } from "url"
import { ConfigurationStore } from "./ConfigurationStore"
import { Logger } from "./woxlib/Logger"
import * as http from "http"
import path = require("path/posix")

export interface AuthenticationDeps {
  configurationStore: ConfigurationStore,
  logger: Logger
}

interface LoginResult {
  code: string,
  userId: string
}

const OAUTH_AUTHORITY = "https://login.microsoftonline.com/common/"
const OAUTH_SCOPES = ["offline_access", "user.read", "Calendars.Read"]
const OAUTH_REDIRECT_URI = "http://localhost:8123"
const LOGIN_CALLBACK_PORT = 8123

export class Authentication {
  private _msalClient: ConfidentialClientApplication
  constructor(private deps: AuthenticationDeps) {
    this._msalClient = this.createMsalClient()
  }

  get msalClient() {
    return this._msalClient
  }

  private createMsalClient(): ConfidentialClientApplication {
    const config = this.deps.configurationStore.oauthConfig
    const loggerCallback = (level: LogLevel, message: string, pii: boolean) => {
      this.deps.logger.log(`MSAL callback: ${message}`)
    }
    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: OAUTH_AUTHORITY,
      },
      cache: {
        cachePlugin: this.deps.configurationStore
      },
      system: {
        loggerOptions: {
          loggerCallback,
          piiLoggingEnabled: false,
          logLevel: LogLevel.Warning,
        }
      }
    }
    const msalClient = new ConfidentialClientApplication(msalConfig)
    return msalClient
  }

  private async loginAndGetCodeAsync(): Promise<LoginResult> {
    const urlParameters = {
      scopes: OAUTH_SCOPES,
      redirectUri: OAUTH_REDIRECT_URI
    }
    const url = await this._msalClient.getAuthCodeUrl(urlParameters)
    open(url)
    const logger = this.deps.logger
    return new Promise((resolve) => {
      const server = http.createServer(function (req, res) {
        const url = new URL(req.url || "", `http://${req.headers.host}`)
        if (url.pathname !== "/" && url.pathname !== "") {
          // Prevent parastic behavior from favicon and such
          res.statusCode = 404
          res.end()
          return;
        }
        const code = url.searchParams.get("code") || ""
        const encodedClientInfo = url.searchParams.get("client_info") || ""
        const clientInfoJson = Buffer.from(encodedClientInfo, "base64").toString()
        const clientInfo = JSON.parse(clientInfoJson)
        const userId = clientInfo.uid
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('You can close this window now!');
        res.end();
        server.close(() => { })
        resolve({
          code,
          userId
        })
      })
      server.listen(LOGIN_CALLBACK_PORT)
    })
  }

  private async getTokenAsync(code: string): Promise<string> {
    const tokenRequest = {
      code: code,
      scopes: OAUTH_SCOPES,
      redirectUri: OAUTH_REDIRECT_URI
    };
    const response = await this._msalClient.acquireTokenByCode(tokenRequest)
    return response?.idToken || "no id token"
  }

  async authProvider(done: (err: any | null, msg: string | null) => void) {
    try {
      const userId = this.deps.configurationStore.UserId
      let account: AccountInfo | null = null
      if (userId) {
        account = await this._msalClient.getTokenCache().getAccountByHomeId(userId)
      }
      if (!account) {
        const accounts = await this._msalClient.getTokenCache().getAllAccounts()
        if (accounts.length < 0) {
          done("no accounts", null)
        }
        account = accounts[0]
        this.deps.configurationStore.UserId = account.homeAccountId
      }
      const response = await this._msalClient.acquireTokenSilent({
        scopes: OAUTH_SCOPES,
        account: account
      })
      if (response?.accessToken) {
        done(null, response?.accessToken)
      } else {
        done("No access token", null)
      }
    } catch (err) {
      console.error(`Error while authenticating: `, JSON.stringify(err, null, 2))
      done(err, null)
    }
  }

  async loginAsync() {
    const loginResult = await this.loginAndGetCodeAsync()
    await this.getTokenAsync(loginResult.code)
    this.deps.configurationStore.UserId = loginResult.userId
  }

  async logoutAsync() {
    this.deps.configurationStore.eraseCache()
    this._msalClient = this.createMsalClient()
  }
}