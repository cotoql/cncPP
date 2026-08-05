/**
 * index.js
 * ---------------------------------------------------------
 * Punto de entrada: inicializa la conexión serial, hace home
 * y arranca el bucle infinito del ciclo pick and place.
 * ---------------------------------------------------------
 */

const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config();
console.log(dotenv.config({ path: path.resolve(__dirname, '../.env') }));
console.log('BAUDRATE:', process.env.CNC_BAUDRATE);
console.log('PUERTO:', process.env.CNC_PUERTO);


const serialService = require('./services/serialService');
const websocketService = require('./services/websocketService');
const cncController = require('./controllers/cncController');
const configuracion = require('./config/configuracion');



function imprimirConfiguracion() {
  console.log('--- Configuración cargada ---');
  console.log(`  Puerto:              ${configuracion.puerto}`);
  console.log(`  Baud rate:           ${configuracion.baudRate}`);
  console.log(`  Puerto WebSocket:    ${configuracion.puertoWebSocket}`);
  console.log(`  Pin sensor:          ${configuracion.pinSensor}`);
  console.log(`  Estado sensor activo:${configuracion.estadoSensorActivo}`);
  console.log(`  Servo pinza:         P${configuracion.servoPinza}`);
  console.log(`  Ángulo cerrado:      ${configuracion.anguloCerrado}`);
  console.log(`  Ángulo abierto:      ${configuracion.anguloAbierto}`);
  console.log(`  Altura segura:       Z${configuracion.alturaSegura}`);
  console.log(`  Altura trabajo:      Z${configuracion.alturaTrabajo}`);
  console.log(`  Posición espera:     X${configuracion.posicionEspera.x} Y${configuracion.posicionEspera.y}`);
  console.log(`  Posición recoger:    X${configuracion.posicionRecoger.x} Y${configuracion.posicionRecoger.y}`);
  console.log(`  Posición destino:    X${configuracion.posicionDestino.x} Y${configuracion.posicionDestino.y}`);
  console.log('------------------------------');
}

async function iniciarProceso() {
  try {
    imprimirConfiguracion();
    websocketService.iniciarServidorWebSocket();
    await serialService.inicializarConexion();
    await cncController.irAHome();
    await cncController.irAPosicionEspera();

    // Bucle infinito: repite el ciclo mientras el programa esté activo
    while (true) {
      await cncController.ejecutarCicloRecogerYColocar();
      await serialService.esperar(configuracion.pausaEntreCiclos);
    }
  } catch (error) {
    console.error('Error en el proceso:', error.message);
    serialService.cerrarConexion();
    websocketService.detenerServidorWebSocket();
    process.exit(1);
  }
}

// Manejo de cierre limpio (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nDeteniendo proceso...');
  serialService.cerrarConexion();
  websocketService.detenerServidorWebSocket();
  process.exit(0);
});

iniciarProceso();
