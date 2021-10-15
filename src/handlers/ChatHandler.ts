import { threadId } from "worker_threads";
import { consts } from "../consts";
import { Graph } from "../Graph";
import { IHandler, IHandlerSettings } from "../IHandler";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Logger } from "../woxlib/Logger";
import { ResultItem } from "../woxlib/ResultItem";

export interface ChatHandlerDeps {
  logger: Logger,
  graph: Graph
}

export interface ChatTarget {
  name: string,
  id: string,
  isMeeting: boolean
}

const PREFIX = "chat"
const METHOD_SEND_CHAT = PREFIX + ".send-chat"

export class ChatHandler implements IHandler {
  constructor(private deps: ChatHandlerDeps) { }
  get settings(): IHandlerSettings {
    return {
      acceptCatchAll: true,
      prefix: PREFIX,
      requiresLogin: true
    }
  }

  private async getPersonTarget(name: string): Promise<ChatTarget[]> {
    const people = await this.deps.graph.searchPerson(name)
    return people.map(person => ({
      id: person.id,
      isMeeting: false,
      name: person.name
    }))
  }
  private async getMeetingTarget(name: string): Promise<ChatTarget[]> {
    const meetings = await this.deps.graph.searchEvents(name)
    return meetings.map(meeting => ({
      id: meeting.id,
      isMeeting: true,
      name: meeting.subject
    }))
  }
  private async getNextMeetingTarget(): Promise<ChatTarget[]> {
    const meetings = await this.deps.graph.getNextMeetings()
    this.deps.logger.log(`Found ${meetings.length}`)
    return meetings.map(meeting => ({
      id: meeting.id,
      isMeeting: true,
      name: meeting.subject
    }))
  }

  async handleSearch(sentence: string): Promise<ResultItem[]> {
    const regex = /(?:(?:send|write)(?: (?:a )?message)?(?: to)?\s)(meeting\s+)?([^:]+):\s?(.+)/ig
    const res = regex.exec(sentence)
    if (!res) {
      return []
    }

    const name = res[2]
    const isMeeting = !!res[1]
    const message = res[3]
    const isNextMeeting = name === "next meeting"
    this.deps.logger.log(`Search message: ${name}, ${isMeeting}, ${isNextMeeting}, ${message}`)
    let target: ChatTarget[]
    if (isNextMeeting) {
      target = await this.getNextMeetingTarget()
    } else if (isMeeting) {
      target = await this.getMeetingTarget(name)
    } else {
      target = await this.getPersonTarget(name)
    }

    return target.map((target) => {
      return {
        IcoPath: consts.icons.teams,
        Subtitle: `Send a message to ${target.name} on Teams`,
        Title: `Send to ${target.name}: ${message}`,
        Score: 200,
        JsonRPCAction: {
          method: METHOD_SEND_CHAT,
          parameters: [target.id, message, isMeeting ? "meeting" : "oneToOne"]
        }
      }
    })
  }

  async sendChat(id: string, message: string, type: string) {
    let chatId = id
    if (type === "oneToOne") {
      const chatId = await this.deps.graph.createChat(id)
    }
    await this.deps.graph.sendMessage(chatId, message)
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    return await this.handleSearch(rpcAction.parameters[0])
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.method === METHOD_SEND_CHAT) {
      await this.sendChat(rpcAction.parameters[0], rpcAction.parameters[1], rpcAction.parameters[2])
    }
    return []
  }

}