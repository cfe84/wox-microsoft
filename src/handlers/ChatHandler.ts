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

  async handleSearch(sentence: string): Promise<ResultItem[]> {

    const regex = /(?:(?:send|write)(?: a message)?(?: to)?\s)([^:]+):\s?(.+)/ig
    const res = regex.exec(sentence)
    if (!res) {
      return []
    }
    const name = res[1]
    const message = res[2]
    const people = await this.deps.graph.searchPerson(name)
    return people.map((person) => {
      return {
        IcoPath: consts.icons.teams,
        Subtitle: `Send a message to ${person.name} on Teams`,
        Title: `Send to ${person.name}: ${message}`,
        Score: 100,
        JsonRPCAction: {
          method: METHOD_SEND_CHAT,
          parameters: [person.id, message]
        }
      }
    })
  }

  async sendChat(id: string, message: string) {
    const chatId = await this.deps.graph.createChat(id)
    await this.deps.graph.sendMessage(chatId, message)
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    return await this.handleSearch(rpcAction.parameters[0])
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.method === METHOD_SEND_CHAT) {
      await this.sendChat(rpcAction.parameters[0], rpcAction.parameters[1])
    }
    return []
  }

}