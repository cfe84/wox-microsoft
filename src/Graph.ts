import { Authentication } from "./Authentication";
import { Logger } from "./woxlib/Logger";
import "isomorphic-fetch"
import { AuthProvider, Client } from "@microsoft/microsoft-graph-client"

export interface GraphDeps {
  logger: Logger,
  authentication: Authentication
}

export class Graph {
  private client: Client

  constructor(private deps: GraphDeps) {
    this.client = this.initClient()
  }

  private initClient(): Client {
    const client = Client.init({
      authProvider: (done) => this.deps.authentication.authProvider(done)
    })
    return client
  }

  async getUserInfo(): Promise<string> {
    const user = await this.client
      .api("/me")
      .select("displayName")
      .get()
    return user["displayName"]
  }
}