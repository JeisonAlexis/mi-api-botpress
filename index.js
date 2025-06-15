const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
//const port = 3000;

app.use(cors());
app.use(express.json());

// Define una ruta básica (opcional, pero útil para probar)
app.get('/', (req, res) => {
  res.send('¡Hola desde mi servicio de Render!');
});




const URL = 'https://www.unipamplona.edu.co';

const URL1 = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/22072013/01_elprograma.jsp';

const URL2 = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_pamplona.jsp';


app.get('/programas-acreditados', async (req, res) => {
  try {
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const programas = [];

    
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

      const rawHTML = tdTexto.html();                         

     
      const regexDirector = /<strong>Director de Programa<\/strong><br\s*\/?>(.*?)<br\s*\/?>/i;
      const regexCorreo = /<br\s*\/?>([\w.-]+@[\w.-]+\.\w+)/i;

      const matchDirector = rawHTML.match(regexDirector);
      const matchCorreo = rawHTML.match(regexCorreo);

      director = matchDirector ? matchDirector[1].trim() : '';
      correo = matchCorreo ? matchCorreo[1].trim() : '';

      
      const pHorario = tdTexto.find('p').filter((i, el) =>
        $(el).text().toLowerCase().includes('horario de atención')
      ).first();

      if (pHorario && pHorario.length) {
        const raw = pHorario.html();                          

        // Limpiar y formatear el horario
        const afterStrong = raw.split('</strong>')[1] || '';
        horario = afterStrong
          .replace(/<br\s*\/?>/gi, '\n')                      
          .replace(/<[^>]*>/g, '')                            
          .trim();
      }

      
      const img = tdImagen.find('img').attr('src');
      if (img) {
        const base = URL1.split('/unipamplona')[0];
        imagen = img.startsWith('http') ? img : `${base}${img}`;
      }
    }

    
    res.json({ director, correo, horario, imagen });

  } catch (error) {
    console.error('❌ Error al obtener los datos del director:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información del director.' });
  }
});



const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 

app.use('/imagenes', express.static('public/profesores'));

app.get('/profesores-sistemas', async (req, res) => {
  try {
    const { data } = await axios.get(URL2);
    const $ = cheerio.load(data);
    const profesores = [];

    const encabezados = [
      { texto: 'Docentes Tiempo Completo', puesto: 'Tiempo Completo' },
      { texto: 'Docentes Tiempo Completo Ocasional y Cátedra', puesto: 'Ocasional o Cátedra' }
    ];

    for (const encabezado of encabezados) {
      const h1 = $('h1').filter((i, el) =>
        $(el).text().toLowerCase().includes(encabezado.texto.toLowerCase())
      ).first();

      if (!h1.length) {
        console.warn(`⚠️ No se encontró el <h1> con "${encabezado.texto}"`);
        continue;
      }

      let tabla = h1.nextAll('div').find('table').first();
      if (!tabla.length) {
        tabla = h1.nextAll().filter((i, el) => $(el).is('table')).first();
      }

      if (!tabla.length) {
        console.warn(`⚠️ No se encontró la tabla después del <h1> "${encabezado.texto}"`);
        continue;
      }

      const filas = tabla.find('tr');
      filas.each((fIndex, fila) => {
        const tds = $(fila).find('td');
        if (tds.length !== 2 && tds.length !== 4) return;

        for (let i = 0; i < tds.length; i += 2) {
          const tdTexto = $(tds[i]);
          const tdImagen = $(tds[i + 1]);

          const nombre = tdTexto.find('strong').first().text().trim();
          const textoCompleto = tdTexto.text().replace(/\s+/g, ' ').trim();

          const resolucion = textoCompleto.match(/Resolución\s*([^<\n]+)/i)?.[1]?.trim() || '';
          const cargoExtraido = textoCompleto.match(/Profesor[a]? [^<\n]+/i)?.[0]?.trim();
          const cargo = cargoExtraido || encabezado.puesto;
          const correo = textoCompleto.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || '';
          const campus = textoCompleto.match(/Campus:\s*([\w\s]+)/i)?.[1]?.trim() || '';
          const cvlac = tdTexto.find('a[href*="cvlac"]').attr('href') || '';

          const imgTag = tdImagen.find('img');
          let imagen = '';
          const imgSrc = imgTag.length ? imgTag.attr('src') : '';

          if (imgSrc.startsWith('data:image')) {
            // Si es base64, convertir y guardar
            const matches = imgSrc.match(/^data:(image\/\w+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1].split('/')[1]; // "png" o "jpeg"
              const base64Data = matches[2];
              const fileName = `${uuidv4()}.${ext}`;
              const filePath = path.join(__dirname, 'public/profesores', fileName);

              const dir = path.join(__dirname, 'public/profesores');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

              fs.writeFileSync(filePath, base64Data, 'base64');
              imagen = `${req.protocol}://${req.get('host')}/imagenes/${fileName}`;
            }
          } else if (imgSrc) {
            imagen = imgSrc.startsWith('http')
              ? imgSrc
              : `${URL2.split('/unipamplona')[0]}${imgSrc}`;
          }

          if (nombre) {
            profesores.push({ nombre, resolucion, cargo, correo, campus, cvlac, imagen });
          }
        }
      });
    }

    res.json(profesores);
  } catch (error) {
    console.error('❌ Error al obtener los profesores:', error);
    res.status(500).json({ error: 'Error al obtener los profesores' });
  }
});







