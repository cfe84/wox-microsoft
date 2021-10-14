import { Logger } from "./woxlib/Logger";
import { WoxTeamsHandler } from "./WoxTeamsHandler";
import { WoxQueryProcessor } from "./woxlib/WoxQueryProcessor";

const logger = new Logger();
const handler = new WoxTeamsHandler(logger);
const processor = new WoxQueryProcessor(handler, logger);
processor.processFromCommandLineAsync(process.argv).then(() => { });