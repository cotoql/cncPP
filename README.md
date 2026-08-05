# CNC Pick and Place Controller

Controlador en Node.js para automatizar un ciclo de "recoger y colocar" en una CNC (ej. CNC 3018 Pro) con firmware Marlin, usando una pinza controlada por servo.

## Estructura del proyecto

```
cnc-pick-and-place/
├── src/
│   ├── config/
│   │   └── configuracion.js       ; puerto, pines, coordenadas, ángulos de servo
│   ├── services/
│   │   └── serialService.js       ; apertura de puerto, enviarComando(), bajo nivel
│   ├── controllers/
│   │   └── cncController.js       ; irAHome, cerrarPinza, ejecutarCiclo, etc.
│   ├── public/
│   │   └── simulador.html         ; interfaz visual del ciclo
│   └── index.js                   ; punto de entrada
├── tests/
├── .env                           ; puerto serial, baudrate
├── .gitignore
├── package.json
└── README.md
```

## Arquitectura del ciclo

```
Inicio
   │
   ▼
G28           ; Home
   │
   ▼
G1 X0 Y0 Z20  ; Posición de espera
   │
   ▼
Esperar sensor
   │
   ▼
G1 X100 Y50   ; Ir a recoger
   │
   ▼
G1 Z0         ; Bajar
   │
   ▼
M280 P0 S30   ; Cerrar pinza
   │
   ▼
G1 Z20        ; Subir
   │
   ▼
G1 X250 Y150  ; Ir al destino
   │
   ▼
G1 Z0         ; Bajar
   │
   ▼
M280 P0 S90   ; Abrir pinza
   │
   ▼
G1 Z20        ; Subir
   │
   ▼
G1 X0 Y0 Z20  ; Volver a espera
   │
   ▼
Repetir
```

## Requisitos

- Node.js 18+
- Arduino con firmware Marlin
- Sensor conectado a un pin digital
- Servo conectado como pinza (por defecto `SERVO0`)

## Instalación

```bash
npm install
```

## Configuración

Edita `src/config/configuracion.js` o las variables en `.env`:

- `CNC_PUERTO` / `puerto`: puerto serial de tu Arduino (ej. `COM3`, `/dev/ttyUSB0`)
- `pinSensor`: pin digital del sensor
- `posicionRecoger` / `posicionDestino`: coordenadas X/Y
- `anguloCerrado` / `anguloAbierto`: ángulos del servo de la pinza

## Uso

```bash
npm start
```

## Simulador visual

Abre `src/public/simulador.html` directamente en el navegador (doble clic) para ver una animación del ciclo completo sin necesidad de conectar el Arduino.

## Licencia

MIT
