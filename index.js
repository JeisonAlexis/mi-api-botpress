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

const URL1 =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp";

const URL2 =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_pamplona.jsp";

app.get("/programas-acreditados", async (req, res) => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const programas = [];

    $(".listaprogramas li").each((i, el) => {
      const texto = $(el).text().trim();
      programas.push(texto);
    });

    res.json({ programas });
  } catch (error) {
    console.error("Error al obtener los programas:", error.message);
    res
      .status(500)
      .json({ error: "No se pudo obtener la lista de programas." });
  }
});

app.get("/horario-atencion", async (req, res) => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const horarioTexto = $("#horario p").text().trim();

    const match = horarioTexto.match(/Horario de atenci[oó]n:\s*(.*?)(\||$)/i);
    const horario = match ? match[1].trim() : "No se encontró el horario.";

    res.json({ horario });
  } catch (error) {
    console.error("Error al obtener el horario:", error.message);
    res
      .status(500)
      .json({ error: "No se pudo obtener el horario de atención." });
  }
});

app.get("/director-programa", async (req, res) => {
  try {
    const { data } = await axios.get(URL1);
    const $ = cheerio.load(data);

    let director = "";
    let correo = "";
    let horario = ""; //si
    let imagen = "";

    const direccion = $("h3")
      .filter((i, el) => $(el).text().toLowerCase().includes("dirección"))
      .first();

    if (direccion.length) {
      const tabla = direccion.nextAll("table").first();
      const fila = tabla.find("tr").first();

      const tdTexto = fila.find("td").first();
      const tdImagen = fila.find("td").eq(1);

      const rawHTML = tdTexto.html();

      const regexDirector =
        /<strong>Director de Programa<\/strong><br\s*\/?>(.*?)<br\s*\/?>/i;
      const regexCorreo = /<br\s*\/?>([\w.-]+@[\w.-]+\.\w+)/i;

      const matchDirector = rawHTML.match(regexDirector);
      const matchCorreo = rawHTML.match(regexCorreo);

      director = matchDirector ? matchDirector[1].trim() : "";
      correo = matchCorreo ? matchCorreo[1].trim() : "";

      const pHorario = tdTexto
        .find("p")
        .filter((i, el) =>
          $(el).text().toLowerCase().includes("horario de atención")
        )
        .first();

      if (pHorario && pHorario.length) {
        const raw = pHorario.html();

        // Limpiar y formatear el horario
        const afterStrong = raw.split("</strong>")[1] || "";
        horario = afterStrong
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .trim();
      }

      const img = tdImagen.find("img").attr("src");
      if (img) {
        const base = URL1.split("/unipamplona")[0];
        imagen = img.startsWith("http") ? img : `${base}${img}`;
      }
    }

    res.json({ director, correo, horario, imagen });
  } catch (error) {
    console.error("❌ Error al obtener los datos del director:", error.message);
    res
      .status(500)
      .json({ error: "No se pudo obtener la información del director." });
  }
});

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

app.use("/imagenes", express.static("public/profesores"));

