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

const URL1 = 'https://www.unipamplona.edu.co';


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

    // Buscar el encabezado con texto "Dirección"
    const heading = $('h3').filter((i, el) => $(el).text().includes('Dirección')).first();

    if (heading.length) {
      const tabla = heading.next('table');
      const primeraFila = tabla.find('tr').first();

      const columnaTexto = primeraFila.find('td').first();
      const columnaImagen = primeraFila.find('td').eq(1);

      const textos = columnaTexto.text().split('\n').map(t => t.trim()).filter(Boolean);

      // Extraer los valores
      director = textos[1] || '';
      correo = textos[2] || '';
      horario = textos[4] || '';

      // Extraer imagen
      const imgSrc = columnaImagen.find('img').attr('src');
      if (imgSrc) {
        imagen = imgSrc.startsWith('http') ? imgSrc : `${URL}${imgSrc}`;
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
