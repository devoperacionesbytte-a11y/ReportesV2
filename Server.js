import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch"; // en Node 24 puedes usar fetch nativo

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// ❌ no usamos app.use(express.json()) global para no romper multipart
app.use(express.static(path.join(__dirname, "public")));

// Configuración de multer para recibir solo PDFs
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  }
});

// Consultar ticket por ID
app.get("/api/tickets/:id", async (req, res) => {
  const ticketId = req.params.id;
  try {
    const response = await fetch(`${process.env.API_URL}/tickets/${ticketId}`, {
      headers: { Authorization: process.env.AUTH_HEADER }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error Freshdesk ${response.status}: ${text}`);
      return res.status(response.status).json({ error: text });
    }

    let ticket = await response.json();

    // Normalizar etiquetas
    ticket.tags = Array.isArray(ticket.tags)
      ? ticket.tags.map(t => String(t).trim().toLowerCase())
      : [];

    // Buscar contacto asociado
    let requesterName = "N/A";
    let requesterEmail = "N/A";

    if (ticket.requester_id) {
      const contactRes = await fetch(`${process.env.API_URL}/contacts/${ticket.requester_id}`, {
        headers: { Authorization: process.env.AUTH_HEADER }
      });
      if (contactRes.ok) {
        const contact = await contactRes.json();
        requesterName = contact.name || "N/A";
        requesterEmail = contact.email || "N/A";
      }
    }

    ticket.requester_name = requesterName;
    ticket.requester_email = requesterEmail;

    res.json(ticket);
  } catch (err) {
    console.error("Error consultando Freshdesk:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🚀 Nueva ruta: Conversaciones
app.get("/api/tickets/:id/conversations", async (req, res) => {
  const ticketId = req.params.id;
  try {
    const response = await fetch(`${process.env.API_URL}/tickets/${ticketId}/conversations`, {
      headers: { Authorization: process.env.AUTH_HEADER }
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`Error Freshdesk ${response.status}: ${text}`);
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error consultando conversaciones:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🔎 Nueva ruta: obtener contacto por ID
app.get("/api/contacts/:id", async (req, res) => {
  const contactId = req.params.id;
  try {
    const response = await fetch(`${process.env.API_URL}/contacts/${contactId}`, {
      headers: { Authorization: process.env.AUTH_HEADER }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }
    const contact = await response.json();
    res.json(contact);
  } catch (err) {
    console.error("Error consultando contacto:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🔎 Nueva ruta: obtener agente por ID
app.get("/api/agents/:id", async (req, res) => {
  const agentId = req.params.id;
  try {
    const response = await fetch(`${process.env.API_URL}/agents/${agentId}`, {
      headers: { Authorization: process.env.AUTH_HEADER }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }
    const agent = await response.json();
    res.json(agent);
  } catch (err) {
    console.error("Error consultando agente:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Recibe opcionalmente varios archivos en el campo "attachments[]"
app.post("/api/tickets/:id/notes", upload.any(), async (req, res) => {
  const ticketId = req.params.id;
  const notaTexto = req.body.body;
  const archivos = req.files;

  if (!notaTexto) {
    return res.status(400).json({ error: "El campo body está vacío" });
  }

  try {
    const formData = new FormData();
    formData.append("body", notaTexto);
    formData.append("private", "true");

    if (req.body.user_id) {
      formData.append("user_id", req.body.user_id);
    }

    if (archivos && archivos.length > 0) {
      archivos.forEach(file => {
        const filePath = path.resolve(file.path);
        if (fs.existsSync(filePath)) {
          formData.append("attachments[]", fs.createReadStream(filePath), {
            filename: file.originalname,
            contentType: file.mimetype
          });
        } else {
          console.error("Archivo no encontrado:", filePath);
        }
      });
    }

    const response = await fetch(`${process.env.API_URL}/tickets/${ticketId}/notes`, {
      method: "POST",
      headers: {
        Authorization: process.env.AUTH_HEADER,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error Freshdesk ${response.status}: ${text}`);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Error subiendo nota:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Encuestas de satisfacción en Freshdesk
app.post("/api/tickets/:id/satisfaction", express.json(), async (req, res) => {
  const ticketId = req.params.id;
  const { feedback, ratings } = req.body;

  if (!ticketId || !ratings) {
    return res.status(400).json({ error: "Faltan datos de la encuesta" });
  }

  try {
    const response = await fetch(`${process.env.API_URL}/tickets/${ticketId}/satisfaction_ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.AUTH_HEADER
      },
      body: JSON.stringify({ feedback, ratings })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error Freshdesk ${response.status}: ${text}`);
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    res.json({
      ok: true,
      message: "Encuesta enviada a Freshdesk correctamente",
      encuesta: data
    });
  } catch (err) {
    console.error("Error enviando encuesta a Freshdesk:", err);
    res.status(500).json({ error: err.message });
  }
});

// Consultar encuesta en Freshdesk
app.get("/api/tickets/:id/satisfaction", async (req, res) => {
  const ticketId = req.params.id;
  try {
    const response = await fetch(`${process.env.API_URL}/tickets/${ticketId}/satisfaction_rating`, {
      headers: { Authorization: process.env.AUTH_HEADER }
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/login", express.json(), (req, res) => {
  const { USUARIO_VALIDO, CONTRASENA_VALIDA } = req.body;
  if (
    USUARIO_VALIDO === process.env.USUARIO_VALIDO &&
    CONTRASENA_VALIDA === process.env.CONTRASENA_VALIDA
  ) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

// Servir HTML principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "formulario_reporte(API).html"));
});

// 🚀 El listen SIEMPRE va al final
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
}); 