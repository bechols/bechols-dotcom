import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { servePage } from "../lib/agent-response";

export default createServerEntry({
  fetch(request, options) {
    return servePage(request, (htmlRequest) => handler.fetch(htmlRequest, options));
  },
});