const URL_OFERTA = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/21042014/ofertaacademica_2016.jsp';


app.get('/programas-por-facultad', async (req, res) => {
  try {
    const { data } = await axios.get(URL_OFERTA, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);
    const resultado = [];

    $('table.table-inscripciones tr.table-row-inscripciones').each((_, row) => {
      const columnas = $(row).find('td');
      if (columnas.length < 2) return;

      const facultad = $(columnas[0]).text().trim().replace(/\s+/g, ' ');
      const programas = [];

      $(columnas[1]).find('li.list-item-oferta').each((_, li) => {
        const nombrePrograma = $(li).find('a.link-oferta').text().trim();
        if (nombrePrograma) programas.push(nombrePrograma);
      });

      resultado.push({ facultad, programas });
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener la oferta:', error.message);
    res.status(500).json({
      error: 'No se pudo obtener la información. Verifica que la página esté disponible y no haya cambiado el HTML.'
    });
  }
});

const URL_SEDES = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/pagina_2018/11042018/campus.jsp'; 

app.get('/sedes-campus', async (req, res) => {
  try {
    const { data } = await axios.get(URL_SEDES);
    const $ = cheerio.load(data);

    const sedes = [];

    $('h2').each((i, el) => {
      const titulo = $(el).text().trim().toLowerCase();

      if (titulo.includes('sedes y campus')) {
        const lista = $(el).next('.bordeContenidos').find('li');

        lista.each((_, li) => {
          const html = $(li).html();

          const nombre = $(li).find('strong').text().trim();
          const textoPlano = $(li).text().replace(/\s+/g, ' ').trim();

          const direccion = textoPlano.split('Teléfono')[0].replace(nombre, '').trim();
          const telefonos = textoPlano.match(/Tel[eé]fono:\s*([^\n<]+)/i)?.[1].trim() || '';
          const correo = textoPlano.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || '';

          sedes.push({
            nombre,
            direccion,
            telefonos,
            correo: correo || null
          });
        });
      }
    });

    res.json(sedes);

  } catch (error) {
    console.error('❌ Error al obtener las sedes:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información de sedes y campus.' });
  }
});

const OLLAMA_URL = 'https://8f65-190-60-32-37.ngrok-free.app';

app.post('/mistral', async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) return res.status(400).json({ error: 'Prompt no proporcionado' });

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral',
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();
    return res.json({ respuesta: data.response || 'Sin respuesta' });
  } catch (err) {
    console.error('❌ Error conectando a Ollama:', err.message);
    return res.status(500).json({ error: 'Error conectando a Ollama' });
  }
});





const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});