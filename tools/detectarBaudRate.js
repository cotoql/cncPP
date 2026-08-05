/**
 * detectarBaudRate.js
 * ---------------------------------------------------------
 * Herramienta de diagnóstico (no forma parte del controlador).
 * Abre el puerto serial indicado con varios baud rates comunes
 * de Marlin, uno a la vez, y mide qué porcentaje de los bytes
 * recibidos son caracteres ASCII imprimibles. El baud rate
 * correcto debería mostrar texto reconocible como "start",
 * "echo:", "Marlin", etc. Los incorrectos muestran símbolos.
 *
 * Uso:
 *   node tools/detectarBaudRate.js COM3
 *   node tools/detectarBaudRate.js /dev/ttyUSB0
 * ---------------------------------------------------------
 */

const { SerialPort } = require('serialport');

const puerto = process.argv[2];

if (!puerto) {
  console.error('Uso: node tools/detectarBaudRate.js <puerto>  (ej. COM3)');
  process.exit(1);
}

const baudRatesComunes = [115200, 250000, 57600, 38400, 19200, 9600, 500000, 1000000];
const tiempoEscuchaPorBaudMs = 2500;

function calcularPorcentajeLegible(buffer) {
  if (buffer.length === 0) return 0;
  let legibles = 0;
  for (const byte of buffer) {
    // Imprimibles ASCII + salto de línea + retorno de carro + tab
    if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
      legibles++;
    }
  }
  return (legibles / buffer.length) * 100;
}

function probarBaudRate(baudRate) {
  return new Promise((resolve) => {
    let bufferAcumulado = Buffer.alloc(0);
    let puertoSerial;

    try {
      puertoSerial = new SerialPort({ path: puerto, baudRate, autoOpen: false });
    } catch (error) {
      resolve({ baudRate, error: error.message, porcentaje: 0, muestra: '' });
      return;
    }

    puertoSerial.open((error) => {
      if (error) {
        resolve({ baudRate, error: error.message, porcentaje: 0, muestra: '' });
        return;
      }

      puertoSerial.on('data', (chunk) => {
        bufferAcumulado = Buffer.concat([bufferAcumulado, chunk]);
      });

      setTimeout(() => {
        puertoSerial.close(() => {
          const porcentaje = calcularPorcentajeLegible(bufferAcumulado);
          const muestra = bufferAcumulado.toString('utf8').slice(0, 80).replace(/\s+/g, ' ');
          resolve({ baudRate, porcentaje, muestra, bytesRecibidos: bufferAcumulado.length });
        });
      }, tiempoEscuchaPorBaudMs);
    });
  });
}

async function ejecutarDiagnostico() {
  console.log(`Probando ${baudRatesComunes.length} baud rates en ${puerto}...\n`);
  console.log('(Si la CNC no imprime nada por sí sola al conectar, resetea la placa —');
  console.log(' desconecta y reconecta el USB, o presiona el botón reset— justo antes de correr esto)\n');

  const resultados = [];

  for (const baudRate of baudRatesComunes) {
    process.stdout.write(`  ${baudRate}... `);
    const resultado = await probarBaudRate(baudRate);
    resultados.push(resultado);

    if (resultado.error) {
      console.log(`error al abrir: ${resultado.error}`);
    } else if (resultado.bytesRecibidos === 0) {
      console.log('sin datos recibidos');
    } else {
      console.log(`${resultado.porcentaje.toFixed(0)}% legible (${resultado.bytesRecibidos} bytes)`);
    }
  }

  const mejor = resultados
    .filter((r) => !r.error && r.bytesRecibidos > 0)
    .sort((a, b) => b.porcentaje - a.porcentaje)[0];

  console.log('\n--- Resultado ---');
  if (!mejor) {
    console.log('No se recibió ningún dato en ningún baud rate.');
    console.log('Verifica que el puerto sea el correcto y que la placa esté encendida y');
    console.log('conectada. Prueba resetear la placa (botón físico o desconectar/reconectar USB).');
  } else if (mejor.porcentaje > 80) {
    console.log(`✅ Baud rate más probable: ${mejor.baudRate}`);
    console.log(`   Muestra recibida: "${mejor.muestra}"`);
    console.log(`\n   Actualiza tu .env: CNC_BAUDRATE=${mejor.baudRate}`);
  } else {
    console.log(`El más legible fue ${mejor.baudRate} con solo ${mejor.porcentaje.toFixed(0)}%,`);
    console.log(`lo cual no es concluyente. Muestra: "${mejor.muestra}"`);
    console.log('Puede que el puerto/cable tenga otro problema, o que la placa no esté');
    console.log('enviando su banner de arranque (algunos firmwares lo desactivan).');
  }

  process.exit(0);
}

ejecutarDiagnostico();
