const express = require("express");
const path = require("path");

const app = express();

const root =
  path.join(__dirname);

app.use(express.static(root));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Static frontend: http://localhost:${PORT}`
  );
  console.log(
    "Recommended: use gateway at http://localhost:9000"
  );
});
