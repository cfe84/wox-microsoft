import * as fs from "fs"
import * as dotenv from "dotenv"
import { ICachePlugin, TokenCacheContext } from "@azure/msal-node"

dotenv.config()
const CONFIGURATION_FILE_PATH = "teams-config.json"

interface OAuthConfig {
  clientId: string,
  clientSecret: string
}

interface ConfigFile {
  oauthCachedData?: string
}

export class ConfigurationStore implements ICachePlugin {

  private config: ConfigFile

  constructor() {
    this.config = this.loadConfigFile()
  }

  private loadConfigFile(): ConfigFile {
    if (!fs.existsSync(CONFIGURATION_FILE_PATH)) {
      return {}
    }
    const content = fs.readFileSync(CONFIGURATION_FILE_PATH).toString()
    return JSON.parse(content) as ConfigFile
  }

  private saveConfigFile() {
    fs.writeFileSync(CONFIGURATION_FILE_PATH, JSON.stringify(this.config))
  }

  /**
   * Load cache
   * @param tokenCacheContext 
   */
  async beforeCacheAccess(tokenCacheContext: TokenCacheContext): Promise<void> {
    if (this.config.oauthCachedData) {
      tokenCacheContext.cache.deserialize(this.config.oauthCachedData)
    }
  }

  /**
   * Save cache
   * @param tokenCacheContext 
   */
  async afterCacheAccess(tokenCacheContext: TokenCacheContext): Promise<void> {
    if (tokenCacheContext.cacheHasChanged) {
      this.config.oauthCachedData = tokenCacheContext.cache.serialize()
    }
    this.saveConfigFile()
  }

  isAuthenticated(): boolean {
    return this.config.oauthCachedData !== undefined
  }

  eraseConfiguration() {
    fs.unlinkSync(CONFIGURATION_FILE_PATH)
  }

  get oauthConfig(): OAuthConfig {
    return {
      clientId: process.env["CLIENT_ID"] || "",
      clientSecret: process.env["CLIENT_KEY"] || ""
    }
  }
}