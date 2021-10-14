import * as fs from "fs";
import * as path from "path";
export class Logger {
  constructor(private shouldLog: boolean = false) {}
  log(str: string) {
    if (this.shouldLog) {
      fs.appendFileSync("debug.txt", `${str}\n`);
    }
  }
}
