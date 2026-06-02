const express = require("express");
const http = require("http");

const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {                              
  
    origin: "*"
  }
});

io.on("connection", (socket) => {

  console.log("Client connected");

  socket.on("join-incident", (incidentId) => {
 
    socket.join(incidentId);

    console.log("Joined room:", incidentId);
  });

  socket.on("timeline-event", ({ incidentId, event }) => {

    io.to(String(incidentId)).emit( 
      "timeline:new",
      event
    );
  });

  socket.on("severity-change", ({ incidentId, severity }) => {

    io.to(String(incidentId)).emit( 
      "severity:changed",
      { severity }
    );
  });

});

server.listen(9003, () => {
  console.log("Socket Service running on 9003");
});