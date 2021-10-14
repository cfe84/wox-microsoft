import * as fs from "fs"

const configurationFile = "teams-config.json"

export class ConfigurationStore {
  isConfigured(): boolean {
    return fs.existsSync(configurationFile)
  }

  saveConfiguration() {
    fs.writeFileSync(configurationFile, "")
  }

  eraseConfiguration() {
    fs.unlinkSync(configurationFile)
  }
}