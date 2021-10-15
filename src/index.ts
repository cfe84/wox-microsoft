import { Logger } from "./woxlib/Logger";
import { WoxTeamsHandler } from "./WoxTeamsHandler";
import { WoxQueryProcessor } from "./woxlib/WoxQueryProcessor";
import { ConfigurationStore } from "./ConfigurationStore";
import { Authentication } from "./Authentication";
import { Graph } from "./Graph";

const logger = new Logger(true);
const configurationStore = new ConfigurationStore()
const authentication = new Authentication({ configurationStore, logger })
const graph = new Graph({ authentication, logger, configurationStore })
const handler = new WoxTeamsHandler({ logger, configurationStore, authentication, graph });
const processor = new WoxQueryProcessor(handler, logger);
processor.processFromCommandLineAsync(process.argv)
  .then(() => { })
  .catch((err) => {
    console.error("Failed execution: ", err)
    return -1
  })