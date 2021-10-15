import { Authentication } from "./Authentication";
import { Logger } from "./woxlib/Logger";
import "isomorphic-fetch"
import { AuthProvider, Client } from "@microsoft/microsoft-graph-client"
import { ConfigurationStore } from "./ConfigurationStore";

export interface GraphDeps {
  logger: Logger,
  authentication: Authentication,
  configurationStore: ConfigurationStore
}

export interface GetUserInfoResults {
  displayName: string
  userPrincipal: string
  id: string
}

export interface SearchEventResult {
  subject: string,
  start: Date,
  end: Date,
  webUrl: string,
  joinUrl: string
}

export interface SearchPersonResult {
  name: string,
  id: string,
  userPrincipalName: string
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
      .select(["displayName", "userPrincipalName", "id"])
      .get()
    return {
      displayName: user["displayName"],
      userPrincipal: user["userPrincipalName"],
      id: user["id"]
    }
  }

  async searchEvents(searchTerm: string): Promise<SearchEventResult[]> {
    try {
      const events = await this.client
        .api("/me/events")
        .filter(`contains(subject, '${searchTerm}'`)
        .select(["subject", "start", "end", "onlineMeeting", "webLink"])
        .orderby("start/dateTime")
        .top(10)
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

  async searchPerson(name: string): Promise<SearchPersonResult[]> {
    try {
      const people = await this.client
        .api("/me/people")
        .search(name)
        .select(["id", "displayName", "userPrincipalName"])
        .top(20)
        .get()
      return people.value.map((person: any) => {
        return {
          name: person.displayName,
          userPrincipalName: person.userPrincipalName || "",
          id: person.id || ""
        }
      })
    } catch (er) {
      this.deps.logger.log(`[graph.searchPerson]: Error while querying: ${er}`)
      return []
    }
  }

  async createChat(withUserId: string): Promise<string> {
    const myId = this.deps.configurationStore.UserId
    const chat = {
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${myId}')`
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${withUserId}')`
        }
      ]
    };
    const res = await this.client.api("/chats").post(chat)
    return res.id
  }
  async sendMessage(chatId: string, message: string): Promise<string> {
    const msg = {
      body: {
        content: message
      }
    };
    const res = await this.client.api(`/chats/${chatId}/messages`).post(msg)
    return res.id
  }
}