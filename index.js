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

    const h1 = $('h1').filter((i, el) =>
      $(el).text().toLowerCase().includes('docentes tiempo completo')
    ).first();

    if (!h1.length) {
      console.warn('⚠️ No se encontró el <h1> con "Docentes Tiempo Completo"');
      return res.status(404).json({ error: 'Encabezado no encontrado' });
    }

    console.log('✅ h1 encontrado:', h1.text());

    const tablas = h1.nextAll('table');

    tablas.each((tIndex, tabla) => {
      console.log(`➡️ Analizando tabla #${tIndex}`);
      const filas = $(tabla).find('tr');

      filas.each((fIndex, fila) => {
        const tds = $(fila).find('td');
        console.log(`  📄 Fila #${fIndex} con ${tds.length} <td>`);

        // Solo procesar filas con exactamente 4 columnas
        if (tds.length !== 4) return;

        // Procesar ambos profesores en la fila (posiciones 0,1 y 2,3)
        for (let i of [0, 2]) {
          const tdTexto = $(tds[i]);
          const tdImagen = $(tds[i + 1]);

          // Extraer nombre (dentro de <strong>)
          const nombre = tdTexto.find('strong').first().text().trim();
          
          // Si no hay nombre, saltar
          if (!nombre) continue;

          // Obtener todo el texto de la celda
          const textoCompleto = tdTexto.text().replace(/\s+/g, ' ').trim();

          // Extraer información usando regex mejoradas
          const resolucion = textoCompleto.match(/Resoluci[oó]n\s+[\d\s-]+[A-Za-z\s\d]*/i)?.[0]?.trim() || '';
          
          // Buscar diferentes patrones para el cargo
          const cargoMatch = textoCompleto.match(/Profesor[a]?\s+(Titular|Asociado|Asistente|Auxiliar)[^<\n]*/i) ||
                           textoCompleto.match(/Profesor[a]?\s+[^<\n-]+/i);
          const cargo = cargoMatch?.[0]?.trim() || '';

          // Extraer correo electrónico
          const correo = textoCompleto.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || '';

          // Extraer campus
          const campus = textoCompleto.match(/Campus:\s*([\w\s]+)/i)?.[1]?.trim() || '';

          // Extraer enlace CvLAC
          const cvlac = tdTexto.find('a[href*="cvlac"], a[href*="CvLAC"]').attr('href') || '';

          // Procesar imagen
          const imgElement = tdImagen.find('img');
          let imagen = '';
          
          if (imgElement.length) {
            const imgSrc = imgElement.attr('src') || '';
            
            if (imgSrc.startsWith('http')) {
              // URL absoluta
              imagen = imgSrc;
            } else if (imgSrc.startsWith('data:')) {
              // Imagen base64 - podrías guardarla o procesarla
              imagen = imgSrc;
            } else if (imgSrc.startsWith('/')) {
              // URL relativa
              const baseUrl = URL2.split('/unipamplona')[0];
              imagen = `${baseUrl}${imgSrc}`;
            }
          }

          console.log(`    👤 Profesor detectado: ${nombre}`);
          console.log(`       📧 Correo: ${correo}`);
          console.log(`       🏢 Campus: ${campus}`);
          console.log(`       🖼️ Imagen: ${imagen ? 'Sí' : 'No'}`);

          // Crear objeto profesor con validación
          const profesor = {
            nombre,
            resolucion,
            cargo,
            correo,
            campus,
            cvlac,
            imagen,
            // Campos adicionales útiles
            tieneImagen: !!imagen,
            tieneCvlac: !!cvlac,
            esImagenBase64: imagen.startsWith('data:')
          };

          profesores.push(profesor);
        }
      });
    });

    console.log(`✅ Se encontraron ${profesores.length} profesores`);
    
    // Opcional: filtrar profesores duplicados por nombre
    const profesoresUnicos = profesores.filter((profesor, index, self) =>
      index === self.findIndex(p => p.nombre === profesor.nombre)
    );

    if (profesoresUnicos.length !== profesores.length) {
      console.log(`⚠️ Se encontraron ${profesores.length - profesoresUnicos.length} profesores duplicados`);
    }

    res.json({
      total: profesoresUnicos.length,
      profesores: profesoresUnicos
    });

  } catch (error) {
    console.error('❌ Error al obtener profesores:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'No se pudo obtener la información de los profesores.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
