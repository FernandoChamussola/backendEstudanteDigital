import express from "express";
import pkg from 'pg';
 // Biblioteca para PostgreSQL
import dotenv from "dotenv";

const app = express();
app.use(express.json());
const { Pool } = pkg;
dotenv.config();

const port = process.env.PORT || 3001;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://estudantedigital.netlify.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.options('*', (req, res) => {
    res.header("Access-Control-Allow-Origin", "https://estudantedigital.netlify.app");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.sendStatus(200); // Responde OK ao preflight
});


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
        console.error("Erro ao executar query: ", err);
        res.status(500).send({ error: "Erro ao executar query" });
    }
});

app.post('/cadastro', (req, res) => {
    try {
        const { nome, email, senha, data_nascimento, telefone, perfil } = req.body;
        const query = 'INSERT INTO usuarios (nome, email, senha, data_nascimento, telefone, perfil) VALUES ($1, $2, $3, $4, $5, $6)';
        const values = [nome, email, senha, data_nascimento, telefone, perfil];
        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Erro ao cadastrar', err);
                res.status(500).send({ error: 'Erro ao cadastrar' });
            } else {
                console.log('Cadastrado com sucesso');
                res.status(201).send({ message: 'Cadastrado com sucesso' });
            }
        });
    } catch (err) {
        console.error('Erro ao cadastrar', err);
        res.status(500).send({ error: 'Erro ao cadastrar' });
    }
});

app.listen(port, () => {
    console.log("Server is running on port " + port);
});
