import express from "express";
import pkg from 'pg';
 // Biblioteca para PostgreSQL
import dotenv from "dotenv";

const app = express();
const { Pool } = pkg;
dotenv.config();

const port = process.env.PORT || 3001;

// Configuração da conexão com PostgreSQL
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// Teste de conexão com o banco de dados
db.connect((err, client, release) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
        return;
    }
    console.log("Conectado ao banco de dados PostgreSQL");
    release(); // Libera o cliente
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Endpoint para listar tabelas do banco de dados
app.get("/tables", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        res.send(result.rows);
    } catch (err) {
        console.error("Erro ao executar query:", err);
        res.status(500).send({ error: "Erro ao executar query" });
    }
});

app.listen(port, () => {
    console.log("Server is running on port " + port);
});
