const express = require("express");

const cors = require("cors");

require("dotenv").config();

const incidentRoutes =
  require("./routes/incidents");

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  "/incidents",
  incidentRoutes
);

app.listen(9002, () => {

  console.log(
    "Incident Service running on 9002"
  );

});