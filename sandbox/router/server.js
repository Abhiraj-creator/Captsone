import http from "http";
import app, { getProxyForHost } from "./src/app.js";

const server = http.createServer(app);

server.on('upgrade', (req, socket, head) => {
  const proxy = getProxyForHost(req.headers.host);

  if (!proxy) {
    socket.destroy();
    return;
  }

  proxy.upgrade(req, socket, head);
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
