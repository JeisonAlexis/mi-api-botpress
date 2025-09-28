const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");
const { URL } = require("url");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("¡Hola desde mi servicio de Render!");
});


const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");


app.get("/recuperar-cuenta-sofia", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const preguntas = $(".preg");
    let pregunta = "";
    let respuesta = "";

    preguntas.each((i, el) => {
      const titulo = $(el).find(".titulopregunta").text().trim();
      const cuerpo = $(el).find(".respuesta").text().trim();

      if (titulo.toLowerCase().includes("contraseña")) {
        pregunta = titulo;
        respuesta = cuerpo;
        return false;
      }
    });

    if (!pregunta || !respuesta) {
      throw new Error("No se encontró la pregunta sobre la contraseña.");
    }

    res.json({ pregunta, respuesta });
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la pregunta sobre la contraseña en SOFIA Plus",
    });
  }
});

app.get("/quien-puede-inscribirse", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    let pregunta = "";
    let respuesta = "";

    $(".preg").each((i, el) => {
      const titulo = $(el).find(".titulopregunta").text().trim();
      const cuerpo = $(el).find(".respuesta").text().trim();

      if (titulo.toLowerCase().includes("quién puede inscribirse")) {
        pregunta = titulo;
        respuesta = cuerpo;
        return false;
      }
    });

    if (!pregunta || !respuesta) {
      throw new Error("No se encontró la pregunta sobre inscripciones.");
    }

    res.json({ pregunta, respuesta });
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información sobre quién puede inscribirse.",
    });
  }
});

app.get("/tipo-formacion-sena", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const preguntas = $(".preg");
    let pregunta = "";
    let respuesta = "";

    preguntas.each((i, el) => {
      const titulo = $(el).find(".titulopregunta").text().trim();
      const cuerpo = $(el).find(".respuesta").html().trim();

      if (titulo.includes("¿Qué tipo de formación ofrece el SENA?")) {
        pregunta = titulo;

        const textoPlano = cheerio
          .load(`<div>${cuerpo}</div>`)("div")
          .text()
          .replace(/\s+\n/g, "\n")
          .trim();
        respuesta = textoPlano;
        return false;
      }
    });

    if (!pregunta || !respuesta) {
      throw new Error("No se encontró la pregunta sobre el tipo de formación.");
    }

    res.json({ pregunta, respuesta });
  } catch (error) {
    console.error("❌ Error scraping:", error.message);
    res.status(500).json({
      error: "No se pudo obtener la información sobre el tipo de formación.",
    });
  }
});

app.get("/costo-inscripcion", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const pregunta = $(
      ".titulopregunta:contains('¿Qué costo tiene la inscripción y la formación en el SENA?')"
    );
    const respuesta = pregunta.next(".respuesta");

    const resultado = {
      pregunta: pregunta.text().trim(),
      respuesta: respuesta.text().trim(),
    };

    res.json(resultado);
  } catch (error) {
    console.error("Error al obtener la pregunta del SENA:", error.message);
    res.status(500).json({ error: "Error al obtener la información" });
  }
});

app.get("/horarios-sena", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const pregunta = $("div.titulopregunta")
      .filter((i, el) =>
        $(el)
          .text()
          .includes("¿En qué horarios se ofrecen los programas de formación?")
      )
      .first();

    const respuesta = pregunta.next(".respuesta").html();

    if (!respuesta) {
      return res.status(404).json({ error: "Contenido no encontrado" });
    }

    res.json({
      pregunta: pregunta.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/convocatoria", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const faqs = [];
    $(".titulopregunta").each((i, elem) => {
      const pregunta = $(elem).text().trim();
      const respuesta = $(elem).next(".respuesta").text().trim();

      if (pregunta.includes("¿Cuándo son las próximas convocatorias?")) {
        faqs.push({ pregunta, respuesta });
      }
    });

    if (faqs.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada." });
    }

    res.json(faqs[0]);
  } catch (error) {
    console.error("Error al obtener la página:", error.message);
    res.status(500).json({ error: "Error al capturar los datos." });
  }
});

