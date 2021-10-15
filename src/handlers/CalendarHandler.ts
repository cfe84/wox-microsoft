import { consts } from "../consts";
import { Graph } from "../Graph";
import { IHandler, IHandlerSettings } from "../IHandler";
import { JsonRPCAction } from "../woxlib/JsonRPCAction";
import { Logger } from "../woxlib/Logger";
import { ResultItem } from "../woxlib/ResultItem";
import * as open from "open"

const PREFIX = "calendar"
const METHOD_OPEN_EVENT = `${PREFIX}.open-event`
const COMMAND_OPEN = `open`
const COMMAND_JOIN = `join`

const toBase64 = (str: string) => {
  const b = Buffer.from(str)
  return b.toString("base64")
}
const fromBase64 = (b64: string) => {
  const b = Buffer.from(b64, "base64")
  return b.toString()
}

export interface CalendarHandlerDeps {
  graph: Graph,
  logger: Logger
}

export class CalendarHandler implements IHandler {

  constructor(private deps: CalendarHandlerDeps) { }

  get settings(): IHandlerSettings {
    return {
      acceptCatchAll: true,
      prefix: PREFIX,
      requiresLogin: true
    }
  }

  private formatDateSpan(from: Date, to: Date): string {
    const isSameDay = (d1: Date, d2: Date): boolean =>
      d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth()

    const fromDateFormat: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric"
    }
    let toDateFormat: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric"
    }
    const today = new Date()
    if (from.getFullYear() !== today.getFullYear()) {
      fromDateFormat.year = "numeric"
    }
    if (!isSameDay(from, today)) {
      fromDateFormat.day = "numeric"
      fromDateFormat.weekday = "long"
      fromDateFormat.month = "short"
    }
    if (!isSameDay(from, to)) {
      toDateFormat = fromDateFormat
    }
    const fromStr = from.toLocaleString("en-us", fromDateFormat)
    const toStr = to.toLocaleString("en-us", toDateFormat)
    return `From ${fromStr} to ${toStr}`
  }

  async handleSearchAsync(query: string): Promise<ResultItem[]> {
    const isJoin = query.startsWith(COMMAND_JOIN + " ")
    let isOpen = query.startsWith(COMMAND_OPEN + " ")
    if (isJoin) {
      query = query.substring(COMMAND_JOIN.length + 1)
    }
    if (isOpen) {
      query = query.substr(COMMAND_OPEN.length + 1)
    }
    try {
      const matchingEvents = await this.deps.graph.searchEvents(query)
      return matchingEvents
        .filter(event => !!event)
        .map((event, index) => {
          const joinEvent = isJoin && event.joinUrl

          return {
            IcoPath: consts.icons.calendar,
            Subtitle: this.formatDateSpan(event.start, event.end),
            Title: (joinEvent ? "Join " : "Open ") + event.subject,
            Score: 100 - index,
            JsonRPCAction: {
              method: METHOD_OPEN_EVENT,
              parameters: [toBase64((joinEvent ? event.joinUrl : event.webUrl) || "")]
            },
          }
        }
        )
    } catch (error) {
      this.deps.logger.log(`[calendar handler.query]: error retrieving events: ${error}`)
      return []
    }
  }

  handleOpenEventCommand(rpcAction: JsonRPCAction): ResultItem[] {
    const url = fromBase64(rpcAction.parameters[0])
    open(url)
    return []
  }

  async processQueryAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.parameters
      && rpcAction.parameters.length > 0
      && rpcAction.parameters[0].trim().length > 0) {
      const searchResults = this.handleSearchAsync(rpcAction.parameters[0].trim())
      return searchResults
    }
    return []
  }

  async processCommandAsync(rpcAction: JsonRPCAction): Promise<ResultItem[]> {
    if (rpcAction.method === METHOD_OPEN_EVENT) {
      return this.handleOpenEventCommand(rpcAction)
    }
    return []
  }

}