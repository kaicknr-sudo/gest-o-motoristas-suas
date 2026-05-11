const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes/routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/motorista", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "motorista.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sistema rodando na porta ${PORT}`);
});