app.get("/profesores-sistemas", async (req, res) => {
  try {
    const { data } = await axios.get(URL2);
    const $ = cheerio.load(data);
    const profesores = [];

    const encabezados = [
      { texto: "Docentes Tiempo Completo", puesto: "Tiempo Completo" },
      {
        texto: "Docentes Tiempo Completo Ocasional y Cátedra",
        puesto: "Ocasional o Cátedra",
      },
    ];

    for (const encabezado of encabezados) {
      const h1 = $("h1")
        .filter((i, el) =>
          $(el).text().toLowerCase().includes(encabezado.texto.toLowerCase())
        )
        .first();

      if (!h1.length) {
        console.warn(`⚠️ No se encontró el <h1> con "${encabezado.texto}"`);
        continue;
      }

      let tabla = h1.nextAll("div").find("table").first();
      if (!tabla.length) {
        tabla = h1
          .nextAll()
          .filter((i, el) => $(el).is("table"))
          .first();
      }

      if (!tabla.length) {
        console.warn(
          `⚠️ No se encontró la tabla después del <h1> "${encabezado.texto}"`
        );
        continue;
      }

      const filas = tabla.find("tr");
      filas.each((fIndex, fila) => {
        const tds = $(fila).find("td");
        if (tds.length !== 2 && tds.length !== 4) return;

        for (let i = 0; i < tds.length; i += 2) {
          const tdTexto = $(tds[i]);
          const tdImagen = $(tds[i + 1]);

          const nombre = tdTexto.find("strong").first().text().trim();
          const textoCompleto = tdTexto.text().replace(/\s+/g, " ").trim();

          const resolucion =
            textoCompleto.match(/Resolución\s*([^<\n]+)/i)?.[1]?.trim() || "";
          const cargoExtraido = textoCompleto
            .match(/Profesor[a]? [^<\n]+/i)?.[0]
            ?.trim();
          const cargo = cargoExtraido || encabezado.puesto;
          const correo =
            textoCompleto.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || "";
          const campus =
            textoCompleto.match(/Campus:\s*([\w\s]+)/i)?.[1]?.trim() || "";
          const cvlac = tdTexto.find('a[href*="cvlac"]').attr("href") || "";

          const imgTag = tdImagen.find("img");
          let imagen = "";
          const imgSrc = imgTag.length ? imgTag.attr("src") : "";

          if (imgSrc.startsWith("data:image")) {
            // Si es base64, convertir y guardar
            const matches = imgSrc.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1].split("/")[1]; // "png" o "jpeg"
              const base64Data = matches[2];
              const fileName = `${uuidv4()}.${ext}`;
              const filePath = path.join(
                __dirname,
                "public/profesores",
                fileName
              );

              const dir = path.join(__dirname, "public/profesores");
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }

              fs.writeFileSync(filePath, base64Data, "base64");
              imagen = `${req.protocol}://${req.get(
                "host"
              )}/imagenes/${fileName}`;
            }
          } else if (imgSrc) {
            imagen = imgSrc.startsWith("http")
              ? imgSrc
              : `${URL2.split("/unipamplona")[0]}${imgSrc}`;
          }

          if (nombre) {
            profesores.push({
              nombre,
              resolucion,
              cargo,
              correo,
              campus,
              cvlac,
              imagen,
            });
          }
        }
      });
    }

    res.json(profesores);
  } catch (error) {
    console.error("❌ Error al obtener los profesores:", error);
    res.status(500).json({ error: "Error al obtener los profesores" });
  }
});

const URL3 =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_villa.jsp";

app.get("/profesores", async (req, res) => {
  try {
    const { data } = await axios.get(URL3);
    const $ = cheerio.load(data);
    const profesores = [];

    const encabezados = [
      { texto: "Docentes Tiempo Completo", puesto: "Tiempo Completo" },
      { texto: "Docentes Tiempo Completo Ocasional", puesto: "Ocasional" },
      { texto: "Profesores Hora Cátedra", puesto: "Cátedra" },
    ];

    for (const encabezado of encabezados) {
      const h1 = $("h1")
        .filter((i, el) =>
          $(el).text().toLowerCase().includes(encabezado.texto.toLowerCase())
        )
        .first();

      if (!h1.length) {
        console.warn(`⚠️ No se encontró el <h1> con "${encabezado.texto}"`);
        continue;
      }

      let tabla = h1.nextAll("div").find("table").first();
      if (!tabla.length) {
        tabla = h1
          .nextAll()
          .filter((i, el) => $(el).is("table"))
          .first();
      }

      if (!tabla.length) {
        console.warn(
          `⚠️ No se encontró la tabla después del <h1> "${encabezado.texto}"`
        );
        continue;
      }

      const filas = tabla.find("tr");
      filas.each((fIndex, fila) => {
        const tds = $(fila).find("td");
        if (tds.length !== 2 && tds.length !== 4) return;

        for (let i = 0; i < tds.length; i += 2) {
          const tdTexto = $(tds[i]);
          const tdImagen = $(tds[i + 1]);

          const nombre = tdTexto.find("strong").first().text().trim();
          const textoCompleto = tdTexto.text().replace(/\s+/g, " ").trim();

          const resolucion =
            textoCompleto.match(/Resolución\s*([^<\n]+)/i)?.[1]?.trim() || "";
          const cargoExtraido = textoCompleto
            .match(/Profesor[a]? [^<\n]+/i)?.[0]
            ?.trim();
          const cargo = cargoExtraido || encabezado.puesto;
          const correo =
            textoCompleto.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || "";
          const campusMatch = textoCompleto.match(/Campus:\s*([^\n]+)/i);
          let campus = campusMatch?.[1]?.trim() || "";
          campus = campus.replace(/Hoja de vida.*$/i, "").trim();

          const cvlac = tdTexto.find('a[href*="cvlac"]').attr("href") || "";

          const imgTag = tdImagen.find("img");
          let imagen = "";
          const imgSrc = imgTag.length ? imgTag.attr("src") : "";

          if (imgSrc.startsWith("data:image")) {
            // Si es base64, convertir y guardar
            const matches = imgSrc.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1].split("/")[1]; // "png" o "jpeg"
              const base64Data = matches[2];
              const fileName = `${uuidv4()}.${ext}`;
              const filePath = path.join(
                __dirname,
                "public/profesores",
                fileName
              );

              const dir = path.join(__dirname, "public/profesores");
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }

              fs.writeFileSync(filePath, base64Data, "base64");
              imagen = `${req.protocol}://${req.get(
                "host"
              )}/imagenes/${fileName}`;
            }
          } else if (imgSrc) {
            imagen = imgSrc.startsWith("http")
              ? imgSrc
              : `${URL2.split("/unipamplona")[0]}${imgSrc}`;
          }

          if (nombre) {
            profesores.push({
              nombre,
              resolucion,
              cargo,
              correo,
              campus,
              cvlac,
              imagen,
            });
          }
        }
      });
    }

    res.json(profesores);
  } catch (error) {
    console.error("❌ Error al obtener los profesores:", error);
    res.status(500).json({ error: "Error al obtener los profesores" });
  }
});

