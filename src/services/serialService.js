/**
 * serialService.js
 * ---------------------------------------------------------
 * Encapsula toda la comunicación serial con el Arduino.
 * No conoce nada sobre el ciclo de recoger y colocar: solo
 * sabe abrir el puerto, enviar líneas G-code y esperar la
 * respuesta de Marlin ("ok" / "error").
 * ---------------------------------------------------------
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const configuracion = require('../config/configuracion');

let puertoSerial;
let lectorLineas;

function inicializarConexion() {
  return new Promise((resolve, reject) => {
    puertoSerial = new SerialPort({
      path: configuracion.puerto,
      baudRate: configuracion.baudRate,
    });

    lectorLineas = puertoSerial.pipe(new ReadlineParser({ delimiter: '\n' }));

    puertoSerial.on('open', () => {
      console.log(`Conexión abierta en ${configuracion.puerto}`);
      // Marlin suele enviar un mensaje de arranque; esperamos un momento
      setTimeout(resolve, 2000);
    });

    puertoSerial.on('error', (error) => reject(error));
  });
}

/**
 * Envía una línea G-code y espera la respuesta "ok" de Marlin
 * antes de continuar (evita saturar el buffer del Arduino).
 */
function enviarComando(comando) {
  return new Promise((resolve, reject) => {
    const escuchaRespuesta = (linea) => {
      const texto = linea.trim().toLowerCase();
      if (texto.startsWith('ok')) {
        lectorLineas.removeListener('data', escuchaRespuesta);
        resolve(texto);
      } else if (texto.startsWith('error')) {
        lectorLineas.removeListener('data', escuchaRespuesta);
        reject(new Error(`Marlin respondió error: ${texto}`));
      }
    };

    lectorLineas.on('data', escuchaRespuesta);

    puertoSerial.write(`${comando}\n`, (error) => {
      if (error) reject(error);
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
