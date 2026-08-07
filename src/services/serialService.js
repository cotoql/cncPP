/**
 * serialService.js
 * ---------------------------------------------------------
 * Encapsula toda la comunicación serial con el Arduino.
 * No conoce nada sobre el ciclo de recoger y colocar: solo
 * sabe abrir el puerto, enviar líneas G-code y esperar la
 * respuesta de Marlin ("ok" / "error").
 *
 * Nota sobre fin de línea: Marlin acepta LF ("\n") o CRLF
 * ("\r\n") para recibir comandos, pero algunos adaptadores
 * USB-serial (CH340, clones) o configuraciones de firmware
 * son más estrictos y solo confirman el "ok" si el comando
 * llega terminado en CRLF. Por eso aquí se envía siempre
 * "\r\n" — es el terminador más compatible.
 * ---------------------------------------------------------
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const configuracion = require('../config/configuracion');

const TIEMPO_MAXIMO_ESPERA_RESPUESTA_MS = 40000; // evita quedar colgado para siempre

let puertoSerial;
let lectorLineas;

function inicializarConexion() {
  return new Promise((resolve, reject) => {
    puertoSerial = new SerialPort({
      path: configuracion.puerto,
      baudRate: configuracion.baudRate,
    });

    // El delimiter '\n' funciona tanto si Marlin responde con LF
    // como con CRLF: el '\r' sobrante queda al final de la línea
    // y se elimina después con trim().
    lectorLineas = puertoSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Log crudo de todo lo que llega, útil para depurar qué
    // está contestando realmente la placa.
    lectorLineas.on('data', (linea) => {
      console.log(`[Marlin] ${linea.trim()}`);
    });

    puertoSerial.on('open', () => {
      console.log(`Conexión abierta en ${configuracion.puerto}`);
      // Marlin envía un banner de arranque (varias líneas "echo:...")
      // apenas se abre el puerto; conviene darle tiempo antes de
      // mandar el primer G-code.
      setTimeout(resolve, 2000);
    });

    puertoSerial.on('error', (error) => reject(error));
  });
}

/**
 * Envía una línea G-code y espera la respuesta "ok" de Marlin
 * antes de continuar (evita saturar el buffer del Arduino).
 * Si no hay respuesta en TIEMPO_MAXIMO_ESPERA_RESPUESTA_MS, rechaza
 * la promesa en vez de colgarse indefinidamente.
 */
function enviarComando(comando) {
  return new Promise((resolve, reject) => {
    let finalizado = false;

    const limpiar = () => {
      finalizado = true;
      lectorLineas.removeListener('data', escuchaRespuesta);
      clearTimeout(temporizador);
    };

    const escuchaRespuesta = (linea) => {
      const texto = linea.trim().toLowerCase();
      if (texto.startsWith('ok')) {
        limpiar();
        resolve(texto);
      } else if (texto.startsWith('error')) {
        limpiar();
        reject(new Error(`Marlin respondió error: ${texto}`));
      }
      // Otras líneas (banner, "echo:", "wait", temperaturas, etc.)
      // se ignoran aquí; ya quedaron logueadas arriba.
    };

    const temporizador = setTimeout(() => {
      if (finalizado) return;
      limpiar();
      reject(
        new Error(
          `Sin respuesta de Marlin tras ${TIEMPO_MAXIMO_ESPERA_RESPUESTA_MS}ms para: ${comando}`
        )
      );
    }, TIEMPO_MAXIMO_ESPERA_RESPUESTA_MS);

    lectorLineas.on('data', escuchaRespuesta);

    console.log(`[Enviado] ${comando}`);
    puertoSerial.write(`${comando}\r\n`, (error) => {
      if (error) {
        limpiar();
        reject(error);
      }
    });
  });
}

function cerrarConexion() {
  if (puertoSerial && puertoSerial.isOpen) {
    puertoSerial.close();
  }
}

function esperar(milisegundos) {
  return new Promise((resolve) => setTimeout(resolve, milisegundos));
}

module.exports = {
  inicializarConexion,
  enviarComando,
  cerrarConexion,
  esperar,
};