const URL_OFERTA =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/21042014/ofertaacademica_2016.jsp";

app.get("/programas-por-facultad", async (req, res) => {
  try {
    const { data } = await axios.get(URL_OFERTA, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    const resultado = [];

    $("table.table-inscripciones tr.table-row-inscripciones").each((_, row) => {
      const columnas = $(row).find("td");
      if (columnas.length < 2) return;

      const facultad = $(columnas[0]).text().trim().replace(/\s+/g, " ");
      const programas = [];

      $(columnas[1])
        .find("li.list-item-oferta")
        .each((_, li) => {
          const nombrePrograma = $(li).find("a.link-oferta").text().trim();
          if (nombrePrograma) programas.push(nombrePrograma);
        });

      resultado.push({ facultad, programas });
    });

    res.json(resultado);
  } catch (error) {
    console.error("❌ Error al obtener la oferta:", error.message);
    res.status(500).json({
      error:
        "No se pudo obtener la información. Verifica que la página esté disponible y no haya cambiado el HTML.",
    });
  }
});

const URL_SEDES =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/pagina_2018/11042018/campus.jsp";

app.get("/sedes-campus", async (req, res) => {
  try {
    const { data } = await axios.get(URL_SEDES);
    const $ = cheerio.load(data);

    const sedes = [];

    $("h2").each((i, el) => {
      const titulo = $(el).text().trim().toLowerCase();

      if (titulo.includes("sedes y campus")) {
        const lista = $(el).next(".bordeContenidos").find("li");

        lista.each((_, li) => {
          const html = $(li).html();

          const nombre = $(li).find("strong").text().trim();
          const textoPlano = $(li).text().replace(/\s+/g, " ").trim();

          const direccion = textoPlano
            .split("Teléfono")[0]
            .replace(nombre, "")
            .trim();
          const telefonos =
            textoPlano.match(/Tel[eé]fono:\s*([^\n<]+)/i)?.[1].trim() || "";
          const correo = textoPlano.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || "";

          sedes.push({
            nombre,
            direccion,
            telefonos,
            correo: correo || null,
          });
        });
      }
    });

    res.json(sedes);
  } catch (error) {
    console.error("❌ Error al obtener las sedes:", error.message);
    res
      .status(500)
      .json({ error: "No se pudo obtener la información de sedes y campus." });
  }
});

app.get("/info-up", async (req, res) => {
  try {
    const URL =
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp";
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const bloque = $("h2")
      .filter((i, el) =>
        $(el).text().toLowerCase().includes("preguntas frecuentes")
      )
      .first()
      .next(".bordeContenidos");

    if (!bloque.length) {
      return res
        .status(404)
        .json({ error: "No se encontró el bloque de preguntas frecuentes." });
    }

    const imgSrc = bloque.find("img").attr("src") || "";
    const imagen = imgSrc.startsWith("http")
      ? imgSrc
      : `https://www.unipamplona.edu.co${imgSrc}`;

    const titulo = bloque.find("strong").first().text().trim();

    // Este es el párrafo con la descripción real (tercer <p>)
    const descripcionHtml = bloque.find("p").eq(2).html() || "";
    const descripcionTexto = descripcionHtml
      .replace(/<[^>]+>/g, "") // Elimina etiquetas HTML
      .replace(/&nbsp;/g, " ")
      .replace(/&([a-z]+);/gi, (match, entity) => {
        // Decodifica entidades HTML comunes
        const entities = {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
          nbsp: " ",
          ntilde: "ñ",
          Ntilde: "Ñ",
          aacute: "á",
          Aacute: "Á",
          eacute: "é",
          Eacute: "É",
          iacute: "í",
          Iacute: "Í",
          oacute: "ó",
          Oacute: "Ó",
          uacute: "ú",
          Uacute: "Ú",
        };
        return entities[entity] || match;
      })
      .trim();

    res.json({
      titulo,
      descripcion: descripcionTexto,
      imagen,
      url_para_mas_informacion: URL,
    });
  } catch (error) {
    console.error(
      "❌ Error al obtener las preguntas frecuentes: ",
      error.message
    );
    res.status(500).json({
      error: "No se pudo obtener la información de preguntas frecuentes.",
    });
  }
});

app.get("/sedes-regionales", async (req, res) => {
  try {
    const URL =
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp";
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Bloque principal debajo del párrafo con la frase clave
    const bloque = $("p")
      .filter((i, el) =>
        $(el).text().includes("la Universidad cuenta con tres sedes regionales")
      )
      .first();

    if (!bloque.length) {
      return res
        .status(404)
        .json({ error: "No se encontró el bloque de sedes regionales." });
    }

    // Extraer sedes presenciales/pregrado
    const presList = bloque.next("ul").first();
    const presSedes = presList
      .find("li")
      .map((_, li) => $(li).text().trim())
      .get();

    // Extraer sedes CREAD a partir del siguiente párrafo
    const creadParagraph = presList
      .next("p")
      .filter((i, el) => $(el).text().includes("En presencial – distancia"))
      .first();
    const creadList = creadParagraph.next("ul").first();
    const creadSedes = creadList
      .find("li")
      .map((_, li) => $(li).text().trim())
      .get();

    res.json({
      presenciales: presSedes,
      cread: creadSedes,
      url_origen: URL,
    });
  } catch (error) {
    console.error("❌ Error al obtener sedes regionales:", error.message);
    res.status(500).json({
      error: "No se pudo extraer la información de sedes regionales.",
    });
  }
});

const URL_MAPA =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp";

app.get("/como-llegar", async (req, res) => {
  try {
    const { data } = await axios.get(URL_MAPA);
    const $ = cheerio.load(data);

    // Buscar el párrafo que contiene el texto y luego buscar la imagen siguiente
    const tituloParrafo = $("p")
      .filter((i, el) =>
        $(el).text().toLowerCase().includes("¿cómo llegar al campus")
      )
      .first();

    const img = tituloParrafo.next("p").find("img").attr("src");

    if (!img) {
      return res
        .status(404)
        .json({ error: "No se encontró la imagen del mapa." });
    }

    const imagenUrl = img.startsWith("http")
      ? img
      : `https://www.unipamplona.edu.co${img}`;

    res.json({
      titulo: "¿Cómo llegar al Campus de la Universidad?",
      imagen: imagenUrl,
      url_origen: URL_MAPA,
    });
  } catch (error) {
    console.error("❌ Error al obtener el mapa:", error.message);
    res.status(500).json({ error: "No se pudo obtener la imagen del mapa." });
  }
});

app.get("/fundador-up", async (req, res) => {
  try {
    const URL =
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp";
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Buscar por el texto del título
    const bloqueFundador = $("p")
      .filter((i, el) =>
        $(el)
          .text()
          .toLowerCase()
          .includes("¿quién es el fundador de la universidad")
      )
      .first();

    if (!bloqueFundador.length) {
      return res
        .status(404)
        .json({ error: "No se encontró la sección del fundador." });
    }

    const titulo = bloqueFundador.text().trim();

    // Buscar la imagen en el siguiente <p>
    const imgTag = bloqueFundador.nextAll("p").find("img").first();
    const src = imgTag.attr("src") || "";
    const imagen = src.startsWith("http")
      ? src
      : `https://www.unipamplona.edu.co${src}`;

    // Buscar el párrafo con el contenido
    const descripcionParrafo = bloqueFundador
      .nextAll("p")
      .filter((i, el) =>
        $(el)
          .text()
          .toLowerCase()
          .includes("la universidad de pamplona fue fundada")
      )
      .first();

    const descripcion = descripcionParrafo.text().replace(/\s+/g, " ").trim();

    res.json({
      titulo,
      descripcion,
      imagen,
      url_origen: URL,
    });
  } catch (error) {
    console.error(
      "❌ Error al obtener información del fundador:",
      error.message
    );
    res
      .status(500)
      .json({ error: "No se pudo obtener la información del fundador." });
  }
});

app.get("/rector", async (req, res) => {
  try {
    const urlInfo =
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp";
    const urlImagen =
      "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/noticias_2016/diciembre/29122016/rector_2017-2020.jsp";

    // Obtener la imagen del slider (posición 13)
    const { data: htmlSlider } = await axios.get(urlImagen);
    const $slider = cheerio.load(htmlSlider);
    const imgSrc = $slider("#coin-slider img").eq(12).attr("src");
    const imagen = imgSrc ? `https://www.unipamplona.edu.co${imgSrc}` : null;

    // Obtener el <p> que contiene el título y la descripción
    const { data: htmlInfo } = await axios.get(urlInfo);
    const $ = cheerio.load(htmlInfo);

    const parrafoCompleto = $("p")
      .filter((i, el) =>
        $(el).text().includes("¿Quién es el Rector de la Universidad?")
      )
      .first();

    const descripcion = parrafoCompleto
      .text()
      .replace("¿Quién es el Rector de la Universidad?", "")
      .replace(/\s+/g, " ")
      .trim();

    res.json({
      titulo: "Ivaldo Torres Chávez",
      descripcion,
      imagen,
      url_origen: urlInfo,
    });
  } catch (error) {
    console.error(
      "❌ Error al obtener la información del rector:",
      error.message
    );
    res
      .status(500)
      .json({ error: "No se pudo obtener la información del rector." });
  }
});

const URL_ESCUDO =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/corporativo/15022011/descargas_unipamplona.jsp";

app.get("/escudo", async (req, res) => {
  try {
    const { data } = await axios.get(URL_ESCUDO);
    const $ = cheerio.load(data);

    // Buscar el <h4> que contiene la palabra "Escudo"
    const h4 = $("h4")
      .filter((i, el) => $(el).text().toLowerCase().includes("escudo"))
      .first();

    if (!h4.length) {
      return res.status(404).json({ error: "No se encontró el título Escudo" });
    }

    // Buscar la imagen más cercana (puede estar en un <p>, <div> o después del <h4>)
    let imgTag = h4.nextAll("img").first();

    if (!imgTag.length) {
      imgTag = h4.parent().find("img").first();
    }

    if (!imgTag.length) {
      return res
        .status(404)
        .json({ error: "No se encontró la imagen del escudo" });
    }

    const imgSrc = imgTag.attr("src");
    const imagen = imgSrc.startsWith("http")
      ? imgSrc
      : `${URL_ESCUDO.split("/unipamplona")[0]}${imgSrc}`;

    res.json({ imagen });
  } catch (error) {
    console.error("❌ Error al obtener el escudo:", error);
    res.status(500).json({ error: "Error al obtener el escudo" });
  }
});

const URL_INCAPACIDADES =
  "https://www.unipamplona.edu.co/unipamplona/portalIG/home_21/recursos/01_general/17082010/incapacidades.jsp";

app.get("/tramite-incapacidades", async (req, res) => {
  try {
    const { data } = await axios.get(URL_INCAPACIDADES);
    const $ = cheerio.load(data);

    const h1 = $("#pagcontenido h1")
      .filter((i, el) =>
        $(el).text().toLowerCase().includes("trámite de incapacidades")
      )
      .first();

    if (!h1.length) {
      return res.status(404).json({
        error: "No se encontró la sección de Trámite de incapacidades.",
      });
    }

    const contenido = [];
    $("#texto p").each((i, el) => {
      const texto = $(el).text().trim();
      if (texto) contenido.push(texto);
    });

    const resultado = contenido.join("\n\n");

    res.json({ titulo: h1.text().trim(), contenido: resultado });
  } catch (error) {
    console.error("❌ Error al obtener el trámite de incapacidades:", error);
    res.status(500).json({
      error: "No se pudo obtener el contenido del trámite de incapacidades.",
    });
  }
});

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

        // Limpieza del HTML conservando formato básico
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
    res.status(500).json({ error: "Error al obtener los directivoss" });
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
    const filePath = path.join(__dirname, "xhr_responses.json"); // __dirname siempre apunta a la carpeta actual
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

    // Colección donde guardaremos objetos familiares detectados
    const families = [];

    // Función recursiva que busca objetos con keys característicos
    function findFamilies(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        for (const item of node) findFamilies(item);
        return;
      }
      // Si el nodo tiene 'fam_id' y 'programas' -> lo consideramos una familia
      if (node.fam_id && Array.isArray(node.programas)) {
        families.push(node);
        return;
      }
      // También puede existir un objeto que tenga 'programas' como clave principal
      if (Array.isArray(node.programas)) {
        // crear una familia "anonima" si no tiene fam_id
        families.push({
          fam_id: node.fam_id || null,
          fam_descripcion: node.fam_descripcion || null,
          fam_url_ruta: node.fam_url_ruta || null,
          programas: node.programas,
        });
        return;
      }
      // Recorremos claves para buscar más profundo
      for (const k of Object.keys(node)) {
        try {
          findFamilies(node[k]);
        } catch (e) {
          /* ignore */
        }
      }
    }

    // Recorremos cada entrada en xhr_responses.json; las respuestas pueden tener .body o .bodyParsed u otros
    for (const resp of responses) {
      // normalizar posible body
      let body = resp.body ?? resp.bodyParsed ?? resp.data ?? null;

      // Si body es string, intentar parsear JSON
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // no JSON -> ignorar
          body = null;
        }
      }

      // Si resp itself parece contener la estructura (por ejemplo si file contiene directamente el JSON deseado)
      if (!body && typeof resp === "object") {
        // algunos dumps guardan el objeto directamente
        findFamilies(resp);
      }

      if (body) {
        findFamilies(body);
      }
    }

    // Si no encontramos familias, probamos con una heurística: buscar arrays con objetos que tengan 'prog_codigo'
    if (families.length === 0) {
      // buscar arrays dentro de responses
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
            // lo consideramos un array de programas
            return node;
          }
          // si es array pero no es programas, buscar dentro de items
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
          // convertir array de programas en una "familia" anonima
          families.push({
            fam_id: null,
            fam_descripcion: null,
            fam_url_ruta: null,
            programas: arr,
          });
        }
      }
    }

    // Aplanar todas las familias a una lista de programas con metadatos de familia incluidos
    const programas = [];
    for (const fam of families) {
      const famMeta = {
        fam_id: fam.fam_id ?? null,
        fam_descripcion: fam.fam_descripcion ?? null,
        fam_url_ruta: fam.fam_url_ruta ?? null,
      };
      if (Array.isArray(fam.programas)) {
        for (const p of fam.programas) {
          // normalizar y tomar campos relevantes si existen
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
            raw: p, // mantengo el objeto original por si quieres más campos
          });
        }
      }
    }

    // Si no encontramos nada
    if (programas.length === 0) {
      return res
        .status(404)
        .json({ error: "No se encontraron programas en xhr_responses.json" });
    }

    // Aplicar filtros por query params (opcional)
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

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
