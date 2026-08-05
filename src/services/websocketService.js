/**
 * websocketService.js
 * ---------------------------------------------------------
 * Levanta un servidor WebSocket local y transmite el estado
 * actual de la máquina (posición, pinza, sensor, paso en
 * ejecución) a cualquier cliente conectado — en este caso,
 * simulador.html abierto en el navegador.
 *
 * El controlador (cncController.js) no sabe nada de WebSocket:
 * solo llama a emitirEstado(estado) después de cada movimiento.
 * ---------------------------------------------------------
 */

const { WebSocketServer } = require('ws');
const configuracion = require('../config/configuracion');

let servidor;
const clientesConectados = new Set();

function iniciarServidorWebSocket() {
  servidor = new WebSocketServer({ port: configuracion.puertoWebSocket });

  servidor.on('connection', (cliente) => {
    clientesConectados.add(cliente);
    console.log('Simulador conectado por WebSocket.');

    cliente.on('close', () => {
      clientesConectados.delete(cliente);
    });
  });

  servidor.on('listening', () => {
    console.log(
      `Servidor WebSocket escuchando en ws://localhost:${configuracion.puertoWebSocket}`
    );
  });

  servidor.on('error', (error) => {
    console.error('Error en el servidor WebSocket:', error.message);
  });
}

/**
 * Envía el estado actual de la máquina a todos los clientes conectados.
 * estado esperado: { x, y, z, pinza, gcode, pasoTexto, sensorActivo }
 */
function emitirEstado(estado) {
  const mensaje = JSON.stringify(estado);
  clientesConectados.forEach((cliente) => {
    if (cliente.readyState === cliente.OPEN) {
      cliente.send(mensaje);
    }
  });
}

function detenerServidorWebSocket() {
  if (servidor) servidor.close();
}

module.exports = {
  iniciarServidorWebSocket,
  emitirEstado,
  detenerServidorWebSocket,
};