app.get("/programas-virtual-sena", async (req, res) => {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });

    const { data: html } = await axios.get(
      "https://zajuna.sena.edu.co/titulada.php",
      {
        httpsAgent: agent,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);
    const tecnologos = [];
    const tecnicos = [];

    $(".programas__card").each((i, elem) => {
      const titulo = $(elem).find(".programas__desplegable p").text().trim();

      const links = $(elem).find("a");
      let pdf = null;
      let video = null;

      links.each((i, link) => {
        const href = $(link).attr("href");
        if (!href) return;

        if (href.endsWith(".pdf")) {
          pdf = new URL(href.replace(/\\/g, "/"), "https://zajuna.sena.edu.co/")
            .href;
        }

        if (href.includes("youtube.com") || href.includes("youtu.be")) {
          video = href;
        }
      });

      const programa = { titulo, pdf, video };

      if (pdf && pdf.includes("/tecgnologias/")) {
        tecnologos.push(programa);
      } else if (pdf && pdf.includes("/tecnico/")) {
        tecnicos.push(programa);
      }
    });

    res.json({ tecnologos, tecnicos });
  } catch (error) {
    console.error("Error al obtener los programas:", error.message);
    res.status(500).json({
      error: "Error al obtener los programas",
      message: error.message,
    });
  }
});

app.get("/ofertas-ciudad", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    let resultado = null;

    $(".titulopregunta").each((_, element) => {
      const pregunta = $(element).text().trim();

      if (
        pregunta.includes(
          "¿Cómo consultar el número de ofertas disponibles en su ciudad?"
        )
      ) {
        const respuesta = $(element).next(".respuesta").text().trim();

        resultado = {
          pregunta,
          respuesta,
        };
      }
    });

    if (resultado) {
      res.json(resultado);
    } else {
      res.status(404).json({ error: "Pregunta no encontrada" });
    }
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Error al consultar la página del SENA",
        detalles: error.message,
      });
  }
});

app.get("/horario-modalidad-combinada", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);
    const titulo = $(
      'div.titulopregunta:contains("¿En qué consiste el horario en modalidad combinada?")'
    );
    const respuesta = titulo.next(".respuesta").html();

    if (respuesta) {
      res.json({
        pregunta: titulo.text().trim(),
        respuesta: respuesta.trim(),
      });
    } else {
      res.status(404).json({ error: "Pregunta no encontrada en la página." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los datos del SENA." });
  }
});

app.get("/modalidades-formacion", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Qué son las modalidades de formación SENA?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/directorio", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://metalmecanicosena.blogspot.com/p/directorio-cmm.html",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(data);

    const directorio = [];

    $(".directorio-dependencia .directorio-roles li").each((_, el) => {
      const nombre = $(el).find("p").text().trim();
      const cargo = $(el).find("h3").text().trim();
      const correo = $(el).find("a").attr("href")?.replace("mailto:", "");
      const imagen = $(el).find("img").attr("src");

      directorio.push({
        nombre,
        cargo,
        correo,
        imagen,
      });
    });

    res.json(directorio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el directorio" });
  }
});

