const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const { error } = require("console");

const app = express();

//Middlware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "F@m4life12", 
    database: "recipe_library"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL!");
    }
});

//Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/register.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});

// Will handle registration
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO users (username, password) VALUES (?, ?)";

        db.query(sql, [username, hashedPassword], (err, result) => {
            if (err) {
                console.error(err);
                return res.send("Error registering user");
            }

            console.log("User registered:", username);
            res.redirect("/");
        });
    } catch(err) {
        console.error(error);
        res.send("Error hashing password");
    }
    
});


//Handles login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Error logging in");
        }

        if (results.length == 0) {
            return res.send("Invalid username or password");
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            //Successful login
            res.redirect("/dashboard");
        } else {
            //Invalid login
            res.send("Invalid username or password");
        }
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

