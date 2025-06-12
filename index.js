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

app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
