import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/users", (req, res) => {
    res.send("Hello Users!");
})

app.listen(3001, () => {
    console.log("Server is running on port 3001");
})