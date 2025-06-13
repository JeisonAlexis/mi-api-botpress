const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Cambia esta URL por la real de tu universidad
const URL = 'https://www.unipamplona.edu.co';

const URL1 = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp';

const URL2 = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_pamplona.jsp';


app.get('/programas-acreditados', async (req, res) => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const programas = [];

    // Extraer todos los <li> dentro de la clase listaprogramas
    $('.listaprogramas li').each((i, el) => {
      const texto = $(el).text().trim();
      programas.push(texto);
    });

    res.json({ programas });
  } catch (error) {
    console.error('Error al obtener los programas:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la lista de programas.' });
  }
});

app.get('/horario-atencion', async (req, res) => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const horarioTexto = $('#horario p').text().trim();

    // Extraer solo el texto después de "Horario de atención:"
    const match = horarioTexto.match(/Horario de atenci[oó]n:\s*(.*?)(\||$)/i);
    const horario = match ? match[1].trim() : 'No se encontró el horario.';

    res.json({ horario });
  } catch (error) {
    console.error('Error al obtener el horario:', error.message);
    res.status(500).json({ error: 'No se pudo obtener el horario de atención.' });
  }
});

app.get('/director-programa', async (req, res) => {
  try {
    const { data } = await axios.get(URL1);
    const $ = cheerio.load(data);

    let director = '';
    let correo = '';
    let horario = '';
    let imagen = '';

    // Buscar el encabezado que contiene la palabra "dirección"
    const direccion = $('h3').filter((i, el) =>
      $(el).text().toLowerCase().includes('dirección')
    ).first();

    if (direccion.length) {
      const tabla = direccion.nextAll('table').first();       // Buscar la tabla cercana
      const fila = tabla.find('tr').first();                  // Primera fila

      const tdTexto = fila.find('td').first();                // Celda de texto
      const tdImagen = fila.find('td').eq(1);                 // Celda con imagen

      const rawHTML = tdTexto.html();                         // Obtener HTML puro

      // Extraer director y correo usando expresiones regulares
      const regexDirector = /<strong>Director de Programa<\/strong><br\s*\/?>(.*?)<br\s*\/?>/i;
      const regexCorreo = /<br\s*\/?>([\w.-]+@[\w.-]+\.\w+)/i;

      const matchDirector = rawHTML.match(regexDirector);
      const matchCorreo = rawHTML.match(regexCorreo);

      director = matchDirector ? matchDirector[1].trim() : '';
      correo = matchCorreo ? matchCorreo[1].trim() : '';

      // Extraer el párrafo que contiene el horario de atención
      const pHorario = tdTexto.find('p').filter((i, el) =>
        $(el).text().toLowerCase().includes('horario de atención')
      ).first();

      if (pHorario && pHorario.length) {
        const raw = pHorario.html();                          // Obtener HTML del párrafo

        // Limpiar y formatear el horario
        const afterStrong = raw.split('</strong>')[1] || '';
        horario = afterStrong
          .replace(/<br\s*\/?>/gi, '\n')                      // Reemplazar <br> por saltos de línea
          .replace(/<[^>]*>/g, '')                            // Eliminar cualquier otra etiqueta HTML
          .trim();
      }

      // Obtener imagen
      const img = tdImagen.find('img').attr('src');
      if (img) {
        const base = URL1.split('/unipamplona')[0];
        imagen = img.startsWith('http') ? img : `${base}${img}`;
      }
    }

    // Enviar respuesta
    res.json({ director, correo, horario, imagen });

  } catch (error) {
    console.error('❌ Error al obtener los datos del director:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información del director.' });
  }
});


app.get('/profesores-sistemas', async (req, res) => {
  try {
    const { data } = await axios.get(URL2); // Cambia esto por la URL real
    const $ = cheerio.load(data);

    const profesores = [];

    const encabezado = $('h1').filter((i, el) =>
      $(el).text().toLowerCase().includes('docentes tiempo completo')
    ).first();

    if (!encabezado.length) {
      return res.status(404).json({ error: 'No se encontró el encabezado de docentes.' });
    }

    const tabla = encabezado.nextAll('table').first();
    const celdas = tabla.find('td');

    celdas.each((i, el) => {
      const td = $(el);
      const html = td.html();
      const texto = td.text();

      const nombreMatch = texto.match(/(M\.Sc\.|Dra\.|Dr\.|Mg\.|Ph\.D\.|Ing\.)?\s*([^\n<]+)/);
      const resolucionMatch = texto.match(/Resolución\s*([\w\s.-]+)/i);
      const cargoMatch = texto.match(/Profesor[^\n<]+/i);
      const correoMatch = texto.match(/([\w.-]+@[\w.-]+\.\w+)/);
      const campusMatch = texto.match(/Campus:\s*(\w+)/i);
      const urlCvLAC = td.find('a[href*="cvlac"]').attr('href');

      profesores.push({
        nombre: nombreMatch ? nombreMatch[0].trim() : '',
        resolucion: resolucionMatch ? resolucionMatch[1].trim() : '',
        cargo: cargoMatch ? cargoMatch[0].trim() : '',
        correo: correoMatch ? correoMatch[1].trim() : '',
        campus: campusMatch ? campusMatch[1].trim() : '',
        cvlac: urlCvLAC ? urlCvLAC.trim() : ''
      });
    });

    res.json(profesores);
  } catch (error) {
    console.error('❌ Error al obtener los profesores:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información de los profesores.' });
  }
});





app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
