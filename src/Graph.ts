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
  id: string,
  subject: string,
  start: Date,
  end: Date,
  webUrl: string,
  joinUrl: string
  threadId: string
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

  async getNextInRec(eventId: string): Promise<any | undefined> {
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 90)
    try {
      const events = await this.client
        .api(`/me/events/${eventId}/instances`)
        .query({
          StartDateTime: from.toISOString(),
          EndDateTime: to.toISOString()
        })
        .select(["subject", "start", "end", "onlineMeeting", "webLink"])
        .top(1)
        .get()
      return events.value[0]
    } catch (er) {
      this.deps.logger.log(`[graph.getNextInRec]: Error while querying: ${er}`)
      return undefined
    }
  }

  private mapToSearchEventResult(event: any): SearchEventResult {
    {
      const start = new Date(event.start.dateTime + "Z")
      const end = new Date(event.end.dateTime + "Z")
      const threadIdRegex = /.+\/meetup-join\/([^/]+)\//i
      let threadId = ""
      const res = threadIdRegex.exec(event.onlineMeeting?.joinUrl || "")
      if (res) {
        threadId = res[1]
        if (threadId) {
          // threadId = decodeURIComponent(threadId)
          this.deps.logger.log(threadId)
        }
      }
      return {
        id: event.id,
        start,
        end,
        subject: event.subject,
        joinUrl: event.onlineMeeting?.joinUrl || "",
        webUrl: event.webLink || "",
        threadId
      }
    }
  }

  async searchEvents(searchTerm: string): Promise<SearchEventResult[]> {
    const result: SearchEventResult[] = []

    try {
      const baseEvents = await this.client
        .api("/me/events")
        .filter(`contains(subject, '${searchTerm}')`)
        .select(["id", "subject", "start", "end", "onlineMeeting", "webLink", "recurrence"])
        .orderby("start/dateTime")
        .top(10)
        .get()
      const recurringEvents = baseEvents.value.filter((event: any) => event.recurrence)
      const nonRecurringEvents = baseEvents.value.filter((event: any) => !event.recurrence)

      await Promise.all(recurringEvents.map(async (event: any) => {
        const nextInstance = await this.getNextInRec(event.id)
        if (nextInstance) {
          result.push(this.mapToSearchEventResult(nextInstance))
        } else {
          result.push(this.mapToSearchEventResult(event))
        }
      }))
      nonRecurringEvents.forEach((event: any) => result.push(this.mapToSearchEventResult(event)))
    } catch (er) {
      this.deps.logger.log(`[graph.searchEvents]: Error while querying: ${er}`)
    }
    result.sort((a, b) => a.start.getTime() - b.start.getTime())
    return result
  }

  private _nextMeetingsCache: SearchEventResult[] | null = null

  async getNextMeetings(): Promise<SearchEventResult[]> {
    if (this._nextMeetingsCache) {
      return this._nextMeetingsCache
    }
    const result: SearchEventResult[] = []
    const from = new Date()
    const to = new Date()
    from.setHours(from.getHours() - 1)
    to.setDate(to.getDate() + 7)

    try {
      const events = await this.client
        .api("/me/calendarView")
        .query({
          startDateTime: from.toISOString(),
          endDateTime: to.toISOString()
        })
        .select(["id", "subject", "start", "end", "onlineMeeting", "webLink", "recurrence"])
        .orderby("start/dateTime")
        .top(5)
        .get()

      events.value.forEach((event: any) => result.push(this.mapToSearchEventResult(event)))
    } catch (er) {
      this.deps.logger.log(`[graph.next meeting]: Error while querying: ${er}`)
    }
    result.sort((a, b) => a.start.getTime() - b.start.getTime())
    this._nextMeetingsCache = result
    return result
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
    this.deps.logger.log(`[graph.sendMessage] Sending to /chats/${chatId}/messages`)
    const res = await this.client.api(`/chats/${chatId}/messages`).post(msg)
    return res.id
  }
}