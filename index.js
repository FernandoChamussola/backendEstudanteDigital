import express from "express";
import pkg from 'pg'; // Biblioteca para PostgreSQL
import dotenv from "dotenv";
import jwt from "jsonwebtoken"; // Biblioteca para JWT
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI('AIzaSyBOWsZpuvev-m2bYpjMRs0g_P8VnWVqq5Q');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function prompt(dados) {
  return `
Crie um JSON no seguinte formato, preenchendo os campos com informações acadêmicas relevantes e bem desenvolvidas. O campo "tema" já está preenchido com a informação fornecida, e os demais campos devem ser completados com informações detalhadas e consistentes para compor um trabalho acadêmico.

IMPORTANTE:
- O campo **"desenvolvimento"** deve conter o texto mais extenso, com várias ideias e detalhes relacionados ao tema, incluindo análises, exemplos práticos, argumentos teóricos e explicações aprofundadas subtemas relevantes dentro do tema os subtemas obrigatorios a conter sao ${dados.subtemas}.
- Responda SOMENTE com o JSON, sem explicações ou textos adicionais.
- Certifique-se de que o JSON esteja bem formatado.

Estrutura do JSON:
{
  "tema": "${dados.tema}",
  "objetivo_geral": "",
  "objetivo_especifico_1": "",
  "objetivo_especifico_2": "",
  "objetivo_especifico_3": "",
  "introdução": "",
  "desenvolvimento": "",
  "conclusao": "",
  "referencias": ""
}

Campos:
- "tema": já preenchido com "${dados.tema}".
- "objetivo_geral": descreva o objetivo geral do trabalho relacionado ao tema.
- "objetivo_especifico_1", "objetivo_especifico_2", "objetivo_especifico_3": apresente objetivos específicos que complementem o objetivo geral.
- "introdução": forneça uma introdução detalhada sobre o tema.
- **"desenvolvimento"**: ESTE É O CAMPO MAIS IMPORTANTE. Forneça um texto longo e detalhado, com explicações, exemplos, dados, e argumentações completas para desenvolver o tema de forma robusta.
- "conclusao": escreva uma conclusão baseada no desenvolvimento.
- "referencias": inclua referências acadêmicas ou fictícias no formato ABNT.

Exemplo de retorno esperado (preencha TODOS os campos com informações relevantes e o "desenvolvimento" de forma longa):
{
  "tema": "${dados.tema}",
  "objetivo_geral": "Exemplo...",
  "objetivo_especifico_1": "Exemplo...",
  "objetivo_especifico_2": "Exemplo...",
  "objetivo_especifico_3": "Exemplo...",
  "introducao": "Exemplo...",
  "desenvolvimento": "Exemplo longo e detalhado sobre o tema...",
  "conclusao": "Exemplo...",
  "referencias": "Exemplo..."
}

Responda somente com o JSON conforme especificado, sem nenhuma explicação ou comentários adicionais.`;
}






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
app.post("/gerar-documento", async (req, res) => {
    try {
        const dados = req.body; // Dados enviados no corpo da requisição
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const prompts = prompt(dados);
        const result = await model.generateContent(prompts);
        const response = result.response;
        const conteudo = response.text();
        const conteudoJson = JSON.parse(conteudo);

        // Caminho para o modelo
        const caminhoModelo = path.join(__dirname, "modelo.docx");

        // Leia o arquivo modelo
        const modeloBuffer = fs.readFileSync(caminhoModelo);

        // Carregue o modelo usando PizZip
        const zip = new PizZip(modeloBuffer);

        // Inicialize o Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Adicione os dados ao modelo
        doc.setData(conteudoJson);

        // Tente compilar e renderizar o documento
        doc.render();

        // Gere o documento preenchido
        const documentoBuffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
        });

        // Envie o arquivo gerado como resposta
        res.set({
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename=documento-gerado.docx`,
        });
        
        res.send(documentoBuffer);

    } catch (error) {
        console.error("Erro ao gerar conteúdo:", error);
        // Only send an error response if headers haven't been sent already
        if (!res.headersSent) {
            res.status(500).send({ error: "Erro ao gerar conteúdo" });
        }
    }
});

app.get("/perfil", authenticateToken, (req, res) => {
    const { id, email, perfil } = req.user;
    res.json({ id, email, perfil });
});


app.listen(port, () => {
    console.log("Server rodando na porta: " + port);
});
