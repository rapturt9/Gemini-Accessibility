const http = require("http");
const httpProxy = require("http-proxy");

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({});

// To handle proxying the request to the target and back
proxy.on("error", function (err, req, res) {
  console.error(err);
  res.writeHead(500, {
    "Content-Type": "text/plain",
  });
  res.end("Something went wrong. And we are reporting a custom error message.");
});

const server = http.createServer(function (req, res) {
  // This is where you can define your custom logic to determine the target
  const target = { target: "http://example.com" }; // Your target website
  proxy.web(req, res, target);
});

console.log("Listening on port 5050");
server.listen(5050);
