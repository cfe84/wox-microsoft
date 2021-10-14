import { IWoxQueryHandler } from "./IWoxQueryHandler";
import { JsonRPCAction } from "./JsonRPCAction";
import { Logger } from "./Logger";

export class WoxQueryProcessor {
  constructor(private handler: IWoxQueryHandler, private logger: Logger) {}

  async processFromCommandLineAsync(argv: string[]) {
    const request: JsonRPCAction = JSON.parse(argv[2]);
    const response = await this.handler.processAsync(request);
    if (response && response.result) {
      const serializedResponse = JSON.stringify(response);
      console.log(serializedResponse);
      this.logger.log(serializedResponse);
    }
  }
}
