import type { LogPayload } from "../types/message.types";
import { log } from "../utils/log.utils";

export async function handleLog(payload: LogPayload): Promise<void> {
  log(payload.line);
}
