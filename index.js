const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
//const port = 3000;

const port = process.env.PORT || 3000;

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

const URL3 = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_77/recursos/01general/07072024/04_docentes_villa.jsp';

app.get('/profesores', async (req, res) => {
  try {
    const { data } = await axios.get(URL3);
    const $ = cheerio.load(data);
    const profesores = [];

    const encabezados = [
      { texto: 'Docentes Tiempo Completo', puesto: 'Tiempo Completo' },
      { texto: 'Docentes Tiempo Completo Ocasional', puesto: 'Ocasional'},
      { texto: 'Profesores Hora Cátedra', puesto: 'Cátedra'}
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
          const campusMatch = textoCompleto.match(/Campus:\s*([^\n]+)/i);
          let campus = campusMatch?.[1]?.trim() || '';
          campus = campus.replace(/Hoja de vida.*$/i, '').trim();
          
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

app.get('/info-up', async (req, res) => {
  try {
    const URL = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp'; 
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    const bloque = $('h2').filter((i, el) =>
      $(el).text().toLowerCase().includes('preguntas frecuentes')
    ).first().next('.bordeContenidos');

    if (!bloque.length) {
      return res.status(404).json({ error: 'No se encontró el bloque de preguntas frecuentes.' });
    }

    const imgSrc = bloque.find('img').attr('src') || '';
    const imagen = imgSrc.startsWith('http')
      ? imgSrc
      : `https://www.unipamplona.edu.co${imgSrc}`;

    const titulo = bloque.find('strong').first().text().trim();

    // Este es el párrafo con la descripción real (tercer <p>)
    const descripcionHtml = bloque.find('p').eq(2).html() || '';
    const descripcionTexto = descripcionHtml
      .replace(/<[^>]+>/g, '') // Elimina etiquetas HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&([a-z]+);/gi, (match, entity) => {
        // Decodifica entidades HTML comunes
        const entities = {
          amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
          ntilde: 'ñ', Ntilde: 'Ñ', aacute: 'á', Aacute: 'Á',
          eacute: 'é', Eacute: 'É', iacute: 'í', Iacute: 'Í',
          oacute: 'ó', Oacute: 'Ó', uacute: 'ú', Uacute: 'Ú'
        };
        return entities[entity] || match;
      })
      .trim();

    res.json({
      titulo,
      descripcion: descripcionTexto,
      imagen,
      url_para_mas_informacion: URL
    });

  } catch (error) {
    console.error('❌ Error al obtener las preguntas frecuentes: ', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información de preguntas frecuentes.' });
  }
});

app.get('/sedes-regionales', async (req, res) => {
  try {
    const URL = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp';
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Bloque principal debajo del párrafo con la frase clave
    const bloque = $('p').filter((i, el) =>
      $(el).text().includes('la Universidad cuenta con tres sedes regionales')
    ).first();

    if (!bloque.length) {
      return res.status(404).json({ error: 'No se encontró el bloque de sedes regionales.' });
    }

    // Extraer sedes presenciales/pregrado
    const presList = bloque.next('ul').first();
    const presSedes = presList.find('li').map((_, li) => $(li).text().trim()).get();

    // Extraer sedes CREAD a partir del siguiente párrafo
    const creadParagraph = presList.next('p').filter((i, el) =>
      $(el).text().includes('En presencial – distancia')
    ).first();
    const creadList = creadParagraph.next('ul').first();
    const creadSedes = creadList.find('li').map((_, li) => $(li).text().trim()).get();

    res.json({
      presenciales: presSedes,
      cread: creadSedes,
      url_origen: URL
    });

  } catch (error) {
    console.error('❌ Error al obtener sedes regionales:', error.message);
    res.status(500).json({ error: 'No se pudo extraer la información de sedes regionales.' });
  }
});

const URL_MAPA = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp';

app.get('/como-llegar', async (req, res) => {
  try {
    const { data } = await axios.get(URL_MAPA);
    const $ = cheerio.load(data);

    // Buscar el párrafo que contiene el texto y luego buscar la imagen siguiente
    const tituloParrafo = $('p').filter((i, el) =>
      $(el).text().toLowerCase().includes('¿cómo llegar al campus')
    ).first();

    const img = tituloParrafo.next('p').find('img').attr('src');

    if (!img) {
      return res.status(404).json({ error: 'No se encontró la imagen del mapa.' });
    }

    const imagenUrl = img.startsWith('http')
      ? img
      : `https://www.unipamplona.edu.co${img}`;

    res.json({
      titulo: '¿Cómo llegar al Campus de la Universidad?',
      imagen: imagenUrl,
      url_origen: URL_MAPA
    });

  } catch (error) {
    console.error('❌ Error al obtener el mapa:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la imagen del mapa.' });
  }
});

app.get('/fundador-up', async (req, res) => {
  try {
    const URL = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp';
    const { data } = await axios.get(URL);
    const $ = cheerio.load(data);

    // Buscar por el texto del título
    const bloqueFundador = $('p').filter((i, el) =>
      $(el).text().toLowerCase().includes('¿quién es el fundador de la universidad')
    ).first();

    if (!bloqueFundador.length) {
      return res.status(404).json({ error: 'No se encontró la sección del fundador.' });
    }

    const titulo = bloqueFundador.text().trim();

    // Buscar la imagen en el siguiente <p>
    const imgTag = bloqueFundador.nextAll('p').find('img').first();
    const src = imgTag.attr('src') || '';
    const imagen = src.startsWith('http')
      ? src
      : `https://www.unipamplona.edu.co${src}`;

    // Buscar el párrafo con el contenido
    const descripcionParrafo = bloqueFundador.nextAll('p').filter((i, el) =>
      $(el).text().toLowerCase().includes('la universidad de pamplona fue fundada')
    ).first();

    const descripcion = descripcionParrafo.text().replace(/\s+/g, ' ').trim();

    res.json({
      titulo,
      descripcion,
      imagen,
      url_origen: URL
    });

  } catch (error) {
    console.error('❌ Error al obtener información del fundador:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información del fundador.' });
  }
});



app.get('/rector', async (req, res) => {
  try {
    const urlInfo = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/universidad/23022015/preguntas_frecuentes.jsp';
    const urlImagen = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/noticias_2016/diciembre/29122016/rector_2017-2020.jsp';

    // Obtener la imagen del slider (posición 13)
    const { data: htmlSlider } = await axios.get(urlImagen);
    const $slider = cheerio.load(htmlSlider);
    const imgSrc = $slider('#coin-slider img').eq(12).attr('src');
    const imagen = imgSrc ? `https://www.unipamplona.edu.co${imgSrc}` : null;

    // Obtener el <p> que contiene el título y la descripción
    const { data: htmlInfo } = await axios.get(urlInfo);
    const $ = cheerio.load(htmlInfo);

    const parrafoCompleto = $('p').filter((i, el) =>
      $(el).text().includes('¿Quién es el Rector de la Universidad?')
    ).first();

    const descripcion = parrafoCompleto
      .text()
      .replace('¿Quién es el Rector de la Universidad?', '')
      .replace(/\s+/g, ' ')
      .trim();

    res.json({
      titulo: 'Ivaldo Torres Chávez',
      descripcion,
      imagen,
      url_origen: urlInfo
    });

  } catch (error) {
    console.error('❌ Error al obtener la información del rector:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la información del rector.' });
  }
});


