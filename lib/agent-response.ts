import Negotiator from "negotiator";
import TurndownService from "turndown";
import { siteOverview } from "./site-overview";

const markdown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
markdown.remove((node) => ["script", "style", "head", "nav", "footer", "button", "svg"].includes(node.nodeName.toLowerCase()));
markdown.addRule("embeddedContent", {
  filter: "iframe",
  replacement: (_content, node) => {
    const frame = node as HTMLIFrameElement;
    return `\n\n[${frame.getAttribute("title") ?? "Embedded content"}](${frame.getAttribute("src") ?? ""})\n\n`;
  },
});

export async function servePage(
  request: Request,
  // eslint-disable-next-line no-unused-vars
  render: (request: Request) => Response | Promise<Response>,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  // Leave server functions, API calls, and file/asset requests to their handlers.
  if (
    !["GET", "HEAD"].includes(request.method) ||
    pathname.startsWith("/_") ||
    pathname === "/api" || pathname.startsWith("/api/") ||
    pathname.split("/").some((segment) => segment.includes("."))
  ) return render(request);

  const format = new Negotiator({
    headers: { accept: request.headers.get("accept") ?? "*/*" },
  }).mediaType(["text/html", "text/markdown"]);

  if (!format) {
    return new Response(request.method === "HEAD" ? null : "Available representations: text/html, text/markdown.\n", {
      status: 406,
      headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" },
    });
  }

  // TanStack's page renderer requires HTML, even when we will return Markdown.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("accept", "text/html");
  // Nitro may supply a Request proxy; copy public fields instead of its internals.
  const response = await render(new Request(request.url, {
    method: "GET",
    headers: requestHeaders,
    signal: request.signal,
  }));
  const headers = new Headers(response.headers);
  const vary = headers.get("vary")?.split(",").map((value) => value.trim()) ?? [];
  if (!vary.some((value) => ["*", "accept"].includes(value.toLowerCase()))) {
    vary.push("Accept");
    headers.set("vary", vary.join(", "));
  }

  let body = response.body;
  if (format === "text/markdown" && headers.get("content-type")?.includes("text/html")) {
    const html = await response.text();
    // Convert the rendered main content, including 404s. The minimal homepage
    // gets a supplemental overview; other pages retain their full content.
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
    const overview = pathname === "/" && response.status === 200 ? `\n\n${siteOverview}` : "";
    const converted = markdown.turndown(main) + overview + "\n";
    headers.set("content-type", "text/markdown; charset=utf-8");
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    return new Response(request.method === "HEAD" ? null : converted, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  if (request.method === "HEAD") {
    await body?.cancel();
    body = null;
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
