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
    const { data } = await axios.get(URL2); // Asegúrate de que URL2 esté definido
    const $ = cheerio.load(data);
    const profesores = [];

    const h1 = $('h1').filter((i, el) =>
      $(el).text().toLowerCase().includes('docentes tiempo completo')
    ).first();

    if (!h1.length) {
      console.warn('⚠️ No se encontró el <h1> con "Docentes Tiempo Completo"');
      return res.status(404).json({ error: 'Encabezado no encontrado' });
    }

    console.log('✅ h1 encontrado:', h1.text());

    const tabla = $('h1:contains("Docentes Tiempo Completo")').nextAll('div').find('table').first();

    if (!tabla.length) {
      console.warn('⚠️ No se encontró la tabla después del <h1>');
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const filas = tabla.find('tr');
    console.log(`🔍 Número de filas: ${filas.length}`);

    filas.each((i, fila) => {
      const tds = $(fila).find('td');
      console.log(`➡️ Fila ${i}: contiene ${tds.length} celdas`);
      if (tds.length < 2) return;

      const tdTexto = $(tds[0]);
      const tdImagen = $(tds[1]);

      console.log(`📝 Contenido texto (raw):`, tdTexto.html());
      console.log(`🖼️ Imagen:`, tdImagen.find('img').attr('src'));

      const nombre = tdTexto.find('strong').first().text().trim();
      const texto = tdTexto.text().replace(/\s+/g, ' ').trim();

      const resolucion = texto.match(/Resolución\s*([^<\n]+)/i)?.[1]?.trim() || '';
      const cargo = texto.match(/Profesor[a]? [^<\n]+/)?.[0]?.trim() || '';
      const correo = texto.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || '';
      const campus = texto.match(/Campus:\s*([\w\s]+)/i)?.[1]?.trim() || '';
      const cvlac = tdTexto.find('a[href*="cvlac"]').attr('href') || '';

      const imgSrc = tdImagen.find('img').attr('src') || '';
      const imagen = imgSrc.startsWith('http')
        ? imgSrc
        : `${URL2.split('/unipamplona')[0]}${imgSrc}`;

      if (nombre) {
        profesores.push({ nombre, resolucion, cargo, correo, campus, cvlac, imagen });
      }
    });

    res.json(profesores);
  } catch (error) {
    console.error('❌ Error al obtener profesores:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información de los profesores.' });
  }
});




app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
