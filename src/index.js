/**
 * index.js
 * ---------------------------------------------------------
 * Punto de entrada: inicializa la conexión serial, hace home
 * y arranca el bucle infinito del ciclo pick and place.
 * ---------------------------------------------------------
 */

const serialService = require('./services/serialService');
const cncController = require('./controllers/cncController');
const configuracion = require('./config/configuracion');

async function iniciarProceso() {
  try {
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
    process.exit(1);
  }
}

// Manejo de cierre limpio (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nDeteniendo proceso...');
  serialService.cerrarConexion();
  process.exit(0);
});

iniciarProceso();
