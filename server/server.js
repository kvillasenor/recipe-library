const express = require("express");
const path = require("path");
const app = express();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/register.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});

