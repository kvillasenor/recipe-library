require("dotenv").config();
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);

const path = require("path");

const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");

const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const app = express();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
//Middlware
app.use(express.static(path.join(__dirname, "../public")));app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.query("SELECT NOW()", (err, res) => {
    console.log("DB TEST ERROR:", err);
    console.log("DB TEST SUCCESS:", res?.rows);
});

console.log("PostgreSQL pool ready");

function requireLogin(req, res, next) {
    if (!req.session.user_id) {
        return res.redirect("/");
    }
    next();
}

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        const allowedTypes = ["image/jpeg", "image/png"];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG and PNG files are allowed"), false);
        }
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

app.get("/recipes", requireLogin, (req, res) => {

    const sql = `
        SELECT *
        FROM recipes
        WHERE user_id = $1
    `;

    db.query(sql, [req.session.user_id], (err, results) => {
        if (err) {
            console.error("Error fetching recipes:", err);
            return res.status(500).json({ error: "Database error" });
        }

        res.json(results.rows);
    });
});

app.get("/recipe/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/recipe.html"));
});

app.get("/recipes/:id", requireLogin, (req, res) => {

    const sql = "SELECT * FROM recipes WHERE id = $1 AND user_id = $2";

    db.query(sql, [req.params.id, req.session.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (results.rows.length === 0) {
            return res.status(404).json({ error: "Recipe not found" });
        }

        res.json(results.rows[0]);
    });
});

app.get("/categories", requireLogin, (req, res) => {
    const sql = "SELECT * FROM categories WHERE user_id = $1";

    db.query(sql, [req.session.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });

        res.json(results.rows);
    });
});

app.get("/edit-recipe/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/edit-recipe.html"));
});

// Will handle registration
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // checks to see if username already exists
    const checkUser = "SELECT * FROM users WHERE username = $1";

    db.query(checkUser, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.send("Error checking user");
        }

        // this is if the username exists
        if (results.rows.length > 0) {
            return res.redirect("/register?error=Username already exists");
        }

        try {
            //hashes the password
            const hashedPassword = await bcrypt.hash(password, 10);

            const sql = "INSERT INTO users (username, password) VALUES ($1, $2)";

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
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = $1";

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.redirect("/?error=Server error");
        }

        if (results.rows.length == 0) {
            return res.redirect("/?error=Invalid username or password");
        }

        const user = results.rows[0];

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

app.post("/add-recipe", requireLogin, (req, res) => {
    upload.single("image")(req, res, async function (err) {
        if (err) {
            return res.status(400).send(err.message);
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

    if (!title || !ingredients || !instructions) {
        return res.send("Missing required fields");
    }
    
    let image = null;

    if (req.file) {
        const fileName = Date.now() + "-" + req.file.originalname;

        const { error } = await supabase.storage
            .from("recipe-images")
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype
            });

        if (error) {
            console.error(error);
            return res.send("Image upload failed");
        }

        const { data } = supabase.storage
            .from("recipe-images")
            .getPublicUrl(fileName);

        image = data.publicUrl;
    }

    const prep_time = `${prep_hours || 0}h ${prep_minutes || 0}m`;
    const cook_time = `${cook_hours || 0}h ${cook_minutes || 0}m`;

    const sql = `
        INSERT INTO recipes 
        (user_id, title, ingredients, instructions, prep_time, cook_time, course, category, image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    db.query(sql, [
        req.session.user_id,
        title,
        ingredients,
        instructions,
        prep_time,
        cook_time,
        course,
        category,
        image
    ], (err) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.send("Error saving recipe");
        }

        res.redirect("/dashboard");
        });
    });
});

app.post("/update-recipe/:id", requireLogin, (req, res) => {
    upload.single("image")(req, res, async function (err) {
        if (err) {
            return res.redirect(
                `/edit-recipe/${req.params.id}?error=` +
                encodeURIComponent(err.message)
            );
        }

        const id = req.params.id;

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

        let imagePath = null;

        try {
            if (req.file) {
                const fileName = Date.now() + "-" + req.file.originalname;

                const { error } = await supabase.storage
                    .from("recipe-images")
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype
                    });

                if (error) {
                    console.error(error);
                    return res.status(500).send("Image upload failed");
                }

                const { data } = supabase.storage
                    .from("recipe-images")
                    .getPublicUrl(fileName);

                imagePath = data.publicUrl;
            }

            let sql;
            let params;

            if (imagePath) {
                sql = `
                    UPDATE recipes
                    SET title = $1, ingredients = $2, instructions = $3,
                        prep_time = $4, cook_time = $5, course = $6,
                        category = $7, image = $8
                    WHERE id = $9 AND user_id = $10
                `;

                params = [
                    title,
                    ingredients,
                    instructions,
                    prep_time,
                    cook_time,
                    course,
                    category,
                    imagePath,
                    id,
                    req.session.user_id
                ];
            } else {
                sql = `
                    UPDATE recipes
                    SET title = $1, ingredients = $2, instructions = $3,
                        prep_time = $4, cook_time = $5, course = $6,
                        category = $7
                    WHERE id = $8 AND user_id = $9
                `;

                params = [
                    title,
                    ingredients,
                    instructions,
                    prep_time,
                    cook_time,
                    course,
                    category,
                    id,
                    req.session.user_id
                ];
            }

            db.query(sql, params, (err) => {
                if (err) {
                    console.error("UPDATE ERROR:", err);
                    return res.status(500).send("Database error");
                }

                res.sendStatus(200);
            });

        } catch (error) {
            console.error("UPDATE ROUTE ERROR:", error);
            res.status(500).send("Server error");
        }
    });
});

app.post("/delete-recipe/:id", requireLogin, (req, res) => {

    const id = req.params.id;

    const sql = "DELETE FROM recipes WHERE id = $1 AND user_id = $2";

    db.query(sql, [id, req.session.user_id], (err, result) => {
        if (err) {
            console.error("DELETE ERROR:", err);
            return res.status(500).send("Database error");
        }

        res.sendStatus(200);
    });
});

app.post("/categories", requireLogin, (req, res) => {
    const { name } = req.body;

    const sql = "INSERT INTO categories (name, user_id) VALUES ($1, $2)";

    db.query(sql, [name, req.session.user_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }

        res.json({ success: true });
    });
});
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});