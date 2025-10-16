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

app.get("/consultar_resultados_pruebas", async (req, res) => {
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
      if (src && src.includes("9_consultar_resultados_pruebas")) {
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

app.get("/inscripcion_programa_titulado", async (req, res) => {
  try {
    const url =
      "https://portal.senasofiaplus.edu.co/index.php?option=com_content&view=article&layout=edit&id=683";
    const baseUrl = "https://portal.senasofiaplus.edu.co";

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)" },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    const imagenes = [];
    const seen = new Set();
    const regex01 = /\/images\/instructivo\/01\/img-[\d-]+\.jpg$/i;

    $('img').each((i, el) => {
      if (imagenes.length >= 18) return false; 
      let src =
        $(el).attr('src') ||
        $(el).attr('data-src') ||
        $(el).attr('data-lazy') ||
        (($(el).attr('srcset') || '').split(',')[0] || '').split(' ')[0];

      if (!src) return;

      if (src.startsWith('//')) src = 'https:' + src;
      if (src.startsWith('/')) src = baseUrl + src;
      if (!/^https?:\/\//i.test(src)) src = baseUrl + '/' + src;

      const clean = src.split('?')[0];

      if (!regex01.test(clean)) return;

      if (!seen.has(clean)) {
        seen.add(clean);
        imagenes.push(clean);
      }
    });

    if (imagenes.length < 18) {
      $('div.imagens img').each((i, el) => {
        if (imagenes.length >= 18) return false;
        let src = $(el).attr('src') || $(el).attr('data-src') || '';
        if (!src) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (src.startsWith('/')) src = baseUrl + src;
        const clean = src.split('?')[0];
        if (!regex01.test(clean)) return;
        if (!seen.has(clean)) {
          seen.add(clean);
          imagenes.push(clean);
        }
      });
    }

    res.json({
      imagenes,
      fuente: url,
    });
  } catch (error) {
    console.error("scrape error:", error?.message || error);
    res.status(500).json({ error: "Error al obtener las imágenes del instructivoo" });
  }
});

app.get("/roles_sena", async (req, res) => {
  try {
    const url = "https://portal.senasofiaplus.edu.co/index.php/ayudas/rol";
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)" },
    });

    const $ = cheerio.load(data);
    let roles = [];

    for (let i = 1; i <= 17; i++) {
      const selector = `#contenido${i} p a`;
      $(selector).each((_, el) => {
        const rol = $(el).text().trim();
        const href = $(el).attr("href");

        if (href && href.startsWith("https://")) {
          roles.push({
            rol,
            url: href,
          });
        }
      });
    }

    const unicos = [];
    const urls = new Set();
    for (const r of roles) {
      if (!urls.has(r.url)) {
        urls.add(r.url);
        unicos.push(r);
      }
    }

    res.json({
      fuente: url,
      cantidad: unicos.length,
      roles: unicos,
    });
  } catch (error) {
    console.error("Error al obtener roles del SENA:", error);
    res.status(500).json({ error: "Error al obtener los datoss" });
  }
});

