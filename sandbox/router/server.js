import http from "http";
import app, { getProxyForHost } from "./src/app.js";

const server = http.createServer(app);

server.on('upgrade', async (req, socket, head) => {
  try {
    const proxy = await getProxyForHost(req.headers.host);
    if (!proxy) {
      socket.destroy();
      return;
    }
    proxy.upgrade(req, socket, head);
  } catch (error) {
    console.error('Failed websocket upgrade proxy', error);
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
