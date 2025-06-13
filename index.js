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

    const direccion = $('h3').filter((i, el) =>
      $(el).text().toLowerCase().includes('dirección')
    ).first();

    if (direccion.length) {
      const tabla = direccion.nextAll('table').first();
      const fila = tabla.find('tr').first();

      const tdTexto = fila.find('td').first();
      const tdImagen = fila.find('td').eq(1);

      const rawHTML = tdTexto.html(); // HTML sin parsear para mayor control

      const regexDirector = /<strong>Director de Programa<\/strong><br\s*\/?>(.*?)<br\s*\/?>/i;
      const regexCorreo = /<br\s*\/?>([\w.-]+@[\w.-]+\.\w+)/i;
      const regexHorario = /Horario de atenci&oacute;n:<\/strong>(.*?)<\/p>/is;

      const matchDirector = rawHTML.match(regexDirector);
      const matchCorreo = rawHTML.match(regexCorreo);

      director = matchDirector ? matchDirector[1].trim() : '';
      correo = matchCorreo ? matchCorreo[1].trim() : '';

      // Intento de extraer el párrafo que contiene el horario
const pHorario = tdTexto.find('p').filter((i, el) =>
  $(el).html()?.toLowerCase().includes('Horario de atención')
).first();

console.log('🔍 tdTexto HTML:\n', tdTexto.html());

if (pHorario && pHorario.length) {
  const raw = pHorario.html();
  console.log('💬 HTML del horario:', raw); // <-- Agrega esto para ver si se está obteniendo correctamente

  const afterStrong = raw.split('</strong>')[1] || '';
  horario = afterStrong
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '') // quitar otras etiquetas HTML
    .trim();
} else {
  console.warn('⚠️ No se encontró el párrafo con el horario');
}




      const img = tdImagen.find('img').attr('src');
      if (img) {
        imagen = img.startsWith('http') ? img : `${URL.split('/unipamplona')[0]}${img}`;
      }
    }

    res.json({ director, correo, horario, imagen });
  } catch (error) {
    console.error('Error al obtener los datos del director:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información del director.' });
  }
});






app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