app.get("/regionales", async (req, res) => {
  try {
    const urlOrigen =
      "https://www.sena.edu.co/es-co/regionales/Paginas/default.aspx";

    const { data } = await axios.get(urlOrigen, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    const frase = $(".fraseSite").first().text().trim();

    let imagen = $('img[alt="Regionales sena"]').attr("src");
    if (imagen && imagen.startsWith("/")) {
      imagen = `https://www.sena.edu.co${imagen}`;
    }

    res.json({
      frase,
      imagen,
      fuente: urlOrigen,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error al obtener información de regionales" });
  }
});

app.get("/directorio_contruccion_madera", async (req, res) => {
  try {
    const url = "https://construccionymadera.blogspot.com/p/directorio_24.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let directivos = [];

    $(".leader").each((i, el) => {
      const nombre = $(el).find(".leader-details-name").text().trim();
      const cargo = $(el).find(".leader-details p").first().text().trim();
      const correo =
        $(el).find(".correo a").attr("href")?.replace("mailto:", "") || "";
      const imagen = $(el).find("img").attr("src") || "";

      directivos.push({
        nombre,
        cargo,
        correo,
        imagen,
      });
    });

    res.json(directivos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los directivos" });
  }
});

app.get("/prueba_seleccion", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Qué debo tener en cuenta para presentar la prueba de selección?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/prueba", async (req, res) => {
  try {
    const path = require("path");
    const filePath = path.join(__dirname, "xhr_responses.json"); 
    const raw = await fs.promises.readFile(filePath, "utf8").catch(() => null);


    if (!raw) {
      return res
        .status(500)
        .json({
          error: "Archivo xhr_responses.json no encontrado en el proyecto.",
        });
    }

    let responses;
    try {
      responses = JSON.parse(raw);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "xhr_responses.json no contiene JSON válido." });
    }

    const families = [];


    function findFamilies(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (const item of node) findFamilies(item);
        return;
      }

      if (node.fam_id && Array.isArray(node.programas)) {
        families.push(node);
        return;
      }

      if (Array.isArray(node.programas)) {

        families.push({
          fam_id: node.fam_id || null,
          fam_descripcion: node.fam_descripcion || null,
          fam_url_ruta: node.fam_url_ruta || null,
          programas: node.programas,
        });
        return;
      }

      for (const k of Object.keys(node)) {
        try {
          findFamilies(node[k]);
        } catch (e) {

        }
      }
    }


    for (const resp of responses) {

      let body = resp.body ?? resp.bodyParsed ?? resp.data ?? null;


      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {

          body = null;
        }
      }


      if (!body && typeof resp === "object") {

        findFamilies(resp);
      }

      if (body) {
        findFamilies(body);
      }
    }


    if (families.length === 0) {

      function findProgramArrays(node) {
        if (!node || typeof node !== "object") return null;
        if (Array.isArray(node)) {
          if (
            node.length > 0 &&
            node.some(
              (it) =>
                it &&
                typeof it === "object" &&
                ("prog_codigo" in it || "prog_nombre" in it)
            )
          ) {

            return node;
          }

          for (const item of node) {
            const r = findProgramArrays(item);
            if (r) return r;
          }
          return null;
        } else {
          for (const k of Object.keys(node)) {
            const r = findProgramArrays(node[k]);
            if (r) return r;
          }
        }
        return null;
      }

      for (const resp of responses) {
        let body = resp.body ?? resp.bodyParsed ?? resp.data ?? resp;
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch (e) {
            body = null;
          }
        }
        const arr = findProgramArrays(body);
        if (arr) {

          families.push({
            fam_id: null,
            fam_descripcion: null,
            fam_url_ruta: null,
            programas: arr,
          });
        }
      }
    }


    const programas = [];
    for (const fam of families) {
      const famMeta = {
        fam_id: fam.fam_id ?? null,
        fam_descripcion: fam.fam_descripcion ?? null,
        fam_url_ruta: fam.fam_url_ruta ?? null,
      };
      if (Array.isArray(fam.programas)) {
        for (const p of fam.programas) {

          programas.push({
            fam_id: famMeta.fam_id,
            fam_descripcion: famMeta.fam_descripcion,
            fam_url_ruta: famMeta.fam_url_ruta,
            prog_codigo: p.prog_codigo ?? p.codigo ?? null,
            prog_codigo_ficha: p.prog_codigo_ficha ?? p.codigo_ficha ?? null,
            prog_nombre: p.prog_nombre ?? p.nombre ?? null,
            prog_etiqueta: p.prog_etiqueta ?? null,
            prog_url_inscripcion:
              p.prog_url_inscripcion ?? p.url_inscripcion ?? null,
            prog_url_descripcion:
              p.prog_url_descripcion ?? p.url_descripcion ?? null,
            prog_estado: p.prog_estado ?? null,
            prog_duracion: p.prog_duracion ?? null,
            prog_requisitos: p.prog_requisitos ?? null,
            prog_contenido: p.prog_contenido ?? null,
            raw: p, 
          });
        }
      }
    }


    if (programas.length === 0) {
      return res
        .status(404)
        .json({ error: "No se encontraron programas en xhr_responses.json" });
    }


    const { fam_id, prog_codigo, q, limit } = req.query;
    let result = programas;

    if (fam_id) {
      result = result.filter((r) => String(r.fam_id) === String(fam_id));
    }
    if (prog_codigo) {
      result = result.filter(
        (r) => String(r.prog_codigo) === String(prog_codigo)
      );
    }
    if (q) {
      const ql = String(q).toLowerCase();
      result = result.filter(
        (r) =>
          (r.prog_nombre && r.prog_nombre.toLowerCase().includes(ql)) ||
          (r.prog_contenido &&
            String(r.prog_contenido).toLowerCase().includes(ql)) ||
          (r.fam_descripcion &&
            String(r.fam_descripcion).toLowerCase().includes(ql))
      );
    }

    const max = Math.min(1000, parseInt(limit || "0") || result.length);
    if (max && result.length > max) result = result.slice(0, max);

    return res.json({ total: result.length, items: result });
  } catch (error) {
    console.error("Error el endpoint:", error);
    return res
      .status(500)
      .json({ error: "Error interno al procesar xhr_responses.json" });
  }
});


app.get("/duracion_prueba_seleccion", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Cuánto dura la prueba de selección?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/prueba_que_evalua", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Qué evalúa la prueba web de selección?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/como_presentar_prueba", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Cómo se debe presentar las pruebas de selección?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/prueba_fase1", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Cómo sé si aprobé las pruebas de selección Fase I?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/prueba_fase2", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿De qué se compone la prueba Fase II del proceso y que busca?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/despues_prueba", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("Después de presentar la prueba…")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/translado_modalidad", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Me puedo trasladar de modalidad en un programa de formación SENA?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/inscripcion_multiple", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Me puedo inscribir a más de dos programas?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/profundizaciones_especializaciones", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Por qué no volvieron a ofertar profundizaciones técnicas o especializaciones tecnológicas?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/cupos", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Cuántos cupos quedan disponibles?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/inconsistencia_datos", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("Una vez registrado en SOFIA Plus me doy cuenta que algunos de mis datos presentan inconsistencias ¿Qué debo hacer?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/no_inscribirse", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿En qué casos no es posible inscribirme?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/cancelar_matricula", async (req, res) => {
  try {
    const { data: html } = await axios.get(
      "https://portal.senasofiaplus.edu.co/index.php/ayudas/preguntas-frecuentes",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
        },
      }
    );

    const $ = cheerio.load(html);

    const titulo = $(
      'div.titulopregunta:contains("¿Por qué motivos podría ser cancelada mi matrícula?")'
    );

    if (titulo.length === 0) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const respuesta = titulo.next(".respuesta").html();

    return res.json({
      pregunta: titulo.text().trim(),
      respuesta: respuesta.trim(),
    });
  } catch (error) {
    console.error("Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.get("/directorio_agropecuario_agroindustrial", async (req, res) => {
  try {
    const url = "https://cedeagro.blogspot.com/p/directorio.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let directivos = [];

    $("h3").each((i, el) => {
      const cargo = $(el).text().trim();
      const divs = $(el).nextAll("div").slice(0, 3);
      const rawText = divs.text().replace(/\s+/g, " ").trim();

      if (!rawText.includes("mail:")) return;

      const nombre = rawText.split("mail:")[0].trim();

      const correoMatch = rawText.match(/mail:\s*([^\s]+)/i);
      const correo = correoMatch ? correoMatch[1].replace(/&nbsp;/g, "") : "";

      const telefonoMatch = rawText.match(/PBX:\s*([^)]+Ext:\s*\d*)/i);
      const telefono = telefonoMatch ? telefonoMatch[0].trim() : "";

      directivos.push({
        cargo,
        nombre,
        correo,
        telefono,
      });
    });

    let imagenes = [];
    $("div.separator img").each((i, el) => {
      const src = $(el).attr("src");
      if (src) {
        imagenes.push(src);
      }
    });

    res.json({
      directivos,
      imagenes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/directorio_minero", async (req, res) => {
  try {
    const url = "https://centronacionalminero.blogspot.com/p/equipo-cm.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let imagenes = [];

    $("div.separator img").each((i, el) => {
      const src = $(el).attr("src");
      if (src) {
        imagenes.push(src);
      }
    });

    res.json(imagenes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});


app.get("/directorio_agroecologico_agroindustrial", async (req, res) => {
  try {
    const url = "https://cedagro.blogspot.com/p/directorio-cedagro.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let directivos = [];

    $("tr").each((i, el) => {
      const tds = $(el).find("td");
      if (tds.length < 3) return;

      const cargo = $(tds[0]).text().trim();
      const nombre = $(tds[1]).text().trim();
      const correo = $(tds[2]).text().replace(/\s+/g, "").trim();

      if (!cargo.toLowerCase().includes("cargo") && !nombre.toLowerCase().includes("nombre")) {
        directivos.push({ cargo, nombre, correo });
      }
    });

    res.json({ directivos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});




app.get("/como_registrarse", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co"; 
    const { data } = await axios.get(`${url}/index.php/ayudas`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let pasos = [];
    const bloque = $("p.tituloboletin:contains('Registrarse en Sofiaplus')");

    bloque.nextAll("div.imagens").each((i, el) => {
      if (i < 7) {
        let src = $(el).find("img").attr("src");
        if (src) {
          if (src.startsWith("/")) {
            src = url + src;
          }
          pasos.push(src);
        }
      }
    });

    res.json({ pasos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/buscar_programas_formacion", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co/index.php/ayudas"; 
    const baseUrl = "https://portal.senasofiaplus.edu.co"; 

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let pasos = [];
    $("div.imagens img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("1_buscarprograma")) {
        const fullUrl = src.startsWith("http") ? src : baseUrl + src;
        pasos.push(fullUrl);
      }
    });

    res.json({
      pasos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});


app.get("/inscripcion_programa_formacion", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co/index.php/ayudas";
    const baseUrl = "https://portal.senasofiaplus.edu.co"; 

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let pasos = [];
    $("div.imagens img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("3_inscripcion")) {
        const fullUrl = src.startsWith("http") ? src : baseUrl + src;
        pasos.push(fullUrl);
      }
    });

    res.json({
      pasos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});

app.get("/guia_actualizar_datos", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co/index.php/ayudas";
    const baseUrl = "https://portal.senasofiaplus.edu.co"; 

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let pasos = [];
    $("div.imagens img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("10_actualizar_datos")) {
        const fullUrl = src.startsWith("http") ? src : baseUrl + src;
        pasos.push(fullUrl);
      }
    });

    res.json({
      pasos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});


app.get("/cambio_contrasena", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co/index.php/ayudas";
    const baseUrl = "https://portal.senasofiaplus.edu.co"; 

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let pasos = [];
    $("div.imagens img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("cambio_de_contrasena")) {
        const fullUrl = src.startsWith("http") ? src : baseUrl + src;
        pasos.push(fullUrl);
      }
    });

    res.json({
      pasos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
