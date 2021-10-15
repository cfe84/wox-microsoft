import { Authentication } from "./Authentication";
import { Logger } from "./woxlib/Logger";
import "isomorphic-fetch"
import { AuthProvider, Client } from "@microsoft/microsoft-graph-client"

export interface GraphDeps {
  logger: Logger,
  authentication: Authentication
}

export interface GetUserInfoResults {
  displayName: string
  userPrincipal: string
}

export interface SearchEventResult {
  subject: string,
  start: Date,
  end: Date,
  webUrl: string,
  joinUrl: string
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

  async getUserInfo(): Promise<GetUserInfoResults> {
    const user = await this.client
      .api("/me")
      .select(["displayName", "userPrincipalName"])
      .get()
    return {
      displayName: user["displayName"],
      userPrincipal: user["userPrincipalName"]
    }
  }

  async searchEvents(searchTerm: string): Promise<SearchEventResult[]> {
    try {
      const events = await this.client
        .api("/me/events")
        .filter(`contains(subject, '${searchTerm}')`)
        .select(["subject", "start", "end", "onlineMeeting", "webLink"])
        .orderby("start/dateTime")
        .top(20)
        .get()
      return events.value.map((event: any) => {
        const start = new Date(event.start.dateTime + "Z")
        const end = new Date(event.end.dateTime + "Z")
        return {
          start,
          end,
          subject: event.subject,
          joinUrl: event.onlineMeeting?.joinUrl || "",
          webUrl: event.webLink || ""
        }
      })
    } catch (er) {
      this.deps.logger.log(`[graph.searchEvents]: Error while querying: ${er}`)
      return []
    }

  }
}