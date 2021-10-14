import { ConfidentialClientApplication, Configuration, LogLevel } from "@azure/msal-node"
import * as open from "open"
import { URL } from "url"
import { ConfigurationStore } from "./ConfigurationStore"
import { Logger } from "./woxlib/Logger"
import * as http from "http"

export interface AuthenticationDeps {
  configurationStore: ConfigurationStore,
  logger: Logger
}

const OAUTH_AUTHORITY = "https://login.microsoftonline.com/common/"
const OAUTH_SCOPES = ["offline_access", "user.read", "calendars.readwrite", "mailboxsettings.read"]
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
          logLevel: LogLevel.Verbose,
        }
      }
    }
    const msalClient = new ConfidentialClientApplication(msalConfig)
    return msalClient
  }


  private async loginAndGetCodeAsync(): Promise<string> {
    const urlParameters = {
      scopes: OAUTH_SCOPES,
      redirectUri: OAUTH_REDIRECT_URI
    }
    const url = await this._msalClient.getAuthCodeUrl(urlParameters)
    open(url)
    return new Promise((resolve) => {
      const server = http.createServer(function (req, res) {
        const url = new URL(req.url || "", `http://${req.headers.host}`)
        const code = url.searchParams.get("code") || ""
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('You can close this window now!');
        res.end();
        server.close(() => { })
        resolve(code)
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
      const accounts = await this._msalClient.getTokenCache().getAllAccounts()
      if (accounts.length < 0) {
        done("no accounts", null)
      }
      const account = accounts[0]
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
    const code = await this.loginAndGetCodeAsync()
    const token = await this.getTokenAsync(code)
    console.log(token)
  }
}