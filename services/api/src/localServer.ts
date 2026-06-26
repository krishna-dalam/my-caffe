import { createServer } from "node:http";
import { env } from "./config/env.js";
import { createRouter } from "./http/router.js";
import type { ApiGatewayHttpEvent } from "./http/types.js";

const router = createRouter();

const server = createServer((request, response) => {
  const chunks: Buffer[] = [];

  request.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  request.on("end", () => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const event: ApiGatewayHttpEvent = {
      body: chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : null,
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
      ),
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      rawPath: url.pathname,
      requestContext: {
        http: {
          method: request.method ?? "GET",
          path: url.pathname,
        },
      },
    };

    void router.handle(event).then((apiResponse) => {
      response.writeHead(apiResponse.statusCode, apiResponse.headers);
      response.end(apiResponse.body);
    });
  });
});

server.listen(env.port, () => {
  console.info(`API listening on http://localhost:${env.port}`);
});
