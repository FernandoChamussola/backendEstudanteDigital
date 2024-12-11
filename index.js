import express from "express";
import pkg from 'pg'; // Biblioteca para PostgreSQL
import dotenv from "dotenv";
import jwt from "jsonwebtoken"; // Biblioteca para JWT

const app = express();
app.use(express.json());
const { Pool } = pkg;
dotenv.config();

const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta"; 

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

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({ error: "Email e senha são obrigatórios" });
    }

    try {
        const query = 'SELECT * FROM usuarios WHERE email = $1 AND senha = $2';
        const values = [email, password];
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(401).send({ error: "Credenciais inválidas" });
        }

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, perfil: user.perfil }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).send({ message: "Login bem-sucedido", token });
    } catch (err) {
        console.error("Erro ao processar login:", err);
        res.status(500).send({ error: "Erro ao processar login" });
    }
});

// Middleware para validar o token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send({ error: "Token não fornecido" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).send({ error: "Token inválido ou expirado" });
        }
        req.user = user; // Adiciona o usuário ao request
        next();
    });
};

// Exemplo de rota protegida
app.get('/perfil', authenticateToken, (req, res) => {
    res.status(200).send({ message: "Acesso autorizado", user: req.user });
});

app.listen(port, () => {
    console.log("Server is running on port " + port);
});
