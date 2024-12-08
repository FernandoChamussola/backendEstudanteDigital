import express from "express";
import mysql2 from "mysql2";
import dotenv from 'dotenv';

const app = express();

dotenv.config();

const port = process.env.PORT || 3001;

const db = mysql2.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.PORT, // Importante adicionar porta
    connectTimeout: 30000,
    socketPath: null,
    ssl: {
        rejectUnauthorized: false // Permite conexão sem certificado
    } 
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL ');
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/tables", (req, res) => {
    db.query("SHOW TABLES", (err, rows) => {
        if (err) {
            console.error('Erro ao executar query:', err);
            res.status(500).send({ error: 'Erro ao executar query' });
            return;
        }
        res.send(rows);
    });
})

app.listen(port, () => {
    console.log("Server is running on port 3001");
})