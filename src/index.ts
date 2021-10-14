import { Logger } from "./woxlib/Logger";
import { WoxTeamsHandler } from "./WoxTeamsHandler";
import { WoxQueryProcessor } from "./woxlib/WoxQueryProcessor";
import { ConfigurationStore } from "./ConfigurationStore";

const logger = new Logger();
const configurationStore = new ConfigurationStore()
const handler = new WoxTeamsHandler({ logger, configurationStore });
const processor = new WoxQueryProcessor(handler, logger);
processor.processFromCommandLineAsync(process.argv).then(() => { });