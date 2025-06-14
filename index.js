const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


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



app.get('/profesores-sistemas', async (req, res) => {
  try {
    const { data } = await axios.get(URL2);
    const $ = cheerio.load(data);
    const profesores = [];

    // Buscar el encabezado correcto
    const h1 = $('h1').filter((i, el) =>
      $(el).text().toLowerCase().includes('docentes tiempo completo')
    ).first();

    if (!h1.length) {
      console.warn('⚠️ No se encontró el <h1> con "Docentes Tiempo Completo"');
      return res.status(404).json({ error: 'Encabezado no encontrado' });
    }

    // Buscar la tabla asociada al encabezado
    const tabla = $('h1:contains("Docentes Tiempo Completo")').nextAll('div').find('table').first();


    if (!tabla.length) {
      console.warn('⚠️ No se encontró la tabla después del <h1>');
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    // Iterar sobre las filas de la tabla
    const filas = tabla.find('tr');
    filas.each((fIndex, fila) => {
      const tds = $(fila).find('td');
      
      // Solo procesar filas con 4 celdas (2 profesores por fila)
      if (tds.length !== 4) return;

      // Procesar cada par de celdas (texto e imagen)
      for (let i = 0; i < tds.length; i += 2) {
        const tdTexto = $(tds[i]);
        const tdImagen = $(tds[i + 1]);

        // Extraer datos del profesor
        const nombre = tdTexto.find('strong').first().text().trim();
        const textoCompleto = tdTexto.text().replace(/\s+/g, ' ').trim();

        // Extraer resolución, cargo, correo y campus
        const resolucion = textoCompleto.match(/Resolución\s*([^<\n]+)/i)?.[1]?.trim() || '';
        const cargo = textoCompleto.match(/Profesor[a]? [^<\n]+/i)?.[0]?.trim() || '';
        const correo = textoCompleto.match(/[\w.-]+@[\w.-]+\.\w+/i)?.[0] || '';
        const campus = textoCompleto.match(/Campus:\s*([\w\s]+)/i)?.[1]?.trim() || '';
        const cvlac = tdTexto.find('a[href*="cvlac"]').attr('href') || '';

        // Extraer imagen
        const imgSrc = tdImagen.find('img').attr('src') || '';
        const imagen = imgSrc.startsWith('http')
          ? imgSrc
          : imgSrc.startsWith('data:')
            ? ''
            : `${URL2.split('/unipamplona')[0]}${imgSrc}`;

        // Agregar profesor al arreglo
        if (nombre) {
          profesores.push({ nombre, resolucion, cargo, correo, campus, cvlac, imagen });
        }
      }
    });

    res.json(profesores);
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información.' });
  }
});



const URL_OFERTA = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_11/recursos/general/contenidos_subgeneral/inscripciones_presencial/21042014/ofertaacademica_2016.jsp';

app.get('/programas-por-facultad', async (req, res) => {
  try {
    const { data } = await axios.get(URL_OFERTA);
    const $ = cheerio.load(data);
    const resultado = [];

    // Saltamos el primer <tr> que son los encabezados
    $('tr.table-row-inscripciones').slice(1).each((i, row) => {
      const facultadTd = $(row).find('td').first();
      const programasTd = $(row).find('td').eq(1);

      // Extraer nombre e imagen
      const facultadTexto = facultadTd.text().trim().replace(/\s+/g, ' ');
      const facultadNombre = facultadTexto.replace(/^Facultad\s+de\s+/i, 'Facultad de ').trim();
      const facultadImagenSrc = facultadTd.find('img').attr('src');
      const facultadImagen = facultadImagenSrc ? new URL(facultadImagenSrc, URL_OFERTA).href : null;

      const programas = [];

      programasTd.find('li.list-item-oferta').each((_, li) => {
        const link = $(li).find('a.link-oferta');
        const nombre = link.text().trim();
        const url = link.attr('href') ? new URL(link.attr('href'), URL_OFERTA).href : null;
        const info = $(li).find('.info-oferta').text().trim().replace(/\s+/g, ' ');

        programas.push({ nombre, url, info: info || null });
      });

      resultado.push({
        nombre: facultadNombre,
        imagen: facultadImagen,
        programas
      });
    });

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener los programas por facultad:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información de los programas.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});






app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