app.get("/directorio_ambiental_ecoturistico", async (req, res) => {
  try {
    const url = "https://senaguainia1.blogspot.com/p/directorio.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    let imagenes = [];
    $("div.separator img").each((i, el) => {
      const src = $(el).attr("src");
      if (src) imagenes.push(src);
    });

    res.json({
      titulo: $("h3.post-title").text().trim(),
      imagenes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los datoss" });
  }
});


app.get("/directorio_agroforestal_acuicola", async (req, res) => {
  try {
    const url = "https://arapaimaregput.blogspot.com/p/directorio.html";
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


    res.json({
      centro: "Centro Agroforestal y Acuícola Arapaima",
      total_imagenes: imagenes.length,
      imagenes,
    });
  } catch (error) {
    console.error("❌ Error al obtener los datos:", error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/directorio_cafec", async (req, res) => {
  try {
    const url = "https://senacasanare.blogspot.com/p/directorio.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);
    const directivos = [];

    $("div.MsoNormal b").each((i, el) => {
      const cargo = $(el).text().trim();
      const nombre = $(el).parent().next().text().trim();
      const correo = $(el).parent().next().next().text().trim();

      if (correo.includes("@sena.edu.co")) {
        directivos.push({
          cargo,
          nombre,
          correo,
        });
      }
    });

    res.json(directivos);
  } catch (error) {
    console.error("Error al obtener el directorio:", error);
    res.status(500).json({ error: "Error al obtener los datoss" });
  }
});


app.get("/directorio_gestion_desarrollo", async (req, res) => {
  try {
    const url =
      "https://araucasena.blogspot.com/p/sede-arauca-direccioncarrera-20-28-163.html";

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)" },
    });

    const $ = cheerio.load(data);
    const textoLimpio = $("body").text().replace(/\s+/g, " ").trim();

    const patronCargo = /(SUBDIRECTOR|COORDINADOR(?:A)? [A-ZÁÉÍÓÚÑ\s,\.]+|L[IÍ]DER [A-ZÁÉÍÓÚÑ\s,\.]+|BIENESTAR AL APRENDIZ|CONTRATO DE APRENDIZAJE|SISTEMA DE GESTIÓN DE CALIDAD)/gi;

    const coincidencias = [...textoLimpio.matchAll(patronCargo)];

    const directivos = [];

    for (let i = 0; i < coincidencias.length; i++) {
      const inicio = coincidencias[i].index;
      const fin =
        i + 1 < coincidencias.length
          ? coincidencias[i + 1].index
          : textoLimpio.length;

      const bloque = textoLimpio.slice(inicio, fin).trim();

      const cargo = coincidencias[i][0]
        .replace(/\s+/g, " ")
        .replace(/\.$/, "")
        .trim();

      const nombreMatch = bloque.match(
        /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){1,4})/
      );
      const correoMatch = bloque.match(/[A-Za-z0-9._%+-]+@[\w.-]+\.\w+/);
      const celularMatch = bloque.match(/\b3\d{2}\s*\d{3}\s*\d{4}\b/);

      const nombre = nombreMatch ? nombreMatch[0].trim() : null;
      const correo = correoMatch ? correoMatch[0].trim() : null;
      const celular = celularMatch
        ? celularMatch[0].replace(/\s+/g, "")
        : null;

      if (cargo && nombre && correo && celular) {
        directivos.push({
          cargo,
          nombre,
          correo,
          celular,
        });
      }
    }

    res.json(directivos);
  } catch (error) {
    console.error("❌ Error al obtener los datos:", error.message);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});


app.get("/directorio_asistencia_tecnica", async (req, res) => {
  try {
    const url = "https://centroastinsena.blogspot.com/p/directorio.html";

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);

    const imagenes = [];
    $("div.separator img").each((i, el) => {
      const src = $(el).attr("src");
      if (src) imagenes.push(src);
    });

    const soloDos = imagenes.slice(0, 2);

    res.json({ imagenes: soloDos });
  } catch (error) {
    console.error("Error al obtener imágenes:", error.message);
    res.status(500).json({ error: "Error al obtener las imágenes" });
  }
});

app.get("/directorio_sector_agropecuario", async (req, res) => {
  try {
    const url = "https://caisarisaralda.blogspot.com/p/directorio.html";
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)" },
    });

    const $ = cheerio.load(data);
    let directivos = [];

    $("p[style*='padding-left']").each((i, p) => {
      const cargo = $(p).find("b").first().text().trim();
      const nombre = $(p).find("b[style*='#238276']").text().trim() ||
                     $(p).find("span[style*='#238276'] b").text().trim();


      let nextP = $(p).next("p");
      let altNombre = nextP.find("b[style*='#238276']").text().trim() ||
                      nextP.find("span[style*='#238276'] b").text().trim();

      const container = nombre ? p : nextP;

      const text = $(container).text();

      const telefonoMatch = text.match(/Teléfono:\s*([^\n<]+)/i);
      const direccionMatch = text.match(/Dirección:\s*([^\n<]+)/i);
      const horarioMatch = text.match(/Horario de atención:\s*([^\n<]+)/i);

      if (cargo && (nombre || altNombre)) {
        directivos.push({
          cargo,
          nombre: nombre || altNombre,
          telefono: telefonoMatch ? telefonoMatch[1].trim() : "",
          direccion: direccionMatch ? direccionMatch[1].trim() : "",
          horario: horarioMatch ? horarioMatch[1].trim() : "",
        });
      }
    });

    res.json(directivos);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/director_regional_risaralda", async (req, res) => {
  try {
    const url = "https://comerciorisaralda.blogspot.com/p/direccion-regional.html";
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)",
      },
    });

    const $ = cheerio.load(data);
    let directivos = [];

    $("h3.post-title.entry-title").each((i, el) => {
      const cargo = $(el).text().trim();

      const nombre = $(el)
        .nextAll("div.post-body")
        .find("p")
        .first()
        .text()
        .trim();

      const imagen = $(el)
        .nextAll("div.post-body")
        .find("div.separator img")
        .attr("src") || "";

      let descripcion = "";
      $(el)
        .nextAll("div.post-body")
        .find("p")
        .each((j, p) => {
          const text = $(p).text().trim();
          if (text && text.length > 50) {
            descripcion = text; 
          }
        });

      if (nombre && cargo) {
        directivos.push({
          cargo,
          nombre,
          imagen,
          descripcion,
        });
      }
    });

    res.json({ directivos });
  } catch (error) {
    console.error("❌ Error al obtener los datos:", error);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.get("/directorio_diseno_innovacion_tecnologica", async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://senarisaraldadosquebradas.blogspot.com/p/directorio.html",
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Botpress/1.0)" } }
    );

    const $ = cheerio.load(data);
    const directorio = [];

    const palabrasCargo = [
      "Subdirector",
      "Subdirectora",
      "Coordinador",
      "Coordinadora",
      "Líder",
      "Apoyo",
      "Profesional",
      "Responsable",
      "Gestor",
      "Dinamizador",
      "Dinamizadora",
      "Unidad",
      "Asistente",
    ];

    $("div.post-body").find("div, p, span").each((i, el) => {
  const texto = $(el).text().replace(/\s+/g, " ").trim();
  const correos = texto.match(/[a-zA-Z0-9._%+-]+@sena\.edu\.co/g);
  if (!correos) return;

  correos.forEach((correo) => {
    const partes = texto.split(correo);
    const textoAntesCorreo = partes[0];
    const textoDespuesCorreo = partes[1] ? partes[1].split(/[a-zA-Z0-9._%+-]+@sena\.edu\.co/)[0] : "";

    const regex = new RegExp(
      `([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ]?[a-záéíóúñ]+){1,4})\\s+([^@]+?)\\s*${correo}`
    );
    const match = textoAntesCorreo.match(regex) || texto.match(regex);
    if (!match) return;

    let nombre = match[1].trim();
    let cargo = match[2].trim();

    if (cargo.includes(nombre.split(" ")[0])) {
      cargo = cargo.substring(cargo.indexOf(nombre.split(" ")[0]) + nombre.length).trim();
    }

    cargo = cargo.replace(/\b(Académico|Académica)\b.*\b(Académico|Académica)\b/, "$1");

    for (const palabra of palabrasCargo) {
      const idx = cargo.indexOf(palabra);
      if (idx > 0) {
        const posibleApellido = cargo.substring(0, idx).trim();
        const posibleCargo = cargo.substring(idx).trim();
        if (posibleApellido.split(" ").length <= 2) {
          nombre = `${nombre} ${posibleApellido}`;
          cargo = posibleCargo;
        }
        break;
      }
    }

    let imagen = null;
    const divImagen = $(el).prevAll("div.separator").first();
    if (divImagen.length) imagen = divImagen.find("img").attr("src");
    if (!imagen) imagen = $(el).prevAll("img").first().attr("src");
    if (imagen && !imagen.startsWith("http")) {
      imagen = `https://blogger.googleusercontent.com/${imagen}`;
    }

    if (!directorio.some((d) => d.correo === correo)) {
      directorio.push({
        nombre,
        cargo,
        correo,
        imagen: imagen || null,
      });
    }
  });
});


    if (directorio.length === 0)
      throw new Error("No se encontraron directivos válidos.");

    res.json(directorio);
  } catch (error) {
    console.error("❌ Error al obtener el directorio:", error.message);
    res.status(500).json({ error: "Error al obtener el directorio" });
  }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
