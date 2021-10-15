import { consts } from "../consts";
import { Graph } from "../Graph";
import { IHandler, IHandlerSettings } from "../IHandler";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Logger } from "../woxlib/Logger";
import { ResultItem } from "../woxlib/ResultItem";
import * as open from "open"

const PREFIX = "person"
const METHOD_OPEN_CHAT = `${PREFIX}.open-chat`

const toBase64 = (str: string) => {
  const b = Buffer.from(str)
  return b.toString("base64")
}
const fromBase64 = (b64: string) => {
  const b = Buffer.from(b64, "base64")
  return b.toString()
}

export interface PersonHandlerDeps {
  graph: Graph,
  logger: Logger
}

export class PersonHandler implements IHandler {

  constructor(private deps: PersonHandlerDeps) { }

  get settings(): IHandlerSettings {
    return {
      acceptCatchAll: true,
      prefix: PREFIX,
      requiresLogin: true
    }
  }

  async handleSearchAsync(query: string): Promise<ResultItem[]> {
    try {
      const matchingPerson = await this.deps.graph.searchPerson(query)
      return matchingPerson
        .filter(event => !!event)
        .map((person, index) => {
          return {
            IcoPath: consts.icons.teams,
            Subtitle: "Opens a Teams chat with the person",
            Title: `Chat with ${person.name}`,
            Score: 100 - index,
            JsonRPCAction: {
              method: METHOD_OPEN_CHAT,
              parameters: [person.id]
            },
          }
        }
        )
    } catch (error) {
      this.deps.logger.log(`[calendar handler.query]: error retrieving events: ${error}`)
      return []
    }
  }

  async handleOpenChatCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    const id = rpcAction.parameters[0]
    const chatId = await this.deps.graph.createChat(id)
    open(`https://teams.microsoft.com/_#/conversations/${chatId}@unq.gbl.spaces?ctx=chat`)
    return []
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.parameters
      && rpcAction.parameters.length > 0
      && rpcAction.parameters[0].trim().length > 0) {
      const command = rpcAction.parameters[0].trim()
      return this.handleSearchAsync(command)
    }
    return []
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.method === METHOD_OPEN_CHAT) {
      return await this.handleOpenChatCommandAsync(rpcAction)
    }
    return []
  }

}