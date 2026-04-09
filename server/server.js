const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

//Middlware
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

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

app.get("/add-recipe", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/add-recipe.html"));
});

// Will handle registration
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // checks to see if username already exists
    const checkUser = "SELECT * FROM users WHERE username = ?";

    db.query(checkUser, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Error checking user");
        }

        // this is if the username exists
        if (results.length > 0) {
            return res.redirect("/register?error=Username already exists");
        }

        try {
            //hashes the password
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

        } catch (error) {
            console.error(error);
            res.send("Error hashing password");
        }
    });
});


//Handles login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect("/?error=Server error");
        }

        if (results.length == 0) {
            return res.redirect("/?error=Invalid username or password");
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            //Successful login
            req.session.user_id = user.user_id;
            res.redirect("/dashboard");
        } else {
            //Invalid login
            return res.redirect("/?error=Invalid username or password");
        }
    });
});

app.post("/add-recipe", (req, res) => {

    console.log("BODY:", req.body);

    if (!req.session.user_id) {
        return res.redirect("/");
    }

    const {
        title,
        ingredients,
        instructions,
        prep_hours,
        prep_minutes,
        cook_hours,
        cook_minutes,
        course,
        category
    } = req.body;

    const prep_time = `${prep_hours || 0}h ${prep_minutes || 0}m`;
    const cook_time = `${cook_hours || 0}h ${cook_minutes || 0}m`;

    const sql = `
        INSERT INTO recipes 
        (user_id, title, ingredients, instructions, prep_time, cook_time, course, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        req.session.user_id,
        title,
        ingredients,
        instructions,
        prep_time,
        cook_time,
        course,
        category
    ], (err, result) => {
        if (err) {
           console.log("MYSQL ERROR:", err);
            return res.send(err.sqlMessage || err.message);
        }

        res.redirect("/dashboard");
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