const URL_ESCUDO = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_1/recursos/corporativo/15022011/descargas_unipamplona.jsp';

app.get('/escudo', async (req, res) => {
  try {
    const { data } = await axios.get(URL_ESCUDO);
    const $ = cheerio.load(data);

    // Buscar el <h4> que contiene la palabra "Escudo"
    const h4 = $('h4').filter((i, el) =>
      $(el).text().toLowerCase().includes('escudo')
    ).first();

    if (!h4.length) {
      return res.status(404).json({ error: 'No se encontró el título Escudo' });
    }

    // Buscar la imagen más cercana (puede estar en un <p>, <div> o después del <h4>)
    let imgTag = h4.nextAll('img').first();

    if (!imgTag.length) {
      imgTag = h4.parent().find('img').first();
    }

    if (!imgTag.length) {
      return res.status(404).json({ error: 'No se encontró la imagen del escudo' });
    }

    const imgSrc = imgTag.attr('src');
    const imagen = imgSrc.startsWith('http')
      ? imgSrc
      : `${URL_ESCUDO.split('/unipamplona')[0]}${imgSrc}`;

    res.json({ imagen });
  } catch (error) {
    console.error('❌ Error al obtener el escudo:', error);
    res.status(500).json({ error: 'Error al obtener el escudo' });
  }
});




app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});