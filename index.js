const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

// Configuración
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'valar2024bot';
const VENDEDOR_NUMERO = process.env.VENDEDOR_NUMERO || '5491125928529';
const MAX_MENSAJES_MEMORIA = 10;

// Inicializar cliente Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Memoria de conversaciones
const conversaciones = new Map();

// ========================================
// SISTEMA DE CÓDIGOS GENEBRE
// ========================================

// Tabla de conversión código -> medida
const CODIGO_MEDIDA = {
  '01': '1/8"', '02': '1/4"', '03': '3/8"', '04': '1/2"', '05': '3/4"',
  '06': '1"', '07': '1 1/4"', '08': '1 1/2"', '09': '2"', '10': '2 1/2"',
  '11': '3"', '12': '4"', '13': '5"', '14': '6"', '16': '8"',
  '18': '10"', '20': '12"', '22': '14"', '24': '16"', '26': '18"',
  '28': '20"', '32': '24"'
};

// Tabla inversa medida -> código
const MEDIDA_CODIGO = Object.fromEntries(
  Object.entries(CODIGO_MEDIDA).map(([k, v]) => [v, k])
);

// ========================================
// CATÁLOGO GENEBRE COMPLETO
// ========================================
const CATALOGO_GENEBRE = [
  // ============ INDUSTRIAL - VÁLVULAS ESFERA INOX ============
  {
    articulo: "2014", 
    nombre: "VÁLVULA ESFERA INOX 2 PIEZAS PASO TOTAL", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M S(316)", 
    rosca: "GAS DIN 2999",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas. Construcción acero inox microfusión. Juntas y asiento PTFE+15%FV. Tórica eje Viton. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 16.42},
      {codigo: '03', medida: '3/8"', precio: 16.42},
      {codigo: '04', medida: '1/2"', precio: 17.78},
      {codigo: '05', medida: '3/4"', precio: 24.42},
      {codigo: '06', medida: '1"', precio: 32.98},
      {codigo: '07', medida: '1 1/4"', precio: 52.18},
      {codigo: '08', medida: '1 1/2"', precio: 74.71},
      {codigo: '09', medida: '2"', precio: 120.35},
      {codigo: '10', medida: '2 1/2"', precio: 222.49},
      {codigo: '11', medida: '3"', precio: 336.32}
    ]
  },
  {
    articulo: "2014N", 
    nombre: "VÁLVULA ESFERA INOX 2 PIEZAS PASO TOTAL NPT", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M S(316)", 
    rosca: "NPT",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas con rosca NPT. Construcción acero inox microfusión. Juntas y asiento PTFE+15%FV. Tórica eje Viton. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 17.23},
      {codigo: '03', medida: '3/8"', precio: 17.23},
      {codigo: '04', medida: '1/2"', precio: 18.71},
      {codigo: '05', medida: '3/4"', precio: 25.67},
      {codigo: '06', medida: '1"', precio: 34.63},
      {codigo: '07', medida: '1 1/4"', precio: 54.81},
      {codigo: '08', medida: '1 1/2"', precio: 78.45},
      {codigo: '09', medida: '2"', precio: 126.39},
      {codigo: '10', medida: '2 1/2"', precio: 233.66},
      {codigo: '11', medida: '3"', precio: 353.14}
    ]
  },
  {
    articulo: "2013", 
    nombre: "VÁLVULA ESFERA INOX 2 PIEZAS PASO TOTAL M-H", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M S(316)", 
    rosca: "GAS DIN 2999 M-H",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas macho-hembra. Construcción acero inox microfusión. Juntas y asiento PTFE+15%FV. Tórica eje Viton. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 19.63},
      {codigo: '03', medida: '3/8"', precio: 19.63},
      {codigo: '04', medida: '1/2"', precio: 21.52},
      {codigo: '05', medida: '3/4"', precio: 29.83},
      {codigo: '06', medida: '1"', precio: 40.27}
    ]
  },
  {
    articulo: "2009", 
    nombre: "VÁLVULA ESFERA INOX 2 PIEZAS H-H", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "GAS DIN 2999",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas H-H. Construcción acero inox microfusión. Asientos PTFE+15%FV. Tórica eje Viton. Mando manual por mariposa. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 19.07},
      {codigo: '03', medida: '3/8"', precio: 19.07},
      {codigo: '04', medida: '1/2"', precio: 20.93},
      {codigo: '05', medida: '3/4"', precio: 28.90},
      {codigo: '06', medida: '1"', precio: 38.75}
    ]
  },
  {
    articulo: "2010", 
    nombre: "VÁLVULA ESFERA INOX 2 PIEZAS M-H MARIPOSA", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "GAS DIN 2999 M-H",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas M-H. Construcción acero inox microfusión. Asientos PTFE+15%FV. Tórica eje Viton. Mando manual por mariposa. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 20.06},
      {codigo: '03', medida: '3/8"', precio: 20.06},
      {codigo: '04', medida: '1/2"', precio: 21.92},
      {codigo: '05', medida: '3/4"', precio: 29.64},
      {codigo: '06', medida: '1"', precio: 39.75}
    ]
  },
  {
    articulo: "2007N", 
    nombre: "VÁLVULA ESFERA PASO TOTAL ALTA PRESIÓN", 
    categoria: "Industrial", 
    material: "Acero al Carbono ASTM A105 / Esfera e Inox 304", 
    rosca: "NPT",
    presion: "Serie 1500 (255 BAR)",
    temperatura: "-30°C a +250°C",
    descripcion: "Válvula de esfera paso total alta presión. Asientos PEEK.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 86.53},
      {codigo: '03', medida: '3/8"', precio: 86.53},
      {codigo: '04', medida: '1/2"', precio: 103.36},
      {codigo: '05', medida: '3/4"', precio: 146.54},
      {codigo: '06', medida: '1"', precio: 192.02}
    ]
  },
  {
    articulo: "2008", 
    nombre: "VÁLVULA ESFERA PASO ESTÁNDAR 2 PIEZAS", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "GAS DIN 2999",
    presion: "PN140 / 2000 PSI",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso estándar 2 piezas. Construcción acero inox microfusión. Juntas y asientos PTFE+FV. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 25.29},
      {codigo: '03', medida: '3/8"', precio: 25.29},
      {codigo: '04', medida: '1/2"', precio: 29.07},
      {codigo: '05', medida: '3/4"', precio: 41.67},
      {codigo: '06', medida: '1"', precio: 56.37}
    ]
  },
  {
    articulo: "2016", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 2 PIEZAS EXT. CAMLOCK", 
    categoria: "Industrial", 
    material: "Acero Inox 1.4408 (CF8M)", 
    rosca: "ISO 7-1 + Camlock A-A-59326D",
    presion: "10 BAR",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas. Extremo roscado ISO 7-1 y Camlock. Asientos PTFE+15%FV. Vástago inexpulsable. Tórica eje FPM (Viton).",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 29.43},
      {codigo: '05', medida: '3/4"', precio: 39.82},
      {codigo: '06', medida: '1"', precio: 54.43},
      {codigo: '07', medida: '1 1/4"', precio: 87.92},
      {codigo: '08', medida: '1 1/2"', precio: 121.36},
      {codigo: '09', medida: '2"', precio: 192.48},
      {codigo: '10', medida: '2 1/2"', precio: 327.34},
      {codigo: '11', medida: '3"', precio: 481.91}
    ]
  },
  {
    articulo: "2048", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 2 PIEZAS UNIÓN DOBLE", 
    categoria: "Industrial", 
    material: "Acero Inox 1.4408 (CF8M)", 
    rosca: "ISO 7-1 (EN 10226-1)",
    presion: "63 BAR",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas M-H. Extremos roscados según ISO 7-1. Racor macho desmontable mediante tuerca loca. Asientos PTFE+15%FV. Vástago inexpulsable. Sistema de bloqueo.",
    variantes: [
      {codigo: '06', medida: '1"', precio: 43.77},
      {codigo: '07', medida: '1 1/4"', precio: 67.50},
      {codigo: '08', medida: '1 1/2"', precio: 96.12}
    ]
  },
  // VÁLVULAS ESFERA 3 PIEZAS
  {
    articulo: "2025", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS INOX", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "GAS DIN 2999",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera 3 piezas desmontable. Construcción acero inox microfusión. Juntas y asientos PTFE+15%FV. Tórica eje Viton. Montaje directo S/ISO 5211 con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 26.45},
      {codigo: '03', medida: '3/8"', precio: 26.45},
      {codigo: '04', medida: '1/2"', precio: 28.12},
      {codigo: '05', medida: '3/4"', precio: 43.99},
      {codigo: '06', medida: '1"', precio: 53.06},
      {codigo: '07', medida: '1 1/4"', precio: 87.09},
      {codigo: '08', medida: '1 1/2"', precio: 112.82},
      {codigo: '09', medida: '2"', precio: 162.46},
      {codigo: '10', medida: '2 1/2"', precio: 388.42},
      {codigo: '11', medida: '3"', precio: 556.06},
      {codigo: '12', medida: '4"', precio: 860.22}
    ]
  },
  {
    articulo: "2025N", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS INOX NPT", 
    categoria: "Industrial", 
    material: "Acero Inox DIN 14408 (ASTM A351 CF8M SS.316)", 
    rosca: "NPT",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula de esfera paso total 3 piezas con rosca NPT. Construcción acero inox microfusión. Juntas y asiento PTFE+15%FV. Tórica eje Viton. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 27.76},
      {codigo: '03', medida: '3/8"', precio: 27.76},
      {codigo: '04', medida: '1/2"', precio: 29.57},
      {codigo: '05', medida: '3/4"', precio: 46.20},
      {codigo: '06', medida: '1"', precio: 55.67},
      {codigo: '07', medida: '1 1/4"', precio: 91.42},
      {codigo: '08', medida: '1 1/2"', precio: 118.47},
      {codigo: '09', medida: '2"', precio: 170.58},
      {codigo: '10', medida: '2 1/2"', precio: 407.85},
      {codigo: '11', medida: '3"', precio: 583.86},
      {codigo: '12', medida: '4"', precio: 903.17}
    ]
  },
  {
    articulo: "2026", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS INOX BUTT WELD", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "Butt Weld ANSI B 16.25",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 3 piezas para soldar a tope. Construcción acero inox microfusión. Juntas y asientos PTFE+15%FV. Tórica eje Viton. Montaje directo S/ISO 5211 con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible. BAJO PEDIDO.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 26.45},
      {codigo: '03', medida: '3/8"', precio: 26.45},
      {codigo: '04', medida: '1/2"', precio: 28.62},
      {codigo: '05', medida: '3/4"', precio: 44.78},
      {codigo: '06', medida: '1"', precio: 54.01},
      {codigo: '07', medida: '1 1/4"', precio: 88.58},
      {codigo: '08', medida: '1 1/2"', precio: 114.83},
      {codigo: '09', medida: '2"', precio: 165.36},
      {codigo: '10', medida: '2 1/2"', precio: 395.36},
      {codigo: '11', medida: '3"', precio: 565.99},
      {codigo: '12', medida: '4"', precio: 875.58}
    ]
  },
  {
    articulo: "2027", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS INOX SOCKET WELD", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    rosca: "Socket Weld ANSI B 16.11",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 3 piezas para soldar encaje. Construcción acero inox microfusión. Juntas y asientos PTFE+15%FV. Tórica eje Viton. Mando manual por palanca montaje directo S/DIN 5211 con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 27.38},
      {codigo: '03', medida: '3/8"', precio: 27.38},
      {codigo: '04', medida: '1/2"', precio: 29.62},
      {codigo: '05', medida: '3/4"', precio: 46.35},
      {codigo: '06', medida: '1"', precio: 55.91},
      {codigo: '07', medida: '1 1/4"', precio: 91.69},
      {codigo: '08', medida: '1 1/2"', precio: 118.86},
      {codigo: '09', medida: '2"', precio: 171.16},
      {codigo: '10', medida: '2 1/2"', precio: 409.23},
      {codigo: '11', medida: '3"', precio: 585.85},
      {codigo: '12', medida: '4"', precio: 906.30}
    ]
  },
  // VÁLVULAS ACERO AL CARBONO
  {
    articulo: "2034", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS ACERO CARBONO", 
    categoria: "Industrial", 
    material: "Acero al Carbono WCB (microfusión) / Esfera y eje Inox 316", 
    rosca: "GAS DIN 2999",
    presion: "1000 WOG",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 3 piezas. Construcción acero al carbono. Esfera y eje inoxidable 316. Asientos PTFE+15%FV. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 18.04},
      {codigo: '03', medida: '3/8"', precio: 18.04},
      {codigo: '04', medida: '1/2"', precio: 23.26},
      {codigo: '05', medida: '3/4"', precio: 29.73},
      {codigo: '06', medida: '1"', precio: 37.91},
      {codigo: '07', medida: '1 1/4"', precio: 59.48},
      {codigo: '08', medida: '1 1/2"', precio: 72.88},
      {codigo: '09', medida: '2"', precio: 133.35},
      {codigo: '10', medida: '2 1/2"', precio: 247.17},
      {codigo: '11', medida: '3"', precio: 357.92},
      {codigo: '12', medida: '4"', precio: 787.24}
    ]
  },
  {
    articulo: "2034N", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS ACERO CARBONO NPT", 
    categoria: "Industrial", 
    material: "Acero al Carbono WCB (microfusión) / Esfera y eje Inox 316", 
    rosca: "NPT",
    presion: "1000 WOG",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 3 piezas con rosca NPT. Construcción acero al carbono. Esfera y eje inoxidable 316. Asientos PTFE+15%FV. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 19.30},
      {codigo: '03', medida: '3/8"', precio: 19.30},
      {codigo: '04', medida: '1/2"', precio: 24.87},
      {codigo: '05', medida: '3/4"', precio: 31.75},
      {codigo: '06', medida: '1"', precio: 40.51},
      {codigo: '07', medida: '1 1/4"', precio: 63.58},
      {codigo: '08', medida: '1 1/2"', precio: 77.83},
      {codigo: '09', medida: '2"', precio: 142.43},
      {codigo: '10', medida: '2 1/2"', precio: 264.06},
      {codigo: '11', medida: '3"', precio: 382.32},
      {codigo: '12', medida: '4"', precio: 798.09}
    ]
  },
  {
    articulo: "2034S", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS ACERO CARBONO SOCKET WELD", 
    categoria: "Industrial", 
    material: "Acero al Carbono (microfusión) / Esfera y eje Inox 316", 
    rosca: "Socket Weld ANSI B 16.11",
    presion: "1000 WOG",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 3 piezas para soldar. Construcción acero al carbono. Esfera y eje inoxidable 316. Asientos PTFE+15%FV. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Kit de reparación disponible.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 18.66},
      {codigo: '03', medida: '3/8"', precio: 18.66},
      {codigo: '04', medida: '1/2"', precio: 24.06},
      {codigo: '05', medida: '3/4"', precio: 30.75},
      {codigo: '06', medida: '1"', precio: 39.21},
      {codigo: '07', medida: '1 1/4"', precio: 61.53},
      {codigo: '08', medida: '1 1/2"', precio: 75.39},
      {codigo: '09', medida: '2"', precio: 137.94},
      {codigo: '10', medida: '2 1/2"', precio: 255.69},
      {codigo: '11', medida: '3"', precio: 370.26},
      {codigo: '12', medida: '4"', precio: 814.38}
    ]
  },
  {
    articulo: "2034C", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 3 PIEZAS ACERO CARBONO", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Carbono WCB / Esfera y eje Inox AISI 316", 
    rosca: "GAS DIN 2999",
    presion: "1000 WOG",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esférica 3 piezas. Cuerpo acero carbono WCB. Esfera y eje inox AISI 316. Paso total. Asiento PTFE + Grafito. Vástago inexpulsable. Sistema de bloqueo. Apta vapor 180°C hasta 10 kg/cm². Kit de reparación disponible.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 27.26},
      {codigo: '05', medida: '3/4"', precio: 34.85},
      {codigo: '06', medida: '1"', precio: 44.42}
    ]
  },
  // VÁLVULAS 3 VÍAS
  {
    articulo: "2040", 
    nombre: "VÁLVULA ESFERA 3 VÍAS PASO REDUCIDO TIPO L", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 316", 
    rosca: "GAS DIN 2999",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    tipo: "3 vías L",
    descripcion: "Válvula esfera 3 vías paso reducido tipo L para desvío de flujo. Asientos PTFE+FV. Juntas cuerpo y eje PTFE. Tórica eje Viton. Montaje directo S/ISO 5211. Vástago inexpulsable. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 78.76},
      {codigo: '03', medida: '3/8"', precio: 78.76},
      {codigo: '04', medida: '1/2"', precio: 78.76},
      {codigo: '05', medida: '3/4"', precio: 101.66},
      {codigo: '06', medida: '1"', precio: 140.24},
      {codigo: '07', medida: '1 1/4"', precio: 247.48},
      {codigo: '08', medida: '1 1/2"', precio: 304.39},
      {codigo: '09', medida: '2"', precio: 502.71},
      {codigo: '10', medida: '2 1/2"', precio: 877.98}
    ]
  },
  {
    articulo: "2041", 
    nombre: "VÁLVULA ESFERA 3 VÍAS PASO REDUCIDO TIPO T", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 316", 
    rosca: "GAS DIN 2999",
    presion: "PN63",
    temperatura: "-25°C a +180°C",
    tipo: "3 vías T",
    descripcion: "Válvula esfera 3 vías paso reducido tipo T para mezcla de flujos. Asientos PTFE+FV. Juntas cuerpo y eje PTFE. Tórica eje Viton. Montaje directo S/ISO 5211. Vástago inexpulsable. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 78.76},
      {codigo: '03', medida: '3/8"', precio: 78.76},
      {codigo: '04', medida: '1/2"', precio: 78.76},
      {codigo: '05', medida: '3/4"', precio: 101.66},
      {codigo: '06', medida: '1"', precio: 140.24},
      {codigo: '07', medida: '1 1/4"', precio: 247.48},
      {codigo: '08', medida: '1 1/2"', precio: 304.39},
      {codigo: '09', medida: '2"', precio: 502.71},
      {codigo: '10', medida: '2 1/2"', precio: 877.98}
    ]
  },
  // VÁLVULAS BRIDADAS
  {
    articulo: "2528A", 
    nombre: "VÁLVULA ESFERA CON BRIDAS 2 PIEZAS INOX", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada ANSI B-16.5 S-150",
    presion: "19 kg/cm²",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas diseño Fire Safe y antiestática. Bridas ANSI B-16.5 S-150. Montaje directo de actuadores S/ISO 5211. Asientos PTFE+15%FV. Mando manual por palanca. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. Ø 8\" bajo pedido. Kit de reparación disponible.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 98.59},
      {codigo: '05', medida: '3/4"', precio: 116.96},
      {codigo: '06', medida: '1"', precio: 156.83},
      {codigo: '07', medida: '1 1/4"', precio: 216.81},
      {codigo: '08', medida: '1 1/2"', precio: 290.42},
      {codigo: '09', medida: '2"', precio: 418.77},
      {codigo: '10', medida: '2 1/2"', precio: 693.93},
      {codigo: '11', medida: '3"', precio: 886.06},
      {codigo: '12', medida: '4"', precio: 1399.36},
      {codigo: '14', medida: '6"', precio: 3915.45},
      {codigo: '16', medida: '8"', precio: 9034.34}
    ]
  },
  {
    articulo: "2528", 
    nombre: "VÁLVULA ESFERA PASO TOTAL 2 PIEZAS CON BRIDAS DIN", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada DIN PN-40 hasta 2\" / PN-16 desde 2 1/2\"",
    presion: "40/16 kg/cm²",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas diseño Fire Safe y antiestática. Bridas DIN PN-40 hasta Ø 2\", PN-16 a partir de Ø 2 1/2\". Montaje directo actuadores S/ISO 5211. Asientos PTFE+15%FV. Tórica eje Viton. Dispositivo antiestático. Mando manual por palanca. Apta vapor hasta 5 bar. Para 10 bar vapor requiere PTFE + Grafito. BAJO PEDIDO. Kit de reparación disponible.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 116.61},
      {codigo: '05', medida: '3/4"', precio: 144.98},
      {codigo: '06', medida: '1"', precio: 179.49},
      {codigo: '07', medida: '1 1/4"', precio: 262.40},
      {codigo: '08', medida: '1 1/2"', precio: 295.86},
      {codigo: '09', medida: '2"', precio: 394.58},
      {codigo: '10', medida: '2 1/2"', precio: 641.75},
      {codigo: '11', medida: '3"', precio: 829.61},
      {codigo: '12', medida: '4"', precio: 1147.57},
      {codigo: '14', medida: '6"', precio: 3704.46},
      {codigo: '16', medida: '8"', precio: 9226.79}
    ]
  },
  {
    articulo: "2526A", 
    nombre: "VÁLVULA ESFERA 2 PIEZAS CON BRIDAS ANSI WCB", 
    categoria: "Industrial", 
    material: "Cuerpo Acero al Carbono WCB (microfusión) / Esfera y eje AISI 316", 
    tipo: "Bridada ANSI B-16.5 S-150",
    presion: "19 kg/cm²",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula esfera paso total 2 piezas bridas ANSI B-16.5 S-150. Montaje directo de actuadores según ISO 5211. Diseño Fire Safe y antiestática. Dispositivo antiestático. Tórica eje Viton. Presión máx 19 kg/cm². Mando manual por palanca con sistema de bloqueo. Apta vapor 180°C hasta 10 kg/cm². Kit de reparación disponible.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 56.06},
      {codigo: '05', medida: '3/4"', precio: 74.27},
      {codigo: '06', medida: '1"', precio: 102.64},
      {codigo: '07', medida: '1 1/4"', precio: 142.48},
      {codigo: '08', medida: '1 1/2"', precio: 197.76},
      {codigo: '09', medida: '2"', precio: 291.72},
      {codigo: '10', medida: '2 1/2"', precio: 485.17},
      {codigo: '11', medida: '3"', precio: 639.25},
      {codigo: '12', medida: '4"', precio: 1096.23},
      {codigo: '14', medida: '6"', precio: 2627.03}
    ]
  },
  {
    articulo: "2540E", 
    nombre: "VÁLVULA ESFERA 3 VÍAS BRIDADA INOX TIPO L", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada DIN PN-40 hasta 2\" / PN-16 desde 2 1/2\" - 3 vías L",
    presion: "16/40 kg/cm²",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula esfera 3 vías paso total esfera tipo L. Montaje directo de actuadores S/ISO 5211. Asientos PTFE+15%FV. Mando manual por palanca. Apta vapor hasta 5 bar. BAJO PEDIDO.",
    variantes: [
      {codigo: '06', medida: '1"', precio: 604.17},
      {codigo: '07', medida: '1 1/4"', precio: 776.16},
      {codigo: '08', medida: '1 1/2"', precio: 968.73},
      {codigo: '09', medida: '2"', precio: 1323.00},
      {codigo: '10', medida: '2 1/2"', precio: 2315.25},
      {codigo: '11', medida: '3"', precio: 3307.50},
      {codigo: '12', medida: '4"', precio: 5145.00}
    ]
  },
  {
    articulo: "2541E", 
    nombre: "VÁLVULA ESFERA 3 VÍAS BRIDADA INOX TIPO T", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada DIN PN-40 hasta 2\" / PN-16 desde 2 1/2\" - 3 vías T",
    presion: "16/40 kg/cm²",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula esfera 3 vías paso total esfera tipo T. Montaje directo de actuadores S/ISO 5211. Asientos PTFE+15%FV. Mando manual por palanca. Apta vapor hasta 5 bar. BAJO PEDIDO.",
    variantes: [
      {codigo: '06', medida: '1"', precio: 604.17},
      {codigo: '07', medida: '1 1/4"', precio: 776.16},
      {codigo: '08', medida: '1 1/2"', precio: 968.73},
      {codigo: '09', medida: '2"', precio: 1323.00},
      {codigo: '10', medida: '2 1/2"', precio: 2315.25},
      {codigo: '11', medida: '3"', precio: 3307.50},
      {codigo: '12', medida: '4"', precio: 5145.00}
    ]
  },
  {
    articulo: "2544", 
    nombre: "VÁLVULA ESFERA 3 VÍAS BRIDADA WCB TIPO L", 
    categoria: "Industrial", 
    material: "Cuerpo Acero al Carbono 1.0619 (WCB)", 
    tipo: "Bridada EN 1092 PN-40 hasta 2\" / PN-16 desde 2 1/2\" - 3 vías L",
    presion: "16/40 bar",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera tres vías paso total esfera en L. Extremos bridados según EN 1092. 4 asientos PTFE+15%FV. Tórica eje FPM (Viton). Dispositivo antiestático. Sistema de bloqueo. Montaje directo S/ISO 5211. Eje inexpulsable. Apta vapor hasta 5 bar. BAJO PEDIDO.",
    variantes: [
      {codigo: '06', medida: '1"', precio: 372.63},
      {codigo: '07', medida: '1 1/4"', precio: 468.54},
      {codigo: '08', medida: '1 1/2"', precio: 576.63},
      {codigo: '09', medida: '2"', precio: 798.21},
      {codigo: '10', medida: '2 1/2"', precio: 1378.11},
      {codigo: '11', medida: '3"', precio: 1956.93},
      {codigo: '12', medida: '4"', precio: 2993.28}
    ]
  },
  {
    articulo: "2545", 
    nombre: "VÁLVULA ESFERA 3 VÍAS BRIDADA WCB TIPO T", 
    categoria: "Industrial", 
    material: "Cuerpo Acero al Carbono 1.0619 (WCB)", 
    tipo: "Bridada EN 1092 PN-40 hasta 2\" / PN-16 desde 2 1/2\" - 3 vías T",
    presion: "16/40 bar",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera tres vías paso total esfera en T. Extremos bridados según EN 1092. 4 asientos PTFE+15%FV. Tórica eje FPM (Viton). Dispositivo antiestático. Sistema de bloqueo. Montaje directo S/ISO 5211. Eje inexpulsable. Apta vapor hasta 5 bar. BAJO PEDIDO.",
    variantes: [
      {codigo: '06', medida: '1"', precio: 372.63},
      {codigo: '07', medida: '1 1/4"', precio: 468.54},
      {codigo: '08', medida: '1 1/2"', precio: 576.63},
      {codigo: '09', medida: '2"', precio: 798.21},
      {codigo: '10', medida: '2 1/2"', precio: 1378.11},
      {codigo: '11', medida: '3"', precio: 1956.93},
      {codigo: '12', medida: '4"', precio: 2993.28}
    ]
  },
  {
    articulo: "2118", 
    nombre: "VÁLVULA ESFERA INOX WAFER DIN", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Wafer montaje entre bridas PN-16 DIN",
    presion: "PN16",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula esfera paso total 1 pieza. Montaje entre bridas PN-16 (DIN). Construcción en acero inox CF8M (316) microfusión. Esfera y eje inoxidable 316. Asientos PTFE+15%FV. Montaje directo según ISO 5211. Mando manual por palanca con sistema de bloqueo. Apta vapor hasta 5 bar. BAJO PEDIDO.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 112.28},
      {codigo: '05', medida: '3/4"', precio: 137.10},
      {codigo: '06', medida: '1"', precio: 166.44},
      {codigo: '07', medida: '1 1/4"', precio: 244.16},
      {codigo: '08', medida: '1 1/2"', precio: 310.74},
      {codigo: '09', medida: '2"', precio: 404.71},
      {codigo: '10', medida: '2 1/2"', precio: 633.18},
      {codigo: '11', medida: '3"', precio: 858.40},
      {codigo: '12', medida: '4"', precio: 1201.06}
    ]
  },
  {
    articulo: "2119", 
    nombre: "VÁLVULA ESFERA INOX WAFER C/CÁMARA CALEFACCIÓN", 
    categoria: "Industrial", 
    material: "Acero Inox 1.4408 (CF8M)", 
    tipo: "Wafer montaje entre bridas EN 1092 PN-16 DIN",
    presion: "PN16",
    temperatura: "-20°C a +180°C",
    descripcion: "Válvula esfera paso total tipo wafer. Montaje entre bridas EN 1092 PN-16 (DIN). Construcción en acero inox 1.4408 (CF8M). Asientos PTFE+15%FV. Tórica eje FKM (Viton). Vástago inexpulsable. Montaje directo según ISO 5211. Mando manual por palanca con sistema de bloqueo. BAJO PEDIDO.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 399.16},
      {codigo: '05', medida: '3/4"', precio: 421.48},
      {codigo: '06', medida: '1"', precio: 536.80},
      {codigo: '07', medida: '1 1/4"', precio: 616.01},
      {codigo: '08', medida: '1 1/2"', precio: 684.33},
      {codigo: '09', medida: '2"', precio: 786.20},
      {codigo: '10', medida: '2 1/2"', precio: 1006.69},
      {codigo: '11', medida: '3"', precio: 1236.20},
      {codigo: '12', medida: '4"', precio: 1686.69}
    ]
  },
  // VÁLVULAS MARIPOSA
  {
    articulo: "2101", 
    nombre: "VÁLVULA MARIPOSA TIPO WAFER", 
    categoria: "Industrial", 
    material: "Cuerpo Fundición Nodular GGG-40 / Eje y Disco Inox 316", 
    tipo: "Wafer PN10/16 - 150LBS",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula mariposa tipo wafer. Montaje entre bridas PN 10/16 150LBS. Asiento PTFE con base de EPDM. Mando manual por palanca hasta 5\". A partir de 6\" con reductor manual incluido.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 350.68},
      {codigo: '10', medida: '2 1/2"', precio: 382.62},
      {codigo: '11', medida: '3"', precio: 528.31},
      {codigo: '12', medida: '4"', precio: 707.35},
      {codigo: '13', medida: '5"', precio: 857.34},
      {codigo: '14', medida: '6"', precio: 1058.97},
      {codigo: '16', medida: '8"', precio: 1896.00}
    ]
  },
  {
    articulo: "2104", 
    nombre: "VÁLVULA MARIPOSA TIPO WAFER INOX", 
    categoria: "Industrial", 
    material: "Cuerpo, Eje y Disco Inox 316 (CF8M)", 
    tipo: "Wafer PN10/16 - ANSI 150 LBS",
    temperatura: "-25°C a +180°C",
    descripcion: "Válvula mariposa tipo wafer inox. Montaje entre bridas PN 10/16 - ANSI 150 LBS. Asiento PTFE con base de EPDM. Longitud de caras según DIN3202 K1. Mando manual por palanca inox hasta 5\". A partir de 6\" con reductor manual incluido.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 526.06},
      {codigo: '10', medida: '2 1/2"', precio: 636.24},
      {codigo: '11', medida: '3"', precio: 774.02},
      {codigo: '12', medida: '4"', precio: 994.26},
      {codigo: '13', medida: '5"', precio: 1217.39},
      {codigo: '14', medida: '6"', precio: 1553.41},
      {codigo: '16', medida: '8"', precio: 2721.21},
      {codigo: '18', medida: '10"', precio: 4021.17}
    ]
  },
  {
    articulo: "2109B", 
    nombre: "VÁLVULA MARIPOSA TIPO WAFER ANSI BUNA", 
    categoria: "Industrial", 
    material: "Cuerpo Hierro Fundido + Epoxy / Disco Inox AISI 316", 
    tipo: "Wafer PN10/16 - ANSI 150 LBS",
    temperatura: "Max 90°C",
    descripcion: "Válvula mariposa tipo wafer PN 10/16 ANSI 150 LBS. Mando manual. Elastómero BUNA. Tóricas eje NBR. Brida montaje actuadores S/ISO 5211. Palanca fundición hasta 10\". Reductor manual a partir de 12\".",
    variantes: [
      {codigo: '09', medida: '2"', precio: 61.73},
      {codigo: '10', medida: '2 1/2"', precio: 74.58},
      {codigo: '11', medida: '3"', precio: 84.84},
      {codigo: '12', medida: '4"', precio: 111.57},
      {codigo: '13', medida: '5"', precio: 138.84},
      {codigo: '14', medida: '6"', precio: 171.38},
      {codigo: '16', medida: '8"', precio: 304.73},
      {codigo: '18', medida: '10"', precio: 450.93},
      {codigo: '20', medida: '12"', precio: 784.35},
      {codigo: '22', medida: '14"', precio: 1134.46},
      {codigo: '24', medida: '16"', precio: 1775.98},
      {codigo: '26', medida: '18"', precio: 2400.90},
      {codigo: '28', medida: '20"', precio: 3861.46}
    ]
  },
  {
    articulo: "2108A", 
    nombre: "VÁLVULA MARIPOSA TIPO LUG ANSI", 
    categoria: "Industrial", 
    material: "Cuerpo Fundición Nodular EN-GJS-400 (GGG-40) / Disco Acero Inox 1.4408 (CF8M)", 
    tipo: "Lug ANSI 125/150 - Brida montaje ISO 5211",
    presion: "235 PSI (2\" a 12\") / 150 PSI (14\" a 24\")",
    temperatura: "-20°C a +120°C",
    descripcion: "Válvula de mariposa tipo Lug. Para montaje entre bridas ANSI 125/150. Elastómero de EPDM. Longitud entre caras según 558-1 Serie 20 (DIN 3202 K1). Pintado con pintura epoxi. Máxima presión de trabajo 235 PSI (2\" a 12\") y 150 PSI (14\" a 24\"). Palanca fundición hasta 10\". Reductor manual a partir de 12\".",
    variantes: [
      {codigo: '09', medida: '2"', precio: 71.82},
      {codigo: '10', medida: '2 1/2"', precio: 87.00},
      {codigo: '11', medida: '3"', precio: 97.53},
      {codigo: '12', medida: '4"', precio: 133.79},
      {codigo: '13', medida: '5"', precio: 186.09},
      {codigo: '14', medida: '6"', precio: 222.02},
      {codigo: '16', medida: '8"', precio: 354.90},
      {codigo: '18', medida: '10"', precio: 566.72},
      {codigo: '20', medida: '12"', precio: 876.26},
      {codigo: '22', medida: '14"', precio: 1763.50},
      {codigo: '24', medida: '16"', precio: 2569.98},
      {codigo: '26', medida: '18"', precio: 3342.70},
      {codigo: '28', medida: '20"', precio: 4674.13}
    ]
  },
  {
    articulo: "2108", 
    nombre: "VÁLVULA MARIPOSA TIPO LUG DIN", 
    categoria: "Industrial", 
    material: "Cuerpo Fundición Nodular EN-GJS-400 (GGG-40) / Disco Acero Inox 1.4408 (CF8M)", 
    tipo: "Lug DIN EN 1092 PN10/16 - Brida montaje ISO 5211",
    presion: "16 bar (DN50-DN150) / 10 bar (DN200-DN300)",
    temperatura: "-20°C a +120°C",
    descripcion: "Válvula de mariposa tipo Lug. Cuerpo de fundición nodular EN-GJS-400 (GGG-40) para montaje entre bridas EN 1092 PN 10/16. Elastómero de EPDM. Disco de acero inoxidable 1.4408 (CF8M). Brida montaje actuadores según ISO 5211. Longitud entre caras según EN 558-1 Serie 20 (DIN 3202 K1). Pintado con pintura epoxi. Máxima presión de trabajo: 16 bar para DN50 a DN150 y 10 bar para DN200 a DN300. Palanca fundición hasta 10\". Reductor manual a partir de 12\". BAJO PEDIDO. NUEVO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 72.08},
      {codigo: '10', medida: '2 1/2"', precio: 87.30},
      {codigo: '11', medida: '3"', precio: 97.76},
      {codigo: '12', medida: '4"', precio: 133.50},
      {codigo: '13', medida: '5"', precio: 185.74},
      {codigo: '14', medida: '6"', precio: 221.76},
      {codigo: '16', medida: '8"', precio: 354.12},
      {codigo: '18', medida: '10"', precio: 565.56},
      {codigo: '20', medida: '12"', precio: 872.65}
    ]
  },
  {
    articulo: "2109", 
    nombre: "VÁLVULA MARIPOSA WAFER ANSI 150 LBS", 
    categoria: "Industrial", 
    material: "Cuerpo Hierro Fundido + Epoxy / Disco Inox AISI 316", 
    tipo: "Wafer PN10/16 - ANSI 150 LBS",
    temperatura: "Max 120°C",
    descripcion: "Válvula mariposa wafer ANSI. Elastómero EPDM. Tóricas eje NBR. Brida montaje ISO 5211. Palanca fundición hasta 10\", reductor manual desde 12\".",
    variantes: [
      {codigo: '09', medida: '2"', precio: 59.92},
      {codigo: '10', medida: '2 1/2"', precio: 72.39},
      {codigo: '11', medida: '3"', precio: 82.33},
      {codigo: '12', medida: '4"', precio: 108.34},
      {codigo: '13', medida: '5"', precio: 134.81},
      {codigo: '14', medida: '6"', precio: 166.37},
      {codigo: '16', medida: '8"', precio: 295.85},
      {codigo: '18', medida: '10"', precio: 437.81},
      {codigo: '20', medida: '12"', precio: 761.54},
      {codigo: '22', medida: '14"', precio: 1101.44},
      {codigo: '24', medida: '16"', precio: 1724.31},
      {codigo: '26', medida: '18"', precio: 2331.00},
      {codigo: '28', medida: '20"', precio: 3748.98},
      {codigo: '32', medida: '24"', precio: 6002.50}
    ]
  },
  // VÁLVULAS DE RETENCIÓN
  {
    articulo: "2413", 
    nombre: "VÁLVULA DE RETENCIÓN A DISCO PN63", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Disco - Rosca GAS DIN 2999",
    presion: "PN63",
    temperatura: "-20°C a +200°C",
    descripcion: "Válvula de retención a disco PN 63. Construcción acero inox CF8M (316) microfusión. Extremos rosca GAS DIN 2999. Asiento PTFE.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 29.58},
      {codigo: '05', medida: '3/4"', precio: 36.95},
      {codigo: '06', medida: '1"', precio: 48.55}
    ]
  },
  {
    articulo: "2416", 
    nombre: "VÁLVULA DE RETENCIÓN A DISCO PN63", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Disco oscilante - Rosca GAS DIN 2999",
    presion: "PN63",
    temperatura: "-20°C a +240°C",
    descripcion: "Válvula de retención a disco PN 63. Construcción acero inox CF8M (316) microfusión. Extremos rosca GAS DIN 2999. Disco y resorte AISI 316. Cierre metálico.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 25.33},
      {codigo: '03', medida: '3/8"', precio: 25.33},
      {codigo: '04', medida: '1/2"', precio: 26.87},
      {codigo: '05', medida: '3/4"', precio: 34.31},
      {codigo: '06', medida: '1"', precio: 44.83},
      {codigo: '07', medida: '1 1/4"', precio: 64.93},
      {codigo: '08', medida: '1 1/2"', precio: 89.18},
      {codigo: '09', medida: '2"', precio: 119.74},
      {codigo: '10', medida: '2 1/2"', precio: 210.49},
      {codigo: '11', medida: '3"', precio: 313.40},
      {codigo: '12', medida: '4"', precio: 510.65}
    ]
  },
  {
    articulo: "2401", 
    nombre: "VÁLVULA DE RETENCIÓN DUO-CHECK", 
    categoria: "Industrial", 
    material: "Cuerpo Hierro Fundido GG-25 / Discos Inox 316 / Ejes y resortes AISI 316", 
    tipo: "Wafer doble disco PN16 - Montaje entre bridas PN 10/16 ANSI",
    presion: "PN16",
    temperatura: "Max 100°C",
    descripcion: "Válvula retención tipo wafer doble disco PN 16. Cojinetes PTFE. Montaje entre bridas PN 10/16 ANSI nitrilo vulcanizado en ranura. Instalación vertical/horizontal.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 43.12},
      {codigo: '10', medida: '2 1/2"', precio: 50.60},
      {codigo: '11', medida: '3"', precio: 67.49},
      {codigo: '12', medida: '4"', precio: 85.34},
      {codigo: '13', medida: '5"', precio: 115.53},
      {codigo: '14', medida: '6"', precio: 170.01},
      {codigo: '16', medida: '8"', precio: 284.27},
      {codigo: '18', medida: '10"', precio: 469.04},
      {codigo: '20', medida: '12"', precio: 638.03}
    ]
  },
  {
    articulo: "2415", 
    nombre: "VÁLVULA DE RETENCIÓN A DISCO INOX", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Inox 1.4408 (CF8M) / Disco Acero Inox 1.4408 (CF8M) / Resorte AISI 316", 
    tipo: "Wafer - Montaje entre bridas EN 1092 PN10/16/25/40 y ANSI 150",
    presion: "40/25 bar",
    temperatura: "-20°C a +240°C",
    descripcion: "Válvula retención a disco tipo wafer. Dimensiones reducidas. Baja pérdida de carga. Longitud entre caras según EN 558-1 S.49. Instalación horizontal, vertical o inclinada.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 15.38},
      {codigo: '05', medida: '3/4"', precio: 19.28},
      {codigo: '06', medida: '1"', precio: 25.52},
      {codigo: '07', medida: '1 1/4"', precio: 39.73},
      {codigo: '08', medida: '1 1/2"', precio: 54.41},
      {codigo: '09', medida: '2"', precio: 78.00},
      {codigo: '10', medida: '2 1/2"', precio: 116.15},
      {codigo: '11', medida: '3"', precio: 242.65},
      {codigo: '12', medida: '4"', precio: 513.13},
      {codigo: '14', medida: '6"', precio: 723.12},
      {codigo: '16', medida: '8"', precio: 1425.73}
    ]
  },
  {
    articulo: "2406", 
    nombre: "VÁLVULA DE RETENCIÓN A CLAPETA INOX", 
    categoria: "Industrial", 
    material: "Acero Inox 1.4408 (CF8M)", 
    tipo: "Wafer - Montaje entre bridas EN 1092 PN10/16 y ANSI 150",
    presion: "16 bar",
    temperatura: "-20°C a +180°C",
    descripcion: "Válvula de retención a disco tipo wafer. Construcción en acero inox 1.4408 (CF8M). Juntas externas y asiento de FKM (Viton). Instalación horizontal o vertical. Bajas pérdidas de carga.",
    variantes: [
      {codigo: '08', medida: '1 1/2"', precio: 71.58},
      {codigo: '09', medida: '2"', precio: 76.92},
      {codigo: '10', medida: '2 1/2"', precio: 94.74},
      {codigo: '11', medida: '3"', precio: 124.47},
      {codigo: '12', medida: '4"', precio: 173.70},
      {codigo: '13', medida: '5"', precio: 223.23},
      {codigo: '14', medida: '6"', precio: 291.75},
      {codigo: '16', medida: '8"', precio: 503.91},
      {codigo: '18', medida: '10"', precio: 811.92},
      {codigo: '20', medida: '12"', precio: 1478.31}
    ]
  },
  {
    articulo: "2402", 
    nombre: "VÁLVULA DE RETENCIÓN DUO-CHECK INOX", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 316", 
    tipo: "Wafer doble disco PN25 - Montaje entre bridas PN 25 ANSI 150 LB",
    presion: "25 bar",
    temperatura: "-20°C a +180°C",
    descripcion: "Tipo wafer. Válvula retención doble disco PN 25. Construcción AISI 316. Cojinetes PTFE - Asiento Viton. Asiento Viton vulcanizado en ranura.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 169.26},
      {codigo: '10', medida: '2 1/2"', precio: 199.20},
      {codigo: '11', medida: '3"', precio: 244.14},
      {codigo: '12', medida: '4"', precio: 316.83},
      {codigo: '13', medida: '5"', precio: 438.15},
      {codigo: '14', medida: '6"', precio: 562.23},
      {codigo: '16', medida: '8"', precio: 1079.49},
      {codigo: '18', medida: '10"', precio: 1810.71},
      {codigo: '20', medida: '12"', precio: 2809.77}
    ]
  },
  {
    articulo: "2430", 
    nombre: "VÁLVULA DE RETENCIÓN A CLAPETA", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Clapeta oscilante - Rosca GAS DIN 259",
    presion: "16 kg/cm² a 120°C / 10 kg/cm² a 180°C",
    temperatura: "Min -30°C",
    descripcion: "Válvula retención a clapeta oscilante. Construcción inox CF8M (316) microfusión. Juntas PTFE. Conexión rosca GAS DIN 259. Instalación horizontal.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 49.59},
      {codigo: '05', medida: '3/4"', precio: 61.98},
      {codigo: '06', medida: '1"', precio: 83.49},
      {codigo: '07', medida: '1 1/4"', precio: 107.61},
      {codigo: '08', medida: '1 1/2"', precio: 154.23},
      {codigo: '09', medida: '2"', precio: 187.68}
    ]
  },
  {
    articulo: "2440", 
    nombre: "VÁLVULA DE RETENCIÓN CROMAX", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 304", 
    tipo: "Roscada DIN 2999",
    presion: "16 bar",
    temperatura: "Min -25°C / Max +150°C",
    descripcion: "Válvula retención Cromax. Construcción AISI 304. Asiento Viton. Extremos roscados DIN 2999. Presión de apertura 0.03 bar. Instalación vertical/horizontal.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 41.37},
      {codigo: '03', medida: '3/8"', precio: 41.37},
      {codigo: '04', medida: '1/2"', precio: 38.70},
      {codigo: '05', medida: '3/4"', precio: 47.55},
      {codigo: '06', medida: '1"', precio: 54.51},
      {codigo: '07', medida: '1 1/4"', precio: 74.04},
      {codigo: '08', medida: '1 1/2"', precio: 85.77},
      {codigo: '09', medida: '2"', precio: 166.02}
    ]
  },
  {
    articulo: "2442", 
    nombre: "FILTRO INOX PARA VÁLVULA DE RETENCIÓN", 
    categoria: "Industrial", 
    material: "Acero Inox", 
    descripcion: "Filtro inox para válvula de retención.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 6.84},
      {codigo: '05', medida: '3/4"', precio: 7.98},
      {codigo: '06', medida: '1"', precio: 9.75}
    ]
  },
  {
    articulo: "2448", 
    nombre: "VÁLVULA DE RETENCIÓN DE FONDO", 
    categoria: "Industrial", 
    material: "Acero Inox 1.4408 (CF8M)", 
    tipo: "Bridada según DIN 2501 PN-16",
    presion: "16 bar",
    temperatura: "-30°C a +180°C",
    descripcion: "Válvula de retención de fondo. Sello de Viton. Junta PTFE. Sistema de vaciado manual. BAJO PEDIDO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 369.18},
      {codigo: '10', medida: '2 1/2"', precio: 477.60},
      {codigo: '11', medida: '3"', precio: 654.00},
      {codigo: '12', medida: '4"', precio: 990.69},
      {codigo: '13', medida: '5"', precio: 1272.57},
      {codigo: '14', medida: '6"', precio: 1890.24},
      {codigo: '16', medida: '8"', precio: 3282.81}
    ]
  },
  {
    articulo: "2450", 
    nombre: "VÁLVULA DE RETENCIÓN A DISCO CON BRIDAS", 
    categoria: "Industrial", 
    material: "Cuerpo Fund. Hierro GG-25 / Disco Fund. Hierro GG-25", 
    tipo: "Bridada PN16",
    presion: "PN16",
    descripcion: "Válvula de retención a disco con bridas PN 16. Guía DN 50-80 latón DIN 17660. Guía DN 100-250 fund. GG-25. Soporte latón DIN 17660. Obturador con cierre blando NBR 80 SH.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 90.54},
      {codigo: '10', medida: '2 1/2"', precio: 127.36},
      {codigo: '11', medida: '3"', precio: 153.02},
      {codigo: '12', medida: '4"', precio: 193.88},
      {codigo: '13', medida: '5"', precio: 294.86},
      {codigo: '14', medida: '6"', precio: 405.39},
      {codigo: '16', medida: '8"', precio: 658.62},
      {codigo: '18', medida: '10"', precio: 1004.72}
    ]
  },
  {
    articulo: "2453", 
    nombre: "VÁLVULA DE RETENCIÓN A BOLA CON BRIDAS", 
    categoria: "Industrial", 
    material: "Cuerpo Fundido Hierro GGG-40 / Esfera recubierta NBR", 
    tipo: "Bridada DIN PN16",
    presion: "16 kg/cm²",
    temperatura: "-10°C a +80°C",
    descripcion: "Válvula retención a bola-bridas DIN PN 16. Dimensiones entre caras según DIN 3202 F6.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 151.58},
      {codigo: '10', medida: '2 1/2"', precio: 188.30},
      {codigo: '11', medida: '3"', precio: 240.40},
      {codigo: '12', medida: '4"', precio: 318.07},
      {codigo: '13', medida: '5"', precio: 480.74},
      {codigo: '14', medida: '6"', precio: 640.15},
      {codigo: '16', medida: '8"', precio: 1262.40},
      {codigo: '18', medida: '10"', precio: 2185.72}
    ]
  },
  {
    articulo: "2455", 
    nombre: "VÁLVULA RETENCIÓN A CLAPETA BRIDADA PN16", 
    categoria: "Industrial", 
    material: "Fundición Nodular EN-GJS-400", 
    tipo: "Bridada S/EN 1092 PN16",
    presion: "16 bar",
    temperatura: "-10°C a +120°C",
    descripcion: "Válvula retención a disco oscilante. Extremos bridados S/EN 1092 PN16. Revestimiento externo e interno en pintura epoxi. Disco vulc. EPDM. Tornillería en A. Inox. NUEVO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 129.80},
      {codigo: '10', medida: '2 1/2"', precio: 190.16},
      {codigo: '11', medida: '3"', precio: 241.34},
      {codigo: '12', medida: '4"', precio: 290.73},
      {codigo: '13', medida: '5"', precio: 449.79},
      {codigo: '14', medida: '6"', precio: 648.18},
      {codigo: '16', medida: '8"', precio: 957.16},
      {codigo: '18', medida: '10"', precio: 1562.38},
      {codigo: '20', medida: '12"', precio: 2227.93}
    ]
  },
  {
    articulo: "2451", 
    nombre: "FILTRO ACERO COLADOR PARA V. RETENC. A DISCO 2450", 
    categoria: "Industrial", 
    material: "Acero zincado", 
    tipo: "Brida PN16",
    descripcion: "Filtro colador para ensamblar - Brida PN 16. Construcción acero zincado.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 30.09},
      {codigo: '10', medida: '2 1/2"', precio: 36.61},
      {codigo: '11', medida: '3"', precio: 47.38},
      {codigo: '12', medida: '4"', precio: 61.81},
      {codigo: '13', medida: '5"', precio: 78.39},
      {codigo: '14', medida: '6"', precio: 91.43},
      {codigo: '16', medida: '8"', precio: 126.97},
      {codigo: '18', medida: '10"', precio: 179.07}
    ]
  },
  // VÁLVULA COMPUERTA
  {
    articulo: "2102", 
    nombre: "VÁLVULA COMPUERTA CUÑA FLEXIBLE EPDM", 
    categoria: "Industrial", 
    material: "Cuerpo de Fundición Nodular PN 16", 
    tipo: "Compuerta cierre EPDM - Vástago fijo",
    presion: "PN16",
    temperatura: "Max 80°C",
    descripcion: "Válvula de compuerta con cierre de EPDM y cuerpo de fundición nodular PN 16. Vástago fijo. Diseño según DIN 3352, DIN 2501, DIN 3202-F4. Apto para la conducción de agua.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 123.51},
      {codigo: '10', medida: '2 1/2"', precio: 155.87},
      {codigo: '11', medida: '3"', precio: 193.22},
      {codigo: '12', medida: '4"', precio: 252.87},
      {codigo: '13', medida: '5"', precio: 334.90},
      {codigo: '14', medida: '6"', precio: 462.64},
      {codigo: '16', medida: '8"', precio: 747.32},
      {codigo: '18', medida: '10"', precio: 1022.04},
      {codigo: '20', medida: '12"', precio: 1604.24}
    ]
  },
  // MANGUITOS ELÁSTICOS
  {
    articulo: "2830", 
    nombre: "MANGUITO ELÁSTICO DOBLE ONDA", 
    categoria: "Industrial", 
    material: "Cuerpo EPDM", 
    tipo: "Extremos racor roscas gas galvanizados",
    presion: "10 kg/cm²",
    temperatura: "-10°C a +105°C",
    descripcion: "Manguito elástico doble onda. Cuerpo EPDM. Extremos racor roscas gas galvanizados. Longitud 200mm.",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 21.14},
      {codigo: '06', medida: '1"', precio: 25.90},
      {codigo: '07', medida: '1 1/4"', precio: 29.80},
      {codigo: '08', medida: '1 1/2"', precio: 38.47},
      {codigo: '09', medida: '2"', precio: 47.86},
      {codigo: '10', medida: '2 1/2"', precio: 79.44},
      {codigo: '11', medida: '3"', precio: 96.16}
    ]
  },
  {
    articulo: "2831A", 
    nombre: "MANGUITO ELÁSTICO SIMPLE ONDA BRIDADO ANSI", 
    categoria: "Industrial", 
    material: "Cuerpo EPDM / Bridas ANSI 150 LB zincadas", 
    tipo: "Bridado ANSI 150",
    presion: "10 kg/cm²",
    temperatura: "-10°C a +105°C",
    descripcion: "Manguito elástico simple onda con bridas. Cuerpo EPDM. Bridas ANSI 150 LB zincadas.",
    variantes: [
      {codigo: '07', medida: 'DN 30 - 1 1/4"', precio: 35.23},
      {codigo: '08', medida: 'DN 40 - 1 1/2"', precio: 37.58},
      {codigo: '09', medida: 'DN 50 - 2"', precio: 46.32},
      {codigo: '10', medida: 'DN 65 - 2 1/2"', precio: 59.98},
      {codigo: '11', medida: 'DN 80 - 3"', precio: 72.75},
      {codigo: '12', medida: 'DN 100 - 4"', precio: 91.17},
      {codigo: '13', medida: 'DN 125 - 5"', precio: 123.12},
      {codigo: '14', medida: 'DN 150 - 6"', precio: 151.90},
      {codigo: '16', medida: 'DN 200 - 8"', precio: 233.64},
      {codigo: '18', medida: 'DN 250 - 10"', precio: 396.71},
      {codigo: '20', medida: 'DN 300 - 12"', precio: 524.00},
      {codigo: '22', medida: 'DN 350 - 14"', precio: 644.62},
      {codigo: '24', medida: 'DN 400 - 16"', precio: 769.36},
      {codigo: '26', medida: 'DN 450 - 18"', precio: 895.75},
      {codigo: '28', medida: 'DN 500 - 20"', precio: 1102.00}
    ]
  },
  {
    articulo: "2831", 
    nombre: "MANGUITO ELÁSTICO SIMPLE ONDA BRIDADO DIN", 
    categoria: "Industrial", 
    material: "Cuerpo EPDM / Bridas DIN PN10 zincadas", 
    tipo: "Bridado DIN PN10",
    presion: "10 bar",
    temperatura: "-10°C a +105°C",
    descripcion: "Manguito elástico simple onda bridado DIN. Cuerpo EPDM. Bridas DIN PN10 zincadas. NUEVO. BAJO PEDIDO.",
    variantes: [
      {codigo: '07', medida: 'DN 30 - 1 1/4"', precio: 33.91},
      {codigo: '08', medida: 'DN 40 - 1 1/2"', precio: 36.19},
      {codigo: '09', medida: 'DN 50 - 2"', precio: 44.69},
      {codigo: '10', medida: 'DN 65 - 2 1/2"', precio: 57.78},
      {codigo: '11', medida: 'DN 80 - 3"', precio: 71.45},
      {codigo: '12', medida: 'DN 100 - 4"', precio: 87.81},
      {codigo: '13', medida: 'DN 125 - 5"', precio: 118.67},
      {codigo: '14', medida: 'DN 150 - 6"', precio: 146.39},
      {codigo: '16', medida: 'DN 200 - 8"', precio: 218.79},
      {codigo: '18', medida: 'DN 250 - 10"', precio: 361.55},
      {codigo: '20', medida: 'DN 300 - 12"', precio: 470.14},
      {codigo: '22', medida: 'DN 350 - 14"', precio: 561.06},
      {codigo: '24', medida: 'DN 400 - 16"', precio: 682.86},
      {codigo: '26', medida: 'DN 450 - 18"', precio: 761.48},
      {codigo: '28', medida: 'DN 500 - 20"', precio: 926.26}
    ]
  },
  // JUNTAS DE EXPANSIÓN
  {
    articulo: "2835AE", 
    nombre: "JUNTA EXPANSIÓN INOX CON BRIDAS ANSI", 
    categoria: "Industrial", 
    material: "Fuelle Acero Inox 1.4301 (AISI 304) / Camisa interior Inox AISI 304 / Bridas Acero Carbono con pintura anticalórica", 
    tipo: "Bridada ANSI B16.5 Clase 150",
    presion: "19 kg/cm²",
    temperatura: "-40°C a +300°C",
    descripcion: "Junta de expansión metálica extremos bridas ANSI B16.5 Clase 150. Fuelle acero inox 1.4301 (AISI 304). Camisa interior acero inox AISI 304. Extremos bridas en acero carbono con pintura anticalórica.",
    variantes: [
      {codigo: '09', medida: 'DN 50 - 2"', precio: 208.63},
      {codigo: '10', medida: 'DN 65 - 2 1/2"', precio: 228.90},
      {codigo: '11', medida: 'DN 80 - 3"', precio: 256.34},
      {codigo: '12', medida: 'DN 100 - 4"', precio: 303.19},
      {codigo: '13', medida: 'DN 125 - 5"', precio: 383.46},
      {codigo: '14', medida: 'DN 150 - 6"', precio: 468.25},
      {codigo: '16', medida: 'DN 200 - 8"', precio: 740.86}
    ]
  },
  {
    articulo: "2835E", 
    nombre: "JUNTA EXPANSIÓN INOX CON BRIDAS DIN", 
    categoria: "Industrial", 
    material: "Fuelle Acero Inox 1.4301 (AISI 304) / Camisa interior Inox AISI 304 / Bridas Acero Carbono con pintura anticalórica", 
    tipo: "Bridada EN 1092 PN16",
    presion: "16 kg/cm²",
    temperatura: "-40°C a +300°C",
    descripcion: "Junta de expansión metálica. Extremos bridas EN 1092 PN 16. Fuelle acero inox 1.4301 (AISI 304). Camisa interior acero inox AISI 304. BAJO PEDIDO.",
    variantes: [
      {codigo: '06', medida: 'DN 25 - 1"', precio: 148.60},
      {codigo: '07', medida: 'DN 32 - 1 1/4"', precio: 168.07},
      {codigo: '08', medida: 'DN 40 - 1 1/2"', precio: 178.33},
      {codigo: '09', medida: 'DN 50 - 2"', precio: 213.41},
      {codigo: '10', medida: 'DN 65 - 2 1/2"', precio: 234.18},
      {codigo: '11', medida: 'DN 80 - 3"', precio: 267.13},
      {codigo: '12', medida: 'DN 100 - 4"', precio: 310.11},
      {codigo: '13', medida: 'DN 125 - 5"', precio: 403.98},
      {codigo: '14', medida: 'DN 150 - 6"', precio: 493.33},
      {codigo: '16', medida: 'DN 200 - 8"', precio: 780.55}
    ]
  },
  // CONTADOR DE AGUA
  {
    articulo: "6060", 
    nombre: "CONTADOR AGUA WOLTMANN DIN", 
    categoria: "Industrial", 
    material: "Cuerpo Hierro Fundido", 
    tipo: "Bridado DIN ISO 7005 PN16",
    presion: "16 bar",
    temperatura: "Max 30°C",
    descripcion: "Contador a brida Woltmann. Registro en seco. Posición de montaje horizontal (recomendada), vertical o inclinada. Extremos conexión con bridas DIN (ISO 7005, PN16). Condiciones de trabajo: presión máxima de trabajo 16 bar.",
    variantes: [
      {codigo: '09', medida: '2" - DN 50', precio: 385.89},
      {codigo: '10', medida: '2 1/2" - DN 65', precio: 420.21},
      {codigo: '11', medida: '3" - DN 80', precio: 437.34},
      {codigo: '12', medida: '4" - DN 100', precio: 556.70},
      {codigo: '13', medida: '5" - DN 125', precio: 658.10},
      {codigo: '14', medida: '6" - DN 150', precio: 922.21},
      {codigo: '16', medida: '8" - DN 200', precio: 1097.17},
      {codigo: '18', medida: '10" - DN 250', precio: 2309.36}
    ]
  },
  {
    articulo: "2450", 
    nombre: "VÁLVULA RETENCIÓN BRIDADA INOX", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada PN16",
    descripcion: "Válvula de retención bridada disco oscilante.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 79.80},
      {codigo: '05', medida: '3/4"', precio: 90.30},
      {codigo: '06', medida: '1"', precio: 121.80},
      {codigo: '07', medida: '1 1/4"', precio: 168.00},
      {codigo: '08', medida: '1 1/2"', precio: 217.35},
      {codigo: '09', medida: '2"', precio: 327.60},
      {codigo: '10', medida: '2 1/2"', precio: 487.20},
      {codigo: '11', medida: '3"', precio: 592.20},
      {codigo: '12', medida: '4"', precio: 940.80}
    ]
  },
  {
    articulo: "2453", 
    nombre: "VÁLVULA RETENCIÓN A BOLA BRIDADA", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Bridada PN16",
    descripcion: "Válvula de retención a bola bridada.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 72.45},
      {codigo: '05', medida: '3/4"', precio: 82.95},
      {codigo: '06', medida: '1"', precio: 114.45},
      {codigo: '07', medida: '1 1/4"', precio: 156.45},
      {codigo: '08', medida: '1 1/2"', precio: 196.35},
      {codigo: '09', medida: '2"', precio: 285.60},
      {codigo: '10', medida: '2 1/2"', precio: 188.30}
    ]
  },
  // FILTROS
  {
    articulo: "2458", 
    nombre: "FILTRO Y INOX ROSCADO", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316)", 
    tipo: "Filtro Y roscado",
    presion: "PN63",
    descripcion: "Filtro tipo Y roscado. Malla inox extraíble.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 24.99},
      {codigo: '03', medida: '3/8"', precio: 24.99},
      {codigo: '04', medida: '1/2"', precio: 24.99},
      {codigo: '05', medida: '3/4"', precio: 34.44},
      {codigo: '06', medida: '1"', precio: 51.45},
      {codigo: '07', medida: '1 1/4"', precio: 91.56},
      {codigo: '08', medida: '1 1/2"', precio: 120.54},
      {codigo: '09', medida: '2"', precio: 175.56}
    ]
  },
  {
    articulo: "2458G", 
    nombre: "FILTRO Y BRIDADO DIN PN-16", 
    categoria: "Industrial", 
    material: "Fundición Nodular EN-GJS-400 (GGG40)", 
    tipo: "Filtro Y bridado DIN PN16",
    presion: "16 kg/cm²",
    temperatura: "-10°C a +120°C",
    descripcion: "Filtro Y. Bridas EN 1092 PN 16 (DIN). Longitud entre caras según EN 558 Serie 1 (DIN 3202 F1). Junta cuerpo y tapa PTFE+Grafito. Tamiz AISI 304 - Perforaciones en 1 1/2\" a 6\" de 1.5mm y en 8\" a 10\" de 2mm.",
    variantes: [
      {codigo: '08', medida: '1 1/2"', precio: 74.27},
      {codigo: '09', medida: '2"', precio: 91.35},
      {codigo: '10', medida: '2 1/2"', precio: 119.22},
      {codigo: '11', medida: '3"', precio: 144.42},
      {codigo: '12', medida: '4"', precio: 200.68},
      {codigo: '13', medida: '5"', precio: 289.80},
      {codigo: '14', medida: '6"', precio: 390.03},
      {codigo: '16', medida: '8"', precio: 687.48},
      {codigo: '18', medida: '10"', precio: 1205.74},
      {codigo: '20', medida: '12"', precio: 1732.26}
    ]
  },
  {
    articulo: "2459A", 
    nombre: "FILTRO Y BRIDADO ANSI", 
    categoria: "Industrial", 
    material: "Fundición Nodular ASTM A536", 
    tipo: "Filtro Y bridado ANSI B16.42 Class 150",
    presion: "250 PSI (17 bar)",
    temperatura: "-25°C a +260°C",
    descripcion: "Filtro Y. Extremos bridados según ANSI B16.42 Class 150. Recubrimiento externo de pintura anticalórica. Tamiz en acero inoxidable AISI 304. Junta cuerpo/tapa en inoxidable + grafito. Tapón de purga con junta de cobre. APTO VAPOR. PRÓXIMAMENTE. NUEVO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 109.48},
      {codigo: '10', medida: '2 1/2"', precio: 139.04},
      {codigo: '11', medida: '3"', precio: 188.89},
      {codigo: '12', medida: '4"', precio: 276.10},
      {codigo: '13', medida: '5"', precio: 377.81},
      {codigo: '14', medida: '6"', precio: 518.26},
      {codigo: '16', medida: '8"', precio: 867.01}
    ]
  },
  {
    articulo: "2460", 
    nombre: "FILTRO Y INOX PN40", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Filtro Y roscado - Rosca GAS DIN 2999",
    presion: "40 kg/cm²",
    temperatura: "-30°C a +240°C",
    descripcion: "Filtro Y PN 40. Construcción inox CF8M (316) microfusión. Juntas PTFE. Conexión rosca GAS DIN 2999. Tamiz AISI 316. Chapa reforzada.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 18.04},
      {codigo: '03', medida: '3/8"', precio: 18.04},
      {codigo: '04', medida: '1/2"', precio: 18.04},
      {codigo: '05', medida: '3/4"', precio: 26.60},
      {codigo: '06', medida: '1"', precio: 42.27},
      {codigo: '07', medida: '1 1/4"', precio: 53.02},
      {codigo: '08', medida: '1 1/2"', precio: 66.50},
      {codigo: '09', medida: '2"', precio: 92.90}
    ]
  },
  {
    articulo: "2461A", 
    nombre: "FILTRO Y INOX AISI-316 BRIDAS ANSI B 16,5 S-150", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 316", 
    tipo: "Filtro Y bridado ANSI Clase 150",
    presion: "19 kg/cm²",
    temperatura: "-30°C a +240°C",
    descripcion: "Filtro Y inox AISI-316. Bridas ANSI Clase 150. Tamiz AISI 316. Chapa perforada 2mm.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 659.54},
      {codigo: '10', medida: '2 1/2"', precio: 946.22},
      {codigo: '11', medida: '3"', precio: 1204.34},
      {codigo: '12', medida: '4"', precio: 2007.33},
      {codigo: '14', medida: '6"', precio: 3962.74},
      {codigo: '16', medida: '8"', precio: 6439.32}
    ]
  },
  // VÁLVULAS ESCLUSA Y GLOBO
  {
    articulo: "2220", 
    nombre: "VÁLVULA ESCLUSA INOX", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Compuerta PN16 - Rosca GAS DIN 2999",
    presion: "16 kg/cm² a 120°C / 10 kg/cm² a 180°C",
    temperatura: "Min -30°C",
    descripcion: "Válvula de compuerta PN 16. Construcción inox CF8M (316) microfusión. Juntas PTFE. Conexión rosca GAS DIN 2999.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 69.78},
      {codigo: '05', medida: '3/4"', precio: 83.61},
      {codigo: '06', medida: '1"', precio: 98.52},
      {codigo: '07', medida: '1 1/4"', precio: 126.27},
      {codigo: '08', medida: '1 1/2"', precio: 167.64},
      {codigo: '09', medida: '2"', precio: 210.24}
    ]
  },
  {
    articulo: "2230", 
    nombre: "VÁLVULA GLOBO INOX", 
    categoria: "Industrial", 
    material: "Acero Inox CF8M (316) microfusión", 
    tipo: "Globo PN16 - Rosca GAS DIN 2999",
    presion: "16 kg/cm² a 120°C / 10 kg/cm² a 180°C",
    temperatura: "Min -30°C",
    descripcion: "Válvula de globo PN 16. Construcción inox CF8M (316) microfusión. Juntas PTFE. Conexión rosca GAS DIN 2999.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 57.96},
      {codigo: '05', medida: '3/4"', precio: 72.93},
      {codigo: '06', medida: '1"', precio: 96.09},
      {codigo: '07', medida: '1 1/4"', precio: 124.68},
      {codigo: '08', medida: '1 1/2"', precio: 171.21},
      {codigo: '09', medida: '2"', precio: 224.76}
    ]
  },
  // VÁLVULAS DE AGUJA
  {
    articulo: "2221", 
    nombre: "VÁLVULA AGUJA 3000 PSI", 
    categoria: "Industrial", 
    material: "Acero Carbono ASTM A105", 
    tipo: "Aguja roscada ISO 7-1 (EN 10226-1)",
    presion: "3000 PSI",
    temperatura: "1/4\"-1/2\" = 3000 PSI / 260°C | 3/4\"-1\" = 3000 PSI / 240°C",
    descripcion: "Válvula de aguja. Construcción en acero carbono ASTM A105. Extremos roscados según ISO 7-1 (EN 10226-1). Prensa estopa en PTFE + Grafito.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 29.16},
      {codigo: '03', medida: '3/8"', precio: 31.44},
      {codigo: '04', medida: '1/2"', precio: 36.96},
      {codigo: '05', medida: '3/4"', precio: 48.27},
      {codigo: '06', medida: '1"', precio: 70.02}
    ]
  },
  {
    articulo: "2223", 
    nombre: "VÁLVULA AGUJA 3000 PSI INOX", 
    categoria: "Industrial", 
    material: "Acero Inoxidable ASTM A182 F316", 
    tipo: "Aguja roscada ISO 7-1 (EN 10226-1)",
    presion: "3000 PSI",
    temperatura: "1/4\"-1/2\" = 3000 PSI / 260°C | 3/4\"-1 1/4\" = 3000 PSI / 240°C | 1 1/2\"-2\" = 3000 PSI / 200°C",
    descripcion: "Válvula de aguja. Construcción en acero inoxidable ASTM A182 F316. Extremos roscados según ISO 7-1 (EN 10226-1). Prensa estopa de eje en PTFE + Grafito.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 50.61},
      {codigo: '03', medida: '3/8"', precio: 58.77},
      {codigo: '04', medida: '1/2"', precio: 69.54},
      {codigo: '05', medida: '3/4"', precio: 98.10},
      {codigo: '06', medida: '1"', precio: 134.85},
      {codigo: '07', medida: '1 1/4"', precio: 253.77},
      {codigo: '08', medida: '1 1/2"', precio: 350.67},
      {codigo: '09', medida: '2"', precio: 436.41}
    ]
  },
  {
    articulo: "2225N", 
    nombre: "VÁLVULA AGUJA 6000 PSI INOX NPT H-H", 
    categoria: "Industrial", 
    material: "Acero Inox A182 F316 / Aguja Inox A182 F316 + tratamiento térmico", 
    tipo: "Aguja NPT - Rosca DIN 2999",
    presion: "410 bar",
    temperatura: "-54°C a +250°C",
    descripcion: "Válvula de aguja 6000LBS rosca NPT. Prensa estopa PTFE.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 70.52},
      {codigo: '03', medida: '3/8"', precio: 77.57},
      {codigo: '04', medida: '1/2"', precio: 81.10},
      {codigo: '05', medida: '3/4"', precio: 118.25},
      {codigo: '06', medida: '1"', precio: 162.63}
    ]
  },
  {
    articulo: "2226N", 
    nombre: "VÁLVULA AGUJA 6000 PSI INOX NPT M-H C/PURGA", 
    categoria: "Industrial", 
    material: "Acero Inox A182 F316 / Aguja Inox A182 F316 + tratamiento térmico", 
    tipo: "Aguja NPT con purga - Válvula de bloqueo y purga",
    presion: "410 bar",
    temperatura: "-54°C a +250°C",
    descripcion: "Válvula de aguja 6000LBS con purga. Construcción acero inox A182 F316. Rosca NPT. Estopada PTFE.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 96.45},
      {codigo: '04', medida: '1/2"', precio: 102.06}
    ]
  },
  // MIRILLA DE TURBULENCIA
  {
    articulo: "2240", 
    nombre: "MIRILLA DE TURBULENCIA INOX", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Inox AISI 316", 
    tipo: "Rosca GAS DIN 2999",
    presion: "16 kg/cm² a 50°C",
    temperatura: "Max 200°C a 10 kg/cm²",
    descripcion: "Mirillas de turbulencia doble cristal. Construcción cuerpo acero inox AISI 316. Extremos rosca GAS DIN 2999. Cristal normal con tratamiento térmico. Bajo demanda cristal Pyrex.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 147.56},
      {codigo: '05', medida: '3/4"', precio: 165.41},
      {codigo: '06', medida: '1"', precio: 187.12},
      {codigo: '07', medida: '1 1/4"', precio: 230.31},
      {codigo: '08', medida: '1 1/2"', precio: 366.19},
      {codigo: '09', medida: '2"', precio: 413.04}
    ]
  },
  // TRAMPAS DE VAPOR Y PURGADORES
  {
    articulo: "2282", 
    nombre: "TRAMPA TERMODINÁMICA CON FILTRO INCORPORADO", 
    categoria: "Industrial", 
    material: "Acero Inox 420 (ASTM A743 GR-CA40) / Tamiz AISI 304", 
    tipo: "Purgador termodinámico - Rosca GAS DIN 2999",
    presion: "52 bar",
    temperatura: "Max 400°C",
    descripcion: "Purgador termodinámico con filtro incorporado. PN63. Const.: Acero Inox 420 (ASTM A743 GR-CA40). Tamiz AISI 304. Extremos rosca GAS DIN 2999. PMO: 52 bar. TMO: 400°C. 2260.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 144.17},
      {codigo: '05', medida: '3/4"', precio: 161.94},
      {codigo: '06', medida: '1"', precio: 194.91}
    ]
  },
  {
    articulo: "2284", 
    nombre: "TRAMPA TERMODINÁMICA SIN FILTRO", 
    categoria: "Industrial", 
    material: "Acero Inox 420 (ASTM A743 GR-CA40)", 
    tipo: "Purgador termodinámico - Rosca GAS DIN 2999",
    presion: "52 bar",
    temperatura: "Max 400°C",
    descripcion: "Purgador termodinámico sin filtro PN63. Const.: Acero Inox 420 (ASTM A743 GR-CA40). Extremos rosca GAS DIN 2999. PMO: 52 bar. TMO: 400°C.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 94.30},
      {codigo: '05', medida: '3/4"', precio: 119.04},
      {codigo: '06', medida: '1"', precio: 167.68}
    ]
  },
  {
    articulo: "2285", 
    nombre: "PURGADOR DE BOYA CERRADA PARA VAPOR BSP", 
    categoria: "Industrial", 
    material: "Acero al Carbono 1.0619 (WCB) / Partes internas Acero Inox", 
    tipo: "Rosca GAS BSP S/ISO 228/1",
    presion: "PN16",
    temperatura: "Max 250°C",
    descripcion: "Conexión rosca GAS BSP S/ISO 228/1. Eliminador termostático de aire interno. Instalación horizontal. 045 - Presión diferencial máxima 4,5 bar. 100 - Presión diferencial máxima 10 bar.",
    variantes: [
      {codigo: '04045', medida: '1/2" (4,5 bar)', precio: 431.72},
      {codigo: '04100', medida: '1/2" (10 bar)', precio: 431.72},
      {codigo: '05045', medida: '3/4" (4,5 bar)', precio: 447.68},
      {codigo: '05100', medida: '3/4" (10 bar)', precio: 447.68},
      {codigo: '06045', medida: '1" (4,5 bar)', precio: 463.73},
      {codigo: '06100', medida: '1" (10 bar)', precio: 463.73}
    ]
  },
  {
    articulo: "2287", 
    nombre: "PURGADOR DE BOYA CERRADA PARA VAPOR BRIDADA", 
    categoria: "Industrial", 
    material: "Acero al Carbono 1.0619 (WCB) / Partes internas Acero Inox", 
    tipo: "Bridada DIN según EN 1092-1 PN16",
    presion: "PN16",
    temperatura: "Max 250°C",
    descripcion: "Alta capacidad de drenaje. Extremos bridados DIN según EN 1092-1 PN16. Eliminador termostático de aire interno. Instalación horizontal. DN25: Asiento simple. DN40/50: Asiento doble. 045 - Presión diferencial máxima 4,5 bar. 100 - Presión diferencial máxima 10 bar.",
    variantes: [
      {codigo: '06045', medida: '1" (4,5 bar)', precio: 609.11},
      {codigo: '06100', medida: '1" (10 bar)', precio: 609.11},
      {codigo: '08045', medida: '1 1/2" (4,5 bar)', precio: 1479.06},
      {codigo: '08100', medida: '1 1/2" (10 bar)', precio: 1479.06},
      {codigo: '09045', medida: '2" (4,5 bar)', precio: 1629.95},
      {codigo: '09100', medida: '2" (10 bar)', precio: 1629.95}
    ]
  },
  {
    articulo: "2292", 
    nombre: "PURGADOR TERMASTÁTICO ELIMINADOR DE AIRE", 
    categoria: "Industrial", 
    material: "Cuerpo PN16", 
    tipo: "Roscado según ISO 228/1",
    presion: "PMA 14 bar",
    temperatura: "TMA 225°C",
    descripcion: "Diseño compacto. Alta durabilidad y fácil mantenimiento. Excelente eliminación de aire. Filtro incorporado. Extremos roscados según ISO 228/1. Máxima presión diferencial: 13 bar. Instalación vertical. NUEVO.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 144.34}
    ]
  },
  {
    articulo: "2293", 
    nombre: "PURGADOR TERMASTÁTICO ELIMINADOR DE AIRE PN25", 
    categoria: "Industrial", 
    material: "Cuerpo PN25", 
    tipo: "Roscado según ISO 228/1",
    presion: "PMA 23 bar",
    temperatura: "TMA 235°C",
    descripcion: "Diseño compacto. Alta durabilidad y fácil mantenimiento. Excelente eliminación de aire. Filtro incorporado. Extremos roscados según ISO 228/1. Máxima presión diferencial: 21 bar. Instalación horizontal o vertical. NUEVO.",
    variantes: [
      {codigo: '02', medida: 'DN8', precio: 155.14},
      {codigo: '03', medida: 'DN10', precio: 158.76},
      {codigo: '04', medida: 'DN15', precio: 169.60}
    ]
  },
  // VÁLVULAS REDUCTORAS DE PRESIÓN
  {
    articulo: "2281", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN PARA VAPOR", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Inox", 
    tipo: "Rosca GAS PN16",
    presion: "Entrada 16 bar / Salida regulable STD: 2 a 8 bar",
    temperatura: "Max 200°C",
    descripcion: "Válvula reductora de presión de acción directa para vapor. Resorte opcional incluido para regulación de 1 a 3 bar. Libre de mantenimiento. Instalación en cualquier posición.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 701.55},
      {codigo: '05', medida: '3/4"', precio: 710.06},
      {codigo: '06', medida: '1"', precio: 802.98}
    ]
  },
  {
    articulo: "2272", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN", 
    categoria: "Industrial", 
    material: "Acero Inoxidable CF8M (316)", 
    tipo: "Roscada",
    presion: "Entrada 25 bar / Salida 1-6 bar tarado a 3 bar",
    temperatura: "-15°C a +120°C",
    descripcion: "Válvula reductora de presión. Construcción acero inoxidable CF8M (316). Asiento y diafragma FPM (Viton).",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 228.17},
      {codigo: '05', medida: '3/4"', precio: 272.65},
      {codigo: '06', medida: '1"', precio: 396.50}
    ]
  },
  {
    articulo: "2274", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN PILOTADA", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Carbono 1.0619 (WCB)", 
    tipo: "Roscada",
    presion: "25 bar admisible / 17 bar vapor saturado",
    temperatura: "0°C a 260°C",
    descripcion: "Válvula red. de presión pilotada para aplicaciones en vapor o aire comprimido. Extremos roscados. Regulación aguas debajo de 0.5 a 12 bar. Diferencial max 17 bar.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 2086.30},
      {codigo: '05', medida: '3/4"', precio: 2215.80},
      {codigo: '06', medida: '1"', precio: 2330.87},
      {codigo: '07', medida: '1 1/4"', precio: 3605.98},
      {codigo: '08', medida: '1 1/2"', precio: 3275.65},
      {codigo: '09', medida: '2"', precio: 3826.68}
    ]
  },
  {
    articulo: "2275", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN PILOTADA BRIDADA", 
    categoria: "Industrial", 
    material: "Cuerpo Acero Carbono 1.0619 (WCB)", 
    tipo: "Bridada EN 1092-1 PN25",
    presion: "25 bar admisible / 17 bar vapor saturado",
    temperatura: "0°C a 260°C",
    descripcion: "Válvula red. de presión pilotada para aplicaciones en vapor o aire comprimido. Extremos bridados EN 1092-1 PN25. Regulación aguas debajo de 0.5 a 12 bar. Diferencial max 17 bar.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 2230.19},
      {codigo: '05', medida: '3/4"', precio: 2330.87},
      {codigo: '06', medida: '1"', precio: 2431.63},
      {codigo: '07', medida: '1 1/4"', precio: 2625.88},
      {codigo: '08', medida: '1 1/2"', precio: 3309.31},
      {codigo: '09', medida: '2"', precio: 3884.82}
    ]
  },
  // VÁLVULAS DE ALIVIO DE PRESIÓN
  {
    articulo: "3190", 
    nombre: "VÁLVULA ALIVIO PRESIÓN ESCAPE CONDUCIDO", 
    categoria: "Industrial", 
    material: "Latón", 
    tipo: "Roscada GAS (BSP)",
    presion: "16 bar (1/2\" a 2\" y 4\") / 10 bar (2 1/2\" y 3\")",
    temperatura: "0°C a 180°C",
    descripcion: "Válvula de alivio de presión. Construcción latón. Campo de regulación de presión 0-10 bar (1/2\" a 3\"), 5-10 bar para 4\". Cierre de PTFE. Fluidos compatibles: agua, vapor y gases no peligrosos.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 39.49},
      {codigo: '05', medida: '3/4"', precio: 53.99},
      {codigo: '06', medida: '1"', precio: 71.97},
      {codigo: '07', medida: '1 1/4"', precio: 111.46},
      {codigo: '08', medida: '1 1/2"', precio: 136.71},
      {codigo: '09', medida: '2"', precio: 195.97},
      {codigo: '10', medida: '2 1/2"', precio: 624.78},
      {codigo: '11', medida: '3"', precio: 755.84},
      {codigo: '12', medida: '4"', precio: 1471.67}
    ]
  },
  {
    articulo: "2258", 
    nombre: "VÁLVULA ALIVIO PRESIÓN ROSCADA ACERO INOXIDABLE", 
    categoria: "Industrial", 
    material: "Acero Inoxidable 1.4408 (CF8M) / Resorte AISI 302", 
    tipo: "Roscada GAS (BSP) M-H según ISO 228/1",
    presion: "40 bar admisible / Tarado 0,5 hasta 25 bar",
    temperatura: "-20°C a +200°C",
    descripcion: "Válvula de alivio de presión. Disco con cierre de PTFE. Gran capacidad de descarga. Presión de tarado ajustada a la presión solicitada desde 0.5 hasta 25 bar. NUEVO.",
    variantes: [
      {codigo: '040611', medida: '1/2\" - 1\" (0.5 a 6 bar)', precio: 300.52},
      {codigo: '040612', medida: '1/2\" - 1\" (6.1 a 25 bar)', precio: 300.52},
      {codigo: '050611', medida: '3/4\" - 1\" (0.5 a 6 bar)', precio: 308.76},
      {codigo: '050512', medida: '3/4\" - 1\" (6.1 a 25 bar)', precio: 308.76},
      {codigo: '060611', medida: '1\" - 1\" (0.5 a 6 bar)', precio: 316.98},
      {codigo: '060612', medida: '1\" - 1\" (6.1 a 25 bar)', precio: 316.98},
      {codigo: '060711', medida: '1\" - 1 1/4\" (0.5 a 6 bar)', precio: 339.98},
      {codigo: '060712', medida: '1\" - 1 1/4\" (6.1 a 25 bar)', precio: 339.98},
      {codigo: '070711', medida: '1 1/4\" - 1 1/4\" (0.5 a 6 bar)', precio: 345.81},
      {codigo: '070712', medida: '1 1/4\" - 1 1/4\" (6.1 a 25 bar)', precio: 345.81},
      {codigo: '080911', medida: '1 1/2\" - 2\" (0.5 a 6 bar)', precio: 603.64},
      {codigo: '080912', medida: '1 1/2\" - 2\" (6.1 a 25 bar)', precio: 603.64},
      {codigo: '090911', medida: '2\" - 2\" (0.5 a 6 bar)', precio: 613.18},
      {codigo: '090912', medida: '2\" - 2\" (6.1 a 25 bar)', precio: 613.18}
    ]
  },
  // VÁLVULAS CLASE 800 - ALTA PRESIÓN
  {
    articulo: "2229A", 
    nombre: "VÁLVULA ESCLUSA WCB CIERRE METAL BRIDAS ANSI 150", 
    categoria: "Industrial", 
    material: "Acero al Carbono ASTM A216 WCB / Asiento ASTM A105 +13Cr / Compuerta ASTM A216 WCB +13Cr", 
    tipo: "Esclusa bridada ANSI 150 - API 600",
    presion: "19,6 bar (285psi) = 38°C / 5,5bar (80PSI) = 425°C",
    temperatura: "Max 425°C",
    descripcion: "Válvula esclusa clase 150. Diseño según API 600. TRIM #1. Distancia entre bridas ASME B 16.10. Extremos bridados ASME B 16.10. Empaquetadura en grafito.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 341.97},
      {codigo: '10', medida: '2 1/2"', precio: 469.53},
      {codigo: '11', medida: '3"', precio: 566.49},
      {codigo: '12', medida: '4"', precio: 796.18},
      {codigo: '13', medida: '5"', precio: 1020.73},
      {codigo: '14', medida: '6"', precio: 1255.52},
      {codigo: '16', medida: '8"', precio: 1786.29},
      {codigo: '18', medida: '10"', precio: 2877.79},
      {codigo: '20', medida: '12"', precio: 3940.23}
    ]
  },
  {
    articulo: "2232N", 
    nombre: "VÁLVULA ESCLUSA CLASE 800 NPT", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Compuerta ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Compuerta Clase 800 - Roscada NPT",
    presion: "Clase 800",
    descripcion: "Válvula de compuerta clase 800. Construcción cuerpo y bonete acero forjado ASTM A105N. Material de cierre: Asiento con Stellite. Bonete atornillado. Extremos roscados NPT.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 73.20},
      {codigo: '05', medida: '3/4"', precio: 86.22},
      {codigo: '06', medida: '1"', precio: 118.98},
      {codigo: '07', medida: '1 1/4"', precio: 147.42},
      {codigo: '08', medida: '1 1/2"', precio: 190.65},
      {codigo: '09', medida: '2"', precio: 295.74}
    ]
  },
  {
    articulo: "2232S", 
    nombre: "VÁLVULA ESCLUSA CLASE 800 SOCKET WELD", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Compuerta ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Compuerta Clase 800 - Socket Weld",
    presion: "Clase 800",
    descripcion: "Válvula de compuerta clase 800. Construcción cuerpo y bonete acero forjado ASTM A105N. Material de cierre: Asiento con Stellite. Bonete atornillado. Extremos Socket Weld.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 73.20},
      {codigo: '05', medida: '3/4"', precio: 82.05},
      {codigo: '06', medida: '1"', precio: 113.13},
      {codigo: '07', medida: '1 1/4"', precio: 147.42},
      {codigo: '08', medida: '1 1/2"', precio: 194.49},
      {codigo: '09', medida: '2"', precio: 302.55}
    ]
  },
  {
    articulo: "2232A", 
    nombre: "VÁLVULA ESCLUSA CLASE 800 BRIDADA", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Compuerta ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Compuerta Clase 800 - Bridas ANSI Clase 150",
    presion: "Clase 800",
    descripcion: "Válvula de compuerta clase 800. Construcción cuerpo y bonete acero forjado ASTM A105N. Material de cierre: Asiento con Stellite. Bonete atornillado. Bridas ANSI Clase 150.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 100.74},
      {codigo: '05', medida: '3/4"', precio: 112.95},
      {codigo: '06', medida: '1"', precio: 164.82},
      {codigo: '07', medida: '1 1/4"', precio: 221.58},
      {codigo: '08', medida: '1 1/2"', precio: 280.83},
      {codigo: '09', medida: '2"', precio: 384.60}
    ]
  },
  {
    articulo: "2234N", 
    nombre: "VÁLVULA DE RETENCIÓN CLASE 800 NPT", 
    categoria: "Industrial", 
    material: "Cuerpo y Tapa Acero Forjado ASTM A105N / Pistón ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Retención Clase 800 tipo pistón - Roscada NPT",
    presion: "Clase 800",
    descripcion: "Válvula de retención clase 800 tipo pistón. Material de cierre asiento con Stellite. Tapa atornillada. Extremos roscados NPT.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 72.48},
      {codigo: '05', medida: '3/4"', precio: 81.15},
      {codigo: '06', medida: '1"', precio: 100.95},
      {codigo: '07', medida: '1 1/4"', precio: 145.89},
      {codigo: '08', medida: '1 1/2"', precio: 194.34},
      {codigo: '09', medida: '2"', precio: 278.79}
    ]
  },
  {
    articulo: "2234S", 
    nombre: "VÁLVULA DE RETENCIÓN CLASE 800 SOCKET WELD", 
    categoria: "Industrial", 
    material: "Cuerpo y Tapa Acero Forjado ASTM A105N / Pistón ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Retención Clase 800 tipo pistón - Socket Weld",
    presion: "Clase 800",
    descripcion: "Válvula de retención clase 800 tipo pistón. Material de cierre asiento con Stellite. Tapa atornillada. Extremos Socket Weld.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 72.48},
      {codigo: '05', medida: '3/4"', precio: 81.15},
      {codigo: '06', medida: '1"', precio: 100.95},
      {codigo: '07', medida: '1 1/4"', precio: 145.89},
      {codigo: '08', medida: '1 1/2"', precio: 188.70},
      {codigo: '09', medida: '2"', precio: 278.79}
    ]
  },
  {
    articulo: "2233N", 
    nombre: "VÁLVULA GLOBO CLASE 800 NPT", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Disco ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Globo Clase 800 - Roscada NPT",
    presion: "Clase 800",
    descripcion: "Válvula de globo clase 800. Material de cierre: Asiento con Stellite. Bonete atornillado. Extremos roscados NPT.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 73.20},
      {codigo: '05', medida: '3/4"', precio: 82.05},
      {codigo: '06', medida: '1"', precio: 108.42},
      {codigo: '07', medida: '1 1/4"', precio: 147.42},
      {codigo: '08', medida: '1 1/2"', precio: 190.65},
      {codigo: '09', medida: '2"', precio: 281.64}
    ]
  },
  {
    articulo: "2233S", 
    nombre: "VÁLVULA GLOBO CLASE 800 SOCKET WELD", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Disco ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Globo Clase 800 - Socket Weld",
    presion: "Clase 800",
    descripcion: "Válvula de globo clase 800. Material de cierre: Asiento con Stellite. Bonete atornillado. Extremos Socket Weld.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 73.20},
      {codigo: '05', medida: '3/4"', precio: 82.05},
      {codigo: '06', medida: '1"', precio: 109.47},
      {codigo: '07', medida: '1 1/4"', precio: 147.42},
      {codigo: '08', medida: '1 1/2"', precio: 200.64},
      {codigo: '09', medida: '2"', precio: 287.28}
    ]
  },
  {
    articulo: "2233A", 
    nombre: "VÁLVULA GLOBO CLASE 800 BRIDADA", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero Forjado ASTM A105N / Disco ASTM A182-F6A (TRIM #8/XU)", 
    tipo: "Globo Clase 800 - Bridas ANSI Clase 150",
    presion: "Clase 800",
    descripcion: "Válvula de globo clase 800. Material de cierre: Asiento con Stellite. Bonete atornillado. Bridas ANSI Clase 150.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 102.81},
      {codigo: '05', medida: '3/4"', precio: 115.20},
      {codigo: '06', medida: '1"', precio: 168.18},
      {codigo: '07', medida: '1 1/4"', precio: 220.29},
      {codigo: '08', medida: '1 1/2"', precio: 299.04},
      {codigo: '09', medida: '2"', precio: 417.45}
    ]
  },
  {
    articulo: "2231", 
    nombre: "VÁLVULA GLOBO CON FUELLE", 
    categoria: "Industrial", 
    material: "Cuerpo y Bonete Acero al Carbono GS-C25 (WCB) / Fuelle Inoxidable 304 / Junta y empaquetadura de grafito", 
    tipo: "Globo con fuelle - Bridas DIN PN 16",
    presion: "PN16",
    temperatura: "Max 350°C",
    descripcion: "Válvula de globo con fuelle. Bridas DIN PN 16. Material de cierre: Inoxidable.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 174.28},
      {codigo: '05', medida: '3/4"', precio: 180.17},
      {codigo: '06', medida: '1"', precio: 202.65},
      {codigo: '07', medida: '1 1/4"', precio: 258.95},
      {codigo: '08', medida: '1 1/2"', precio: 304.03},
      {codigo: '09', medida: '2"', precio: 360.30},
      {codigo: '10', medida: '2 1/2"', precio: 540.50},
      {codigo: '11', medida: '3"', precio: 675.61},
      {codigo: '12', medida: '4"', precio: 900.82},
      {codigo: '13', medida: '5"', precio: 1268.01},
      {codigo: '14', medida: '6"', precio: 1734.42},
      {codigo: '16', medida: '8"', precio: 2811.01}
    ]
  },
  // VÁLVULAS DE ASIENTO INCLINADO CON ACTUADOR
  {
    articulo: "5060", 
    nombre: "VÁLVULA ASIENTO INCLINADO CON ACTUADOR", 
    categoria: "Industrial", 
    material: "Acero Inox AISI 316 microfusión / Junta actuador NBR", 
    tipo: "Roscada GAS PN16 - Actuador neumático simple efecto",
    presion: "Mando actuador: 3-10 kg/cm²",
    temperatura: "-10°C a +180°C",
    descripcion: "Válvula asiento inclinado con actuador neumático de simple efecto. Extremos rosca GAS. PN 16. Construcción acero inox AISI 316 microfusión.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 179.83},
      {codigo: '05', medida: '3/4"', precio: 181.33},
      {codigo: '06', medida: '1"', precio: 196.73},
      {codigo: '07', medida: '1 1/4"', precio: 295.52},
      {codigo: '08', medida: '1 1/2"', precio: 320.10},
      {codigo: '09', medida: '2"', precio: 375.52}
    ]
  },
  {
    articulo: "5988", 
    nombre: "FINAL DE CARRERA - LIMIT SWITCH P/5060", 
    categoria: "Industrial", 
    material: "Caja IP 65 - Acero Inox", 
    tipo: "Electromecánico - 2 micros SPDT (Honeywell)",
    descripcion: "Caja final de carrera con 2 micros electromecánicos para válvula de asiento inclinado. Indica posición (abierto/cerrado) de válvula (Art. 5060). C/transmisión de señal eléctrica. Limit Electromec. 2 x SPDT (Honeywell). 125/250 VAC o 10/30 VDC. Cierre rápido con tapa roscada transp. Ajuste levas sin herramientas. Temp. trabajo -20°C a +60°C. NO INCLUYE ACTUADOR NI VÁLVULA 5060.",
    variantes: [
      {codigo: '01', medida: 'Electromec', precio: 189.64}
    ]
  },
  {
    articulo: "5062", 
    nombre: "VÁLVULA NEUMÁTICA CORREDERA", 
    categoria: "Industrial", 
    material: "Acero Inoxidable AISI 304 / Cierre EPDM", 
    tipo: "Rosca GAS - Conexión neumática NAMUR",
    presion: "PN16",
    descripcion: "Válvula neumática de corredera. Construcción en acero inoxidable AISI 304. Extremos rosca GAS. Acción normal cerrada. Convertible a normal abierta.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 200.70},
      {codigo: '05', medida: '3/4"', precio: 240.74},
      {codigo: '06', medida: '1"', precio: 276.75},
      {codigo: '07', medida: '1 1/4"', precio: 353.56},
      {codigo: '08', medida: '1 1/2"', precio: 426.93},
      {codigo: '09', medida: '2"', precio: 569.04}
    ]
  },
  {
    articulo: "5065A", 
    nombre: "VÁLVULA NEUMÁTICA 2 VÍAS MODULANTE", 
    categoria: "Industrial", 
    material: "Acero al Carbono WCB / Asientos PPL", 
    tipo: "Bridada ANSI 150 - Globo de control normal cerrada",
    presion: "10 bar vapor / 16 bar agua",
    temperatura: "-10°C a +230°C",
    descripcion: "Válvula globo de control, normal cerrada. Construcción acero al carbono WCB. Extremos bridados ANSI 150. Señal de mando 3-15PSI. Característica: igual porcentaje.",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 1706.36},
      {codigo: '06', medida: '1"', precio: 1763.55},
      {codigo: '07', medida: '1 1/4"', precio: 1889.57},
      {codigo: '08', medida: '1 1/2"', precio: 2041.22},
      {codigo: '09', medida: '2"', precio: 2209.46},
      {codigo: '10', medida: '2 1/2"', precio: 3168.38},
      {codigo: '11', medida: '3"', precio: 4737.54},
      {codigo: '12', medida: '4"', precio: 6628.42}
    ]
  },
  // POSICIONADORES
  {
    articulo: "5952", 
    nombre: "POSICIONADOR LINEAL ELECTRONEUMÁTICO", 
    categoria: "Industrial", 
    descripcion: "Posicionador para actuador neumático a diafragma. Señal 4-20 mA.",
    variantes: [
      {codigo: '00', medida: 'Standard', precio: 1140.81}
    ]
  },
  {
    articulo: "595204", 
    nombre: "POSICIONADOR LINEAL ELECTRONEUM. C/ RETRANSMISOR", 
    categoria: "Industrial", 
    descripcion: "Posicionador para actuador neumático a diafragma. Señal 4-20 mA. Con retransmisor de posición.",
    variantes: [
      {codigo: '04', medida: 'C/Retransmisor', precio: 1784.01}
    ]
  },
  {
    articulo: "5954", 
    nombre: "POSICIONADOR DIGITAL", 
    categoria: "Industrial", 
    descripcion: "Para actuador lineal o rotativo simple efecto - Señal 4-20 mA.",
    variantes: [
      {codigo: '00', medida: 'Digital', precio: 2688.66}
    ]
  },
  {
    articulo: "5950", 
    nombre: "POSICIONADOR NEUMÁTICO", 
    categoria: "Industrial", 
    material: "Caja Alum. Norma NAMUR IP66", 
    descripcion: "Posic. neumático para control de válvulas c/actuador neumático rotativo. Señal de control de 3-15 PSI (0.2-1 bar). Para actuadores neumáticos doble o simple efecto. Incluye manómetro. NO INCLUYE ACTUADOR.",
    variantes: [
      {codigo: '00', medida: 'Neumático', precio: 846.60}
    ]
  },
  {
    articulo: "5951", 
    nombre: "POSICIONADOR ELECTRO-NEUMÁTICO", 
    categoria: "Industrial", 
    material: "Caja Alum. Norma NAMUR IP66", 
    descripcion: "Posic. electro-neumático para control de válvulas con actuador neumático rotativo. Señal de control de 4-20 mA. Incluye manómetro. NO INCLUYE ACTUADOR.",
    variantes: [
      {codigo: '00', medida: 'Electro-neumático', precio: 1128.80}
    ]
  },
  {
    articulo: "595104", 
    nombre: "POSICIONADOR ELECTRO-NEUMÁTICO CON RETRANSMISOR", 
    categoria: "Industrial", 
    material: "Caja Alum. Norma NAMUR IP66", 
    descripcion: "Idem 5951 más retransmisor electrónico de posición. Detecta mecánicamente el cambio de posición del eje de la válvula/actuador y transforma a señal de salida de CC 4-20 mA. Incluye manómetro. NO INCLUYE ACTUADOR.",
    variantes: [
      {codigo: '04', medida: 'C/Retransmisor', precio: 1765.23}
    ]
  },
  {
    articulo: "595106", 
    nombre: "POSICIONADOR ELECTRO-NEUMÁTICO C/RETRANSMISOR + LIMIT SWITCH", 
    categoria: "Industrial", 
    material: "Caja Aluminio Norma NAMUR IP66", 
    descripcion: "Idem 5951-04 preparado para montar caja final de carrera conexión NAMUR Art.: 5987. Incluye manómetro. NO INCLUYE ACTUADOR NI LIMIT SWITCH.",
    variantes: [
      {codigo: '06', medida: 'C/Retransmisor + Limit', precio: 1233.43}
    ]
  },
  // ACTUADORES NEUMÁTICOS
  {
    articulo: "5800D", 
    nombre: "ACTUADOR NEUMÁTICO DOBLE EFECTO", 
    categoria: "Industrial", 
    material: "Cuerpo Aluminio extruido ASTM6005. Protección anticorrosiva interna y externa.", 
    tipo: "Doble efecto con indicador de posición y travel stop",
    descripcion: "Actuadores neumáticos de doble efecto con indicador de posición y travel stop.",
    variantes: [
      {codigo: '120', medida: 'GNP 14-F03 (14,3 Nm)', precio: 148.03},
      {codigo: '122', medida: 'GNP 14-F04 (14,3 Nm)', precio: 148.03},
      {codigo: '128', medida: 'GNP 44-F05/07 (43,8 Nm)', precio: 200.43},
      {codigo: '138', medida: 'GNP 60-F05/07 (60,2 Nm)', precio: 251.48},
      {codigo: '142', medida: 'GNP 94-F07 (94,1 Nm)', precio: 287.98},
      {codigo: '146', medida: 'GNP 135-F07 (135,4 Nm)', precio: 344.51},
      {codigo: '150', medida: 'GNP 198-F07/10 (198,4 Nm)', precio: 448.51},
      {codigo: '158', medida: 'GNP 300-F07/10 (301 Nm)', precio: 584.29},
      {codigo: '162', medida: 'GNP 513-F10/12 (513 Nm)', precio: 773.97},
      {codigo: '166', medida: 'GNP 800-F10/12 (798 Nm)', precio: 1056.64},
      {codigo: '170', medida: 'GNP 1280-F-14 (1276,8 Nm)', precio: 1690.10},
      {codigo: '171', medida: 'GNP 1280-F-12 (1276,8 Nm)', precio: 1690.10},
      {codigo: '174', medida: 'GNP 1600-F-14 (1596 Nm)', precio: 1872.16},
      {codigo: '176', medida: 'GNP 2300-F-14 (2308,5 Nm)', precio: 3846.28}
    ]
  },
  {
    articulo: "5800", 
    nombre: "ACTUADOR NEUMÁTICO SIMPLE EFECTO", 
    categoria: "Industrial", 
    material: "Cuerpo Aluminio extruido ASTM6005. Protección anticorrosiva interna y externa.", 
    tipo: "Simple efecto con indicador de posición y travel stop",
    descripcion: "Actuadores neumáticos de simple efecto con indicador de posición y travel stop. El par está expresado para aire/resortes.",
    variantes: [
      {codigo: '124', medida: 'GNP 24 S4-F03 (17-14 / 10-6,7 Nm)', precio: 198.69},
      {codigo: '126', medida: 'GNP 24 S4-F04 (17-14 / 10-6,7 Nm)', precio: 198.69},
      {codigo: '134', medida: 'GNP 44 S4-F04 (33-27 / 17-11 Nm)', precio: 249.10},
      {codigo: '132', medida: 'GNP44 S4-F05/07 (33-27 / 17-11 Nm)', precio: 249.10},
      {codigo: '136', medida: 'GNP44 S5-F05/07 (39-23 / 12-14 Nm)', precio: 254.96},
      {codigo: '140', medida: 'GNP60 S5-F05/07 (39-31 / 25-11 Nm)', precio: 314.08},
      {codigo: '144', medida: 'GNP94 S5-F07 (69-48 / 49-31 Nm)', precio: 372.30},
      {codigo: '148', medida: 'GNP135 S5-F07 (99-67 / 69-47 Nm)', precio: 440.73},
      {codigo: '152', medida: 'GNP198 S4-F07/10 (148-120/79-50 Nm)', precio: 538.01},
      {codigo: '154', medida: 'GNP198 S5-F07/10 (138-100/98-63 Nm)', precio: 553.91},
      {codigo: '156', medida: 'GNP198 S6-F07/10 (122-81/118-76 Nm)', precio: 569.76},
      {codigo: '160', medida: 'GNP300 S5-F07/10 (196-144/157-105 Nm)', precio: 752.93},
      {codigo: '164', medida: 'GNP513 S5-F10/12 (341-255/258-172 Nm)', precio: 1097.48},
      {codigo: '168', medida: 'GNP800 S5-F10/12 (519-381/417-279 Nm)', precio: 1529.28},
      {codigo: '172', medida: 'GNP1280 S5-F-12 (877-638/618-400 Nm)', precio: 2306.82},
      {codigo: '178', medida: 'GNP2300 S5-F-14 (1488-1201/1108-821 Nm)', precio: 4008.40},
      {codigo: '180', medida: 'GNP2500 S5-F-16 (2390-1937/1572-1119 Nm)', precio: 5313.82}
    ]
  },
  // ACTUADORES ELÉCTRICOS
  {
    articulo: "5803", 
    nombre: "ACTUADORES ELÉCTRICOS ROTATIVOS MULTIVOLTAJE", 
    categoria: "Industrial", 
    material: "Resistente a la corrosión", 
    tipo: "Fijación ISO 5211 - Protección IP-67",
    temperatura: "-20° a +70°C",
    descripcion: "Actuadores eléctricos rotativos multivoltaje. Mando manual de emergencia. Indicador óptico de posición. 2 contactos adicionales de final de carrera. Control térmico y electrónico de par. LED indicador de funcionamiento. Alimentación eléctrica 24-240 VCC/VCA.",
    variantes: [
      {codigo: '51', medida: 'GE-0 (20 Nm / 25 Nm / F03-04/05)', precio: 523.23},
      {codigo: '47', medida: 'GE-05 (35 Nm / 38 Nm / F03-04/05)', precio: 691.26},
      {codigo: '52', medida: 'GE-1 (55 Nm / 60 Nm / F05/07)', precio: 791.86},
      {codigo: '48', medida: 'GE-15 (85 Nm / 90 Nm / F05/07)', precio: 1190.11},
      {codigo: '53', medida: 'GE-2 (140 Nm / 170 Nm / F07/10)', precio: 1548.36},
      {codigo: '54', medida: 'GE-2+ (300 Nm / 350 Nm / F07/10)', precio: 1958.44}
    ]
  },
  // ELECTROVÁLVULAS NAMUR
  {
    articulo: "4519", 
    nombre: "ELECTROVÁLVULA NAMUR", 
    categoria: "Electroválvulas", 
    material: "IP 65 con conector y juntas", 
    tipo: "5 vías/2 posiciones - Norma NAMUR",
    presion: "Min 2 bar / Max 10 bar",
    temperatura: "-20°C a 70°C",
    descripcion: "Electroválvula 5 vías acoplamiento conforme con la norma NAMUR. 5 vías/2 posiciones. Dispositivo de mando manual. Consumo 5W. Racores: 1/4\" GAS. Voltajes: C.A.: 24-48-110-220 50/60 Hz. C.C.: 12-24.",
    variantes: [
      {codigo: '0224', medida: 'NAMUR 24 VAC', precio: 51.58},
      {codigo: '02110', medida: 'NAMUR 110 VAC', precio: 51.58},
      {codigo: '02220', medida: 'NAMUR 220 VAC', precio: 51.58},
      {codigo: '02C12', medida: 'NAMUR 12 VDC', precio: 51.58},
      {codigo: '02C24', medida: 'NAMUR 24 VDC', precio: 51.58}
    ]
  },
  {
    articulo: "4521", 
    nombre: "ELECTROVÁLVULA NAMUR CON SEGURIDAD INTRÍNSECA", 
    categoria: "Electroválvulas", 
    material: "ATEX Ex 2G EEx ia IIC T6", 
    tipo: "5 vías con bobina de seguridad intrínseca",
    descripcion: "Electroválvula 5 vías con bobina de seguridad. Intrínseca=ATEX Ex 2G EEx ia IIC T6.",
    variantes: [
      {codigo: '02C24', medida: 'NAMUR 24 VAC', precio: 356.89}
    ]
  },
  {
    articulo: "4523", 
    nombre: "ELECTROVÁLVULA NAMUR 5 VÍAS BI-ESTABLE", 
    categoria: "Electroválvulas", 
    tipo: "5/2 vías NAMUR Bi-Estable según NAMUR VDI/VDE 3845",
    descripcion: "Electroválvula 5/2 vías NAMUR Bi-Estable. Según NAMUR VDI/VDE 3845. Conex alim roscas 1/4\" GAS.",
    variantes: [
      {codigo: '02C24V', medida: 'NAMUR 24 VDC - 5.0W', precio: 97.48},
      {codigo: '02220V', medida: 'NAMUR 220 VAC - 5.1VA', precio: 97.48}
    ]
  },
  // BOBINAS Y CONECTORES DE REPUESTO
  {
    articulo: "4819", 
    nombre: "BOBINA DE REPUESTO PARA ELECTROVÁLVULA", 
    categoria: "Electroválvulas", 
    descripcion: "Bobinas de repuesto para electroválvulas.",
    variantes: [
      {codigo: '24', medida: 'Bobina Rep. 24 VAC', precio: 13.08},
      {codigo: '110', medida: 'Bobina Rep. 110 VAC', precio: 13.08},
      {codigo: '220', medida: 'Bobina Rep. 220 VAC', precio: 13.08},
      {codigo: 'C12', medida: 'Bobina Rep. 12 VDC', precio: 13.08},
      {codigo: 'C24', medida: 'Bobina Rep. 24 VDC', precio: 13.08}
    ]
  },
  {
    articulo: "4801", 
    nombre: "CONECTOR TRIPOLAR 5W", 
    categoria: "Electroválvulas", 
    descripcion: "Conector tripolar 5W para electroválvulas.",
    variantes: [
      {codigo: '05', medida: 'Conector Tripolar 5w', precio: 2.13}
    ]
  },
  // ACCESORIOS PARA ACTUADORES
  {
    articulo: "5971", 
    nombre: "REDUCTOR MANUAL DE EMERGENCIA", 
    categoria: "Industrial", 
    material: "Acero Fundido WCB - Protección IP67", 
    tipo: "Montaje mediante bridas s/ ISO 5211 - Autolubricado",
    descripcion: "Reductor manual de emergencia para actuadores rotativos doble efecto. NO INCLUYE ACTUADOR NI VÁLVULA.",
    variantes: [
      {codigo: '04', medida: '200 Nm / F05-07 H14 / F05-07 H17', precio: 276.94},
      {codigo: '05', medida: '600 Nm / F07-10 H22 / F07-10 H27', precio: 515.24},
      {codigo: '06', medida: '900 Nm / F-07-10 H27 / F-07-10-12 H27', precio: 618.30},
      {codigo: '07', medida: '1600 Nm / F-14 /', precio: 719.53}
    ]
  },
  {
    articulo: "5985", 
    nombre: "PALANCA MANUAL C/RETORNO POR RESORTE", 
    categoria: "Industrial", 
    material: "Carcasa ALEAC de zinc con pintura epoxy / Palanca y eje acero inox", 
    tipo: "Giro horario 90° - Conexión ISO 5211 - Protección IP 65",
    temperatura: "-40°C a 80°C",
    descripcion: "Impide que la válvula quede accidentalmente abierta o en posición equivocada. Retorno a posición por resorte. Para sistemas de toma muestras, purgas, etc. NO INCLUYE VÁLVULA. NUEVO.",
    variantes: [
      {codigo: '02', medida: '14-11 Nm / F03-F05 / 11x11', precio: 909.85},
      {codigo: '07', medida: '24-20,5 Nm / F03-F05-F07 / 14x14', precio: 1123.23},
      {codigo: '09', medida: '45,5-39,7 Nm / F05-F07 / 17x17', precio: 1947.37}
    ]
  },
  {
    articulo: "5987", 
    nombre: "FINAL DE CARRERA - LIMIT SWITCH", 
    categoria: "Industrial", 
    material: "Caja Aluminio Norma NAMUR IP67", 
    descripcion: "Microrruptores para señalización de final de carrera en caja de aluminio norma NAMUR - IP 67. NO INCLUYE ACTUADOR.",
    variantes: [
      {codigo: '02', medida: 'Electromecánico', precio: 69.15},
      {codigo: '04', medida: 'Inductivo ALPS 2 hilos (10-30 VCC)', precio: 212.44},
      {codigo: '06', medida: 'Inductivo ALPS 3 hilos (10-30 VCC)', precio: 258.43},
      {codigo: '08', medida: 'Induct NCB2-V3P4O "P+F" (8VCC)', precio: 338.28},
      {codigo: '10', medida: 'Elemec. ATEX Ex d IIB T6 (125-250 Vca 15A)', precio: 331.33},
      {codigo: '20', medida: 'Caja F.C. c/COMU A5+', precio: 940.29}
    ]
  },
  {
    articulo: "5953", 
    nombre: "CONTROLADOR DE VELOC. PARA ACTUADOR NEUMÁTICO", 
    categoria: "Industrial", 
    descripcion: "Controlador de velocidad para actuadores neumáticos. Montaje directo entre actuador y electroválvula NAMUR 5/2.",
    variantes: [
      {codigo: '02', medida: 'Standard', precio: 75.72}
    ]
  },
  {
    articulo: "P5953", 
    nombre: "PLACA ADAPTADORA P. CONTROL VELOC. DE ACTUADORES", 
    categoria: "Industrial", 
    descripcion: "Placa adaptadora para controlador de velocidad de actuadores neumáticos. Montaje directo sobre actuador conexión NAMUR.",
    variantes: [
      {codigo: '00', medida: 'Standard', precio: 20.62}
    ]
  },
  {
    articulo: "5012", 
    nombre: "DADOS DE CONVERSIÓN", 
    categoria: "Industrial", 
    descripcion: "Dados para adaptar vástago al interior de actuadores o reductores manuales.",
    variantes: [
      {codigo: '0911', medida: '9 x 11', precio: 8.25},
      {codigo: '0914', medida: '9 x 14', precio: 10.80},
      {codigo: '1114', medida: '11 x 14', precio: 10.80},
      {codigo: '1117', medida: '11 x 17', precio: 11.07},
      {codigo: '1417', medida: '14 x 17', precio: 11.48},
      {codigo: '1722', medida: '17 x 22', precio: 19.08},
      {codigo: '1724', medida: '17 x 24', precio: 37.50},
      {codigo: '2227', medida: '22 x 27', precio: 50.67},
      {codigo: '2230', medida: '22 x 30', precio: 65.18},
      {codigo: '2730', medida: '27 x 30', precio: 105.90},
      {codigo: '2736', medida: '27 x 36', precio: 124.29},
      {codigo: '3646', medida: '36 x 46', precio: 349.43}
    ]
  },
  // ACCESORIOS ADICIONALES PARA ACTUADORES
  {
    articulo: "5810", 
    nombre: "PLACA POSICIONADORA Y CARCASA MOD. J3", 
    categoria: "Industrial", 
    descripcion: "Placa posicionadora para actuador modelo J3. DPS-2005. Señal 4-20 mA. Señal de entrada 4-20 mA 0-10 V. Señal de salida 4-20 mA 0-10 V. Precisión mayor a 1%. Resolución mínima mejor que 1%. Histéresis mejor que 1%. Linealidad mejor que 1%.",
    variantes: [
      {codigo: '00', medida: 'DPS-2005 p/GE0/05/1/15', precio: 570.74},
      {codigo: '01', medida: 'DPS-2005 para GE-2/GE-2+', precio: 1014.89}
    ]
  },
  {
    articulo: "IBSG", 
    nombre: "BLOQUE DE SEGURIDAD BSR", 
    categoria: "Industrial", 
    descripcion: "El sistema de seguridad BSR permite, en caso de interrupción de la alimentación eléctrica, situar la válvula en una posición previamente predeterminada NC o NA. En el interior del actuador se sitúa la tarjeta del circuito BSR más el bloque de baterías que se encuentra en carga continua, lo que permite accionar el actuador, en caso necesario, cuando la unidad detecta un fallo de suministro eléctrico. No se trata de un actuador simple efecto.",
    variantes: [
      {codigo: '00', medida: 'p/GE0/05/1/15', precio: 689.96},
      {codigo: '01', medida: 'para GE-2/GE-2+', precio: 998.60}
    ]
  },
  {
    articulo: "5334", 
    nombre: "EXTENSOR PARA VÁLVULA AUTOMATIZADA", 
    categoria: "Industrial", 
    descripcion: "Extensor de vástago para válvulas accionada por actuador. Largos de 50 o 100mm. NUEVO.",
    variantes: [
      {codigo: '0905', medida: 'L= 50 mm (1/4\"-1/2\")', precio: 100.01},
      {codigo: '1105', medida: 'L= 50 mm (3/4\"-1\")', precio: 100.01},
      {codigo: '1405', medida: 'L= 50 mm (1 1/4\"-2\")', precio: 110.98},
      {codigo: '1705', medida: 'L= 50 mm (2 1/2\"-4\")', precio: 129.68},
      {codigo: '1410', medida: 'L= 100 mm (1 1/4\"-2\")', precio: 149.11},
      {codigo: '1710', medida: 'L= 100 mm (2 1/2\"-4\")', precio: 178.56}
    ]
  },
  // ACTUADORES ELÉCTRICOS TRIFÁSICOS
  {
    articulo: "5803T", 
    nombre: "ACTUADORES ELÉCTRICOS TRIFÁSICOS", 
    categoria: "Industrial", 
    material: "Resistente a la corrosión", 
    tipo: "Fijación ISO 5211 - Protección IP-67",
    temperatura: "-20° a +70°C",
    descripcion: "Actuadores eléctricos trifásicos. Mando manual de emergencia. Indicador óptico de posición. 2 contactos adicionales de final de carrera (4SPDT). Control térmico de la temperatura: Resistencia calefactora de 7-10 W. Control electrónico de par. LED indicador de funcionamiento. Accesorios opcionales: Posicionador 4/20 mA, Transmisor 4/20 mA, Mando local/remoto.",
    variantes: [
      {codigo: '58', medida: 'GE-010 (100 Nm)', precio: 1847.72},
      {codigo: '59', medida: 'GE-015 (160 Nm)', precio: 2328.68},
      {codigo: '55', medida: 'GE-025 (240 Nm)', precio: 2522.04},
      {codigo: '56', medida: 'GE-035 (350 Nm)', precio: 3012.04},
      {codigo: '62', medida: 'GE-050 (500 Nm)', precio: 3214.40},
      {codigo: '57', medida: 'GE-080 (800 Nm)', precio: 3746.48},
      {codigo: '60', medida: 'GE-110 (1100 Nm)', precio: 4218.56},
      {codigo: '64', medida: 'GE-150 (1500 Nm)', precio: 6208.72},
      {codigo: '61', medida: 'GE-210 (2100 Nm)', precio: 6529.92}
    ]
  },
  {
    articulo: "581004", 
    nombre: "POSICIONADOR 4/20 MA PARA ACTUADOR TRIFÁSICO", 
    categoria: "Industrial", 
    descripcion: "Posicionador 4/20 mA para actuadores eléctricos trifásicos.",
    variantes: [
      {codigo: '04', medida: 'Posicionador', precio: 1341.44}
    ]
  },
  // TEMPORIZADOR Y PRESOSTATOS
  {
    articulo: "4100", 
    nombre: "TEMPORIZADOR PARA DESCARGA DE CONDENSADOS", 
    categoria: "Industrial", 
    descripcion: "Instrumento de control creado expresamente para válvulas de descarga. Timer ON con su tiempo variable de 0,5 a 10 segundos. El Timer OFF regula a su vez el intervalo entre dos ciclos de apertura y puede variar de 0,5 a 45 min. Dos leds indican el estado de funcionamiento.",
    variantes: [
      {codigo: '00', medida: 'Standard', precio: 46.73}
    ]
  },
  {
    articulo: "3784", 
    nombre: "PRESOSTATO AIRE - 1 VÍA", 
    categoria: "Industrial", 
    tipo: "Rosca 1/4\" NPT",
    presion: "Max 12 bar",
    descripcion: "Presostato 1 vía para controlar presión de bombas de aire. Tensión de conexión 240V 50Hz. Potencia máxima conexión 2,2 kW. Regulación de 1,5 a 12 bar. Diferencial variable. Válvula de descarga incorporada. Función desconexión manual.",
    variantes: [
      {codigo: '02', medida: '1/4\" NPT', precio: 24.23}
    ]
  },
  {
    articulo: "3785", 
    nombre: "PRESOSTATO AIRE - 4 VÍAS", 
    categoria: "Industrial", 
    tipo: "Rosca 1/4\" NPT",
    presion: "Max 12 bar",
    descripcion: "Presostato 4 vías para aire para controlar presión de compresores. Tensión de conexión 240V 50Hz. Potencia máxima conexión 2,2 kW. Regulación de 1,5 a 12 bar. Diferencial variable. Válvula de descarga incorporada. Función desconexión manual.",
    variantes: [
      {codigo: '02', medida: '1/4\" NPT', precio: 25.00}
    ]
  },
  // CONTROLADORES DE FLUJO Y VÁLVULAS DE ZONA
  {
    articulo: "2848", 
    nombre: "CONTROLADOR DE FLUJO - FLOW PEN", 
    categoria: "Industrial", 
    material: "Caja aleación aluminio galvanizado / Racor latón / Lengüetas acero inox AISI 304", 
    tipo: "Rosca GAS 1\"",
    presion: "Max 10 bar",
    temperatura: "Max fluido 110°C / Ambiente -20 a 80°C",
    descripcion: "Controlador de flujo (líquidos). Para tuberías de 1\" a 8\". Conexión rosca GAS 1\". 220 V, 10A. Protección IP 64.",
    variantes: [
      {codigo: '06', medida: '1\"', precio: 100.71}
    ]
  },
  {
    articulo: "4790", 
    nombre: "VÁLVULA DE ZONA MOTORIZADA 2 VÍAS", 
    categoria: "Industrial", 
    material: "Latón", 
    tipo: "Rosca GAS hembra ISO 228/1",
    presion: "16 bar",
    temperatura: "Fluido <94°C / Ambiente <40°C",
    descripcion: "Cable de 2 hilos. Construcción en latón. Aplicación agua fría o caliente. Tensiones 220 V (±10%) 50-60 Hz. Clase de protección IP 40. Palanca para accionamiento manual con muelle de retorno.",
    variantes: [
      {codigo: '04', medida: '1/2\"', precio: 85.16},
      {codigo: '05', medida: '3/4\"', precio: 89.27},
      {codigo: '06', medida: '1\"', precio: 99.97}
    ]
  },
  {
    articulo: "4791", 
    nombre: "VÁLVULA DE ZONA MOTORIZADA 3 VÍAS", 
    categoria: "Industrial", 
    material: "Latón", 
    tipo: "Rosca GAS hembra ISO 228/1",
    presion: "16 bar",
    temperatura: "Fluido <94°C / Ambiente <40°C",
    descripcion: "Cable de 2 hilos. Construcción en latón. Aplicación agua fría o caliente. Tensiones 220 V (±10%) 50-60 Hz. Clase de protección IP 40. Palanca para accionamiento manual con muelle de retorno.",
    variantes: [
      {codigo: '04', medida: '1/2\"', precio: 91.44},
      {codigo: '05', medida: '3/4\"', precio: 93.45},
      {codigo: '06', medida: '1\"', precio: 103.29}
    ]
  },
  // VÁLVULAS DE EQUILIBRADO
  {
    articulo: "2228", 
    nombre: "VÁLVULA DE EQUILIBRADO ESTÁTICO BRIDAS DIN PN16", 
    categoria: "Industrial", 
    material: "Cuerpo y bonete fundición nodular GGG-40 / Eje acero inoxidable", 
    tipo: "Bridada DIN PN16",
    presion: "PN16",
    temperatura: "-10°C a +120°C",
    descripcion: "Válvula de equilibrado estático. Cierre en EPDM. Orificio variable. Doble regulación. BAJO PEDIDO.",
    variantes: [
      {codigo: '09', medida: '2\"', precio: 414.10},
      {codigo: '10', medida: '2 1/2\"', precio: 455.10},
      {codigo: '11', medida: '3\"', precio: 552.30},
      {codigo: '12', medida: '4\"', precio: 692.96},
      {codigo: '13', medida: '5\"', precio: 979.24},
      {codigo: '14', medida: '6\"', precio: 1312.85},
      {codigo: '16', medida: '8\"', precio: 2360.09},
      {codigo: '18', medida: '10\"', precio: 3516.90},
      {codigo: '20', medida: '12\"', precio: 5117.08}
    ]
  },
  {
    articulo: "3073", 
    nombre: "VÁLV. DE EQUILIBRADO ESTÁTICO CON ORIFICIO VARIABLE", 
    categoria: "Industrial", 
    material: "Cuerpo y componentes internos en latón / Juntas de Vitón", 
    tipo: "Rosca GAS (BSP) - Toma de presión H 1/8\"",
    presion: "PN20",
    temperatura: "-30°C a 120°C",
    descripcion: "Válvula de equilibrado estático con orificio variable.",
    variantes: [
      {codigo: '04', medida: '1/2\"', precio: 0},
      {codigo: '05', medida: '3/4\"', precio: 56.73},
      {codigo: '06', medida: '1\"', precio: 72.05},
      {codigo: '07', medida: '1 1/4\"', precio: 80.64},
      {codigo: '08', medida: '1 1/2\"', precio: 114.44},
      {codigo: '09', medida: '2\"', precio: 174.74}
    ]
  },
  {
    articulo: "3074", 
    nombre: "VÁLVULA DE EQUILIBRADO ESTÁTICO", 
    categoria: "Industrial", 
    material: "Latón UNE-EN 12165 / Juntas de EPDM", 
    tipo: "Rosca GAS (BSP) hembra ISO 228/1",
    presion: "PN 16 bar",
    temperatura: "-20°C a 120°C",
    descripcion: "Dispositivo para ajuste y medida del fluido en tránsito, frío o caliente, para sistemas abiertos o cerrados. Ajuste micrométrico. Indicador calibración en volante graduado. Posibilidad de verificar el caudal en tránsito del circuito mediante entradas piezométricas. Tomas de presión incluidas. Aplicación con agua y agua + glicol (50%).",
    variantes: [
      {codigo: '04', medida: '1/2\"', precio: 42.09},
      {codigo: '05', medida: '3/4\"', precio: 47.87},
      {codigo: '06', medida: '1\"', precio: 52.20},
      {codigo: '07', medida: '1 1/4\"', precio: 79.23},
      {codigo: '08', medida: '1 1/2\"', precio: 89.64},
      {codigo: '09', medida: '2\"', precio: 126.30}
    ]
  },
  // MANÓMETROS
  {
    articulo: "3822", 
    nombre: "MANÓMETRO INOX Ø63 CON GLICERINA", 
    categoria: "Industrial", 
    material: "Caja acero inox AISI 304 / Tubo Bourdon y racor latón UNE-EN 12165", 
    tipo: "Rosca 1/4\" M. GAS - Salida inferior (radial)",
    descripcion: "Manómetro Ø63 con glicerina. Graduaciones disponibles de 0 a 2.5-4-6-10-16-25-60-100 bar. Consultar disponibilidad rosca NPT - Art.: 3822N.",
    variantes: [
      {codigo: '002', medida: '0 - 2,5 Bar', precio: 12.61},
      {codigo: '004', medida: '0 - 4 Bar', precio: 12.61},
      {codigo: '006', medida: '0 - 6 Bar', precio: 12.61},
      {codigo: '010', medida: '0 - 10 Bar', precio: 12.61},
      {codigo: '016', medida: '0 - 16 Bar', precio: 12.61},
      {codigo: '025', medida: '0 - 25 Bar', precio: 12.61},
      {codigo: '060', medida: '0 - 60 Bar', precio: 12.61},
      {codigo: '100', medida: '0 - 100 Bar', precio: 12.61}
    ]
  },
  {
    articulo: "3824", 
    nombre: "MANÓMETRO INOX Ø4\" CON GLICERINA", 
    categoria: "Industrial", 
    material: "Caja acero inox AISI 304 / Tubo Bourdon y racor acero inox AISI 304", 
    tipo: "Rosca 1/2\" M. GAS - Salida inferior (radial)",
    descripcion: "Manómetro Ø100 con glicerina. Graduaciones disponibles de 0 a 2.5-4-6-10-16-25-40-60-100 bar. Consultar disponibilidad rosca NPT - Art.: 3824N.",
    variantes: [
      {codigo: '002', medida: '0 - 2,5 Bar', precio: 50.63},
      {codigo: '004', medida: '0 - 4 Bar', precio: 50.63},
      {codigo: '006', medida: '0 - 6 Bar', precio: 50.63},
      {codigo: '010', medida: '0 - 10 Bar', precio: 50.63},
      {codigo: '016', medida: '0 - 16 Bar', precio: 50.63},
      {codigo: '025', medida: '0 - 25 Bar', precio: 50.63},
      {codigo: '060', medida: '0 - 60 Bar', precio: 50.63},
      {codigo: '100', medida: '0 - 100 Bar', precio: 50.63}
    ]
  },
  // VÁLVULAS REDUCTORAS DE PRESIÓN ADICIONALES
  {
    articulo: "3342", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN A MEMBRANA", 
    categoria: "Industrial", 
    material: "Cuerpo en latón / Componentes internos metálicos en latón / Muelle de acero galv. / Juntas de asiento en EPDM", 
    tipo: "Roscada macho (racor 2 piezas)",
    presion: "Max 25 bar / Salida establecida 3 bar",
    temperatura: "Max 80°C",
    descripcion: "Presión máx de func. 25bar. Campo de regulación 1 a 6 bar mediante volante graduado con indicador de presión. Filtro acero inox 304 de 500 micras. Conexión a manómetro 2 x 1/4\". Compatible con agua, soluciones de glicol (máximo 50%) y aire comprimido.",
    variantes: [
      {codigo: '04', medida: '1/2\"', precio: 131.81},
      {codigo: '05', medida: '3/4\"', precio: 143.09},
      {codigo: '06', medida: '1\"', precio: 192.28},
      {codigo: '07', medida: '1 1/4\"', precio: 228.23},
      {codigo: '08', medida: '1 1/2\"', precio: 385.53},
      {codigo: '09', medida: '2\"', precio: 499.57}
    ]
  },
  // VÁLVULAS FLOTANTES
  {
    articulo: "3886", 
    nombre: "VÁLVULA FLOTANTE INOX 304", 
    categoria: "Industrial", 
    material: "Acero Inoxidable AISI 304 / Cierre silicona", 
    tipo: "Rosca GAS ISO 288/1",
    presion: "10 kg/cm² (PN10)",
    descripcion: "Válvula de flotador construcción en acero inoxidable AISI 304. Debe añadirse Ref. 3887 Boya Inox 304.",
    variantes: [
      {codigo: '04', medida: '1/2\" (L=410 mm)', precio: 20.44},
      {codigo: '05', medida: '3/4\" (L=500 mm)', precio: 34.96},
      {codigo: '06', medida: '1\" (L=580 mm)', precio: 38.50},
      {codigo: '07', medida: '1 1/4\" (L=580 mm)', precio: 41.75}
    ]
  },
  {
    articulo: "3887", 
    nombre: "BOYA FLOTANTE INOX 304", 
    categoria: "Industrial", 
    material: "Acero Inoxidable AISI 304", 
    descripcion: "Boya para flotador. Construcción en acero inoxidable AISI 304.",
    variantes: [
      {codigo: '110', medida: '1/2\" (Ø110 mm)', precio: 20.65},
      {codigo: '160', medida: '3/4\" a 1 1/4\" (Ø160 mm)', precio: 44.84}
    ]
  },
  {
    articulo: "2856", 
    nombre: "VÁLVULA FLOTANTE INOX 316", 
    categoria: "Industrial", 
    material: "Acero Inoxidable AISI 316 / Cierre silicona", 
    tipo: "Rosca GAS DIN 2999",
    presion: "10 kg/cm²",
    descripcion: "Válvula de flotador sin boya construcción inox AISI 316. Debe añadirse Ref. 2852 Boya Inox 316.",
    variantes: [
      {codigo: '04', medida: '1/2\" (L=410 mm)', precio: 71.41},
      {codigo: '05', medida: '3/4\" (L=500 mm)', precio: 78.63},
      {codigo: '06', medida: '1\" (L=580 mm)', precio: 84.70},
      {codigo: '07', medida: '1 1/4\" (L=580 mm)', precio: 98.64},
      {codigo: '08', medida: '1 1/2\" (L=620 mm)', precio: 219.12},
      {codigo: '09', medida: '2\" (L=720 mm)', precio: 246.81},
      {codigo: '10', medida: '2 1/2\" (L=720 mm)', precio: 275.60}
    ]
  },
  {
    articulo: "2852", 
    nombre: "BOYA FLOTANTE INOX 316", 
    categoria: "Industrial", 
    material: "Acero Inoxidable AISI 316", 
    descripcion: "Boya para flotador. Construcción en acero inoxidable AISI 316.",
    variantes: [
      {codigo: '110', medida: '1/2\" (Ø110 mm)', precio: 30.04},
      {codigo: '160', medida: '3/4\" a 1 1/4\" (Ø160 mm)', precio: 62.44},
      {codigo: '200', medida: '1 1/2\" a 2 1/2\" (Ø200 mm)', precio: 149.73}
    ]
  },
  {
    articulo: "3028", 
    nombre: "VÁLVULA ESFERA LATÓN PASO TOTAL H-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP ISO 228/1 H-H",
    presion: "PN25",
    temperatura: "Max 110°C",
    descripcion: "Válvula esfera paso total latón cromado. Asientos PTFE. Palanca acero.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 4.16},
      {codigo: '03', medida: '3/8"', precio: 4.16},
      {codigo: '04', medida: '1/2"', precio: 4.24},
      {codigo: '05', medida: '3/4"', precio: 6.10},
      {codigo: '06', medida: '1"', precio: 10.32},
      {codigo: '07', medida: '1 1/4"', precio: 14.42},
      {codigo: '08', medida: '1 1/2"', precio: 24.80},
      {codigo: '09', medida: '2"', precio: 35.16},
      {codigo: '10', medida: '2 1/2"', precio: 74.90},
      {codigo: '11', medida: '3"', precio: 120.39},
      {codigo: '12', medida: '4"', precio: 187.04}
    ]
  },
  {
    articulo: "3029", 
    nombre: "VÁLVULA ESFERA LATÓN PASO TOTAL PESADA", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP H-H",
    presion: "PN25",
    descripcion: "Válvula esfera paso total latón pesada para grandes diámetros.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 91.85},
      {codigo: '11', medida: '3"', precio: 147.64},
      {codigo: '12', medida: '4"', precio: 225.73}
    ]
  },
  {
    articulo: "3023", 
    nombre: "VÁLVULA ESFERA LATÓN ISO-5211", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP H-H",
    presion: "PN40",
    tipo: "Para actuador ISO-5211",
    descripcion: "Válvula esfera latón con conexión para actuador neumático/eléctrico.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 14.69},
      {codigo: '05', medida: '3/4"', precio: 21.73},
      {codigo: '06', medida: '1"', precio: 32.26},
      {codigo: '07', medida: '1 1/4"', precio: 54.87},
      {codigo: '08', medida: '1 1/2"', precio: 78.08},
      {codigo: '09', medida: '2"', precio: 127.77}
    ]
  },
  {
    articulo: "3034", 
    nombre: "VÁLVULA ESFERA LATÓN M-H PALANCA", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP M-H",
    presion: "PN25",
    descripcion: "Válvula esfera latón macho-hembra con palanca acero.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 4.79},
      {codigo: '03', medida: '3/8"', precio: 4.79},
      {codigo: '04', medida: '1/2"', precio: 5.78},
      {codigo: '05', medida: '3/4"', precio: 8.30},
      {codigo: '06', medida: '1"', precio: 14.25}
    ]
  },
  {
    articulo: "3036", 
    nombre: "VÁLVULA ESFERA LATÓN M-H MARIPOSA", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP M-H",
    presion: "PN25",
    descripcion: "Válvula esfera latón macho-hembra con maneta mariposa azul.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 4.91},
      {codigo: '03', medida: '3/8"', precio: 4.91},
      {codigo: '04', medida: '1/2"', precio: 6.07},
      {codigo: '05', medida: '3/4"', precio: 9.70},
      {codigo: '06', medida: '1"', precio: 14.63}
    ]
  },
  {
    articulo: "3046", 
    nombre: "VÁLVULA ESFERA LATÓN CON RACOR", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP M-H",
    presion: "PN25",
    descripcion: "Válvula esfera latón con racor media unión desmontable.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 8.22},
      {codigo: '05', medida: '3/4"', precio: 13.47},
      {codigo: '06', medida: '1"', precio: 20.91},
      {codigo: '07', medida: '1 1/4"', precio: 32.60}
    ]
  },
  {
    articulo: "3096", 
    nombre: "VÁLVULA ESFERA MINI LATÓN H-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP H-H",
    presion: "PN16",
    descripcion: "Válvula esfera mini latón hembra-hembra. Maneta mariposa azul.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 3.50},
      {codigo: '02', medida: '1/4"', precio: 3.50},
      {codigo: '03', medida: '3/8"', precio: 4.01},
      {codigo: '04', medida: '1/2"', precio: 5.33}
    ]
  },
  {
    articulo: "3097", 
    nombre: "VÁLVULA ESFERA MINI LATÓN M-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    rosca: "BSP M-H",
    presion: "PN16",
    descripcion: "Válvula esfera mini latón macho-hembra. Maneta mariposa azul.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 3.32},
      {codigo: '02', medida: '1/4"', precio: 3.50},
      {codigo: '03', medida: '3/8"', precio: 4.01},
      {codigo: '04', medida: '1/2"', precio: 5.33}
    ]
  },
  // 3 VÍAS LATÓN
  {
    articulo: "3070", 
    nombre: "VÁLVULA ESFERA LATÓN 3 VÍAS TIPO L", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 niquelado", 
    rosca: "BSP H-H",
    presion: "PN25",
    tipo: "3 vías L",
    temperatura: "Max 120°C",
    descripcion: "Válvula 3 vías latón tipo L para desvío de flujo.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 45.92},
      {codigo: '05', medida: '3/4"', precio: 70.31},
      {codigo: '06', medida: '1"', precio: 102.97},
      {codigo: '07', medida: '1 1/4"', precio: 158.22},
      {codigo: '08', medida: '1 1/2"', precio: 219.53},
      {codigo: '09', medida: '2"', precio: 336.59}
    ]
  },
  {
    articulo: "3080", 
    nombre: "VÁLVULA ESFERA LATÓN 3 VÍAS TIPO T", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 niquelado", 
    rosca: "BSP H-H",
    presion: "PN25",
    tipo: "3 vías T",
    temperatura: "Max 120°C",
    descripcion: "Válvula 3 vías latón tipo T para mezcla de flujos.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 45.92},
      {codigo: '05', medida: '3/4"', precio: 70.31},
      {codigo: '06', medida: '1"', precio: 102.97},
      {codigo: '07', medida: '1 1/4"', precio: 158.22},
      {codigo: '08', medida: '1 1/2"', precio: 219.53},
      {codigo: '09', medida: '2"', precio: 336.59}
    ]
  },
  {
    articulo: "3272E", 
    nombre: "VÁLVULA ESFERA LATÓN 3 VÍAS ISO-5211 TIPO L", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    tipo: "3 vías L - ISO 5211",
    presion: "PN25",
    descripcion: "Válvula 3 vías con brida montaje para actuador.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 31.74},
      {codigo: '05', medida: '3/4"', precio: 48.93},
      {codigo: '06', medida: '1"', precio: 76.80}
    ]
  },
  {
    articulo: "3282E", 
    nombre: "VÁLVULA ESFERA LATÓN 3 VÍAS ISO-5211 TIPO T", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165 cromado", 
    tipo: "3 vías T - ISO 5211",
    presion: "PN25",
    descripcion: "Válvula 3 vías tipo T con brida montaje para actuador.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 31.74},
      {codigo: '05', medida: '3/4"', precio: 48.93},
      {codigo: '06', medida: '1"', precio: 76.80}
    ]
  },
  // VÁLVULAS GAS
  {
    articulo: "3064", 
    nombre: "VÁLVULA ESFERA GAS LATÓN", 
    categoria: "Hidrosanitaria", 
    material: "Latón UNE-EN 12165", 
    rosca: "BSP H-H",
    presion: "PN5",
    descripcion: "Válvula esfera para instalaciones de gas. Maneta amarilla.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 8.40},
      {codigo: '05', medida: '3/4"', precio: 11.55},
      {codigo: '06', medida: '1"', precio: 18.90},
      {codigo: '07', medida: '1 1/4"', precio: 31.50},
      {codigo: '08', medida: '1 1/2"', precio: 52.50},
      {codigo: '09', medida: '2"', precio: 78.75}
    ]
  },

  // ============ ELECTROVÁLVULAS ============
  {
    articulo: "4010", 
    nombre: "ELECTROVÁLVULA ACCIÓN MIXTA NC 2 VÍAS LATÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0-14 bar",
    descripcion: "Electroválvula acción mixta normal cerrada. Diafragma NBR+PA. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 82.64},
      {codigo: '04', medida: '1/2"', precio: 85.75},
      {codigo: '05', medida: '3/4"', precio: 85.75},
      {codigo: '06', medida: '1"', precio: 132.34}
    ]
  },
  {
    articulo: "4010V", 
    nombre: "ELECTROVÁLVULA ACCIÓN MIXTA NC LATÓN VITÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0-16 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula acción mixta con diafragma Vitón para alta temperatura.",
    variantes: [
      {codigo: '07', medida: '1 1/4"', precio: 263.10},
      {codigo: '08', medida: '1 1/2"', precio: 277.80}
    ]
  },
  {
    articulo: "4020", 
    nombre: "ELECTROVÁLVULA ACCIÓN INDIRECTA NC LATÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0.2-16 bar",
    descripcion: "Electroválvula acción indirecta normal cerrada. Diafragma BUNA.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 67.95},
      {codigo: '04', medida: '1/2"', precio: 67.95},
      {codigo: '05', medida: '3/4"', precio: 112.56},
      {codigo: '06', medida: '1"', precio: 124.85},
      {codigo: '07', medida: '1 1/4"', precio: 259.32},
      {codigo: '08', medida: '1 1/2"', precio: 275.17},
      {codigo: '09', medida: '2"', precio: 328.83}
    ]
  },
  {
    articulo: "4021", 
    nombre: "ELECTROVÁLVULA ACCIÓN INDIRECTA NC LATÓN VITÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0.2-16 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula acción indirecta con diafragma Vitón.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 88.62},
      {codigo: '04', medida: '1/2"', precio: 88.62},
      {codigo: '05', medida: '3/4"', precio: 133.18},
      {codigo: '06', medida: '1"', precio: 147.89},
      {codigo: '07', medida: '1 1/4"', precio: 304.89},
      {codigo: '08', medida: '1 1/2"', precio: 326.01},
      {codigo: '09', medida: '2"', precio: 384.26}
    ]
  },
  {
    articulo: "4630", 
    nombre: "ELECTROVÁLVULA ACCIÓN DIRECTA NC INOX 316", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Inox 316 / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0-10 bar (8W) / 0-25 bar (14W)",
    temperatura: "Max 180°C",
    descripcion: "Electroválvula acción directa inox. Obturador PTFE.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 125.44}
    ]
  },
  {
    articulo: "4631", 
    nombre: "ELECTROVÁLVULA ACCIÓN MIXTA NC INOX 316", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Inox 316 / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0-14 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula acción mixta inox. Diafragma Vitón.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 225.09},
      {codigo: '05', medida: '3/4"', precio: 281.33},
      {codigo: '06', medida: '1"', precio: 363.93}
    ]
  },
  {
    articulo: "4632", 
    nombre: "ELECTROVÁLVULA ACCIÓN INDIRECTA NC INOX 316", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Inox 316 / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0.1-20 bar (1/2\") / 0.1-16 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula acción indirecta inox alta presión.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 408.77},
      {codigo: '05', medida: '3/4"', precio: 631.54},
      {codigo: '06', medida: '1"', precio: 631.54}
    ]
  },
  {
    articulo: "4030", 
    nombre: "ELECTROVÁLVULA ACCIÓN DIRECTA NC LATÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0-14 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula acción directa compacta. Obturador Vitón.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 54.01},
      {codigo: '02', medida: '1/4"', precio: 54.01}
    ]
  },
  {
    articulo: "4320", 
    nombre: "ELECTROVÁLVULA ACCIÓN DIRECTA NC 3 VÍAS LATÓN", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - 3 vías",
    presion: "0-6 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula 3 vías acción directa.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 57.96},
      {codigo: '02', medida: '1/4"', precio: 57.96}
    ]
  },
  {
    articulo: "46303", 
    nombre: "ELECTROVÁLVULA ACCIÓN DIRECTA NC 3 VÍAS INOX", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Inox 316 / Núcleo Inox", 
    tipo: "Normal Cerrada - 3 vías",
    presion: "0-5 bar",
    temperatura: "Max 140°C",
    descripcion: "Electroválvula 3 vías acción directa inox.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 132.16}
    ]
  },
  {
    articulo: "4052", 
    nombre: "ELECTROVÁLVULA PARA VAPOR NC", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Latón / Núcleo Inox", 
    tipo: "Normal Cerrada - Para Vapor",
    presion: "0.5-10 bar",
    temperatura: "Max 180°C",
    descripcion: "Electroválvula especial para vapor. Pistón inox con PTFE.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 139.89},
      {codigo: '05', medida: '3/4"', precio: 180.77},
      {codigo: '06', medida: '1"', precio: 272.93},
      {codigo: '07', medida: '1 1/4"', precio: 522.11},
      {codigo: '08', medida: '1 1/2"', precio: 612.86},
      {codigo: '09', medida: '2"', precio: 768.73}
    ]
  },
  {
    articulo: "4046", 
    nombre: "ELECTROVÁLVULA AGUA/AIRE NC", 
    categoria: "Electroválvulas", 
    material: "Cuerpo Plástico", 
    tipo: "Normal Cerrada - 2 vías",
    presion: "0.2-10 bar",
    descripcion: "Electroválvula económica para agua y aire.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 22.37},
      {codigo: '05', medida: '3/4"', precio: 29.99}
    ]
  },

  // ============ INCENDIO ============
  {
    articulo: "2120", 
    nombre: "VÁLVULA MARIPOSA INCENDIO RANURADA", 
    categoria: "Incendio", 
    material: "Cuerpo GGG-40 / Disco Fundición + EPDM", 
    tipo: "Extremos ranurados AWWA C606",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa para sistemas de incendio. Diseño API 609. Palanca hasta 8\", reductor desde 10\".",
    variantes: [
      {codigo: '09', medida: '2"', precio: 100.52},
      {codigo: '10', medida: '2 1/2"', precio: 110.17},
      {codigo: '11', medida: '3"', precio: 118.01},
      {codigo: '12', medida: '4"', precio: 143.77},
      {codigo: '13', medida: '5"', precio: 190.25},
      {codigo: '14', medida: '6"', precio: 218.41},
      {codigo: '16', medida: '8"', precio: 363.00},
      {codigo: '18', medida: '10"', precio: 696.00},
      {codigo: '20', medida: '12"', precio: 1135.23}
    ]
  },
  {
    articulo: "2113", 
    nombre: "VÁLVULA MARIPOSA INCENDIO WAFER CON MICRO", 
    categoria: "Incendio", 
    material: "Cuerpo GGG-40 / Disco Fundición + EPDM", 
    tipo: "Wafer con microrruptor",
    presion: "300 PSI",
    descripcion: "Válvula mariposa wafer con reductor manual y microrruptor final de carrera. Certificación UL/FM.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 191.40},
      {codigo: '11', medida: '3"', precio: 197.59},
      {codigo: '12', medida: '4"', precio: 225.26},
      {codigo: '13', medida: '5"', precio: 248.74},
      {codigo: '14', medida: '6"', precio: 281.66},
      {codigo: '16', medida: '8"', precio: 423.67}
    ]
  },
  {
    articulo: "2114", 
    nombre: "VÁLVULA MARIPOSA INCENDIO RANURADA CON MICRO", 
    categoria: "Incendio", 
    material: "Cuerpo GGG-40 / Disco Fundición + EPDM", 
    tipo: "Ranurada con microrruptor",
    presion: "300 PSI",
    descripcion: "Válvula mariposa ranurada con reductor y microrruptor. Certificación UL/FM.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 194.40},
      {codigo: '11', medida: '3"', precio: 201.58},
      {codigo: '12', medida: '4"', precio: 225.23},
      {codigo: '13', medida: '5"', precio: 267.80},
      {codigo: '14', medida: '6"', precio: 302.17},
      {codigo: '16', medida: '8"', precio: 433.39}
    ]
  },
  {
    articulo: "2094", 
    nombre: "VÁLVULA COMPUERTA INCENDIO BRIDADA", 
    categoria: "Incendio", 
    material: "Cuerpo y Bonete GGG-40", 
    tipo: "Bridada ANSI B16.1",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula compuerta cierre EPDM bridada. Husillo ascendente. Certificación UL/FM.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 347.74},
      {codigo: '11', medida: '3"', precio: 397.74},
      {codigo: '12', medida: '4"', precio: 500.78},
      {codigo: '13', medida: '5"', precio: 713.33},
      {codigo: '14', medida: '6"', precio: 810.32},
      {codigo: '16', medida: '8"', precio: 1285.68},
      {codigo: '18', medida: '10"', precio: 1846.44},
      {codigo: '20', medida: '12"', precio: 2563.00}
    ]
  },
  {
    articulo: "2100", 
    nombre: "VÁLVULA COMPUERTA INCENDIO RANURADA", 
    categoria: "Incendio", 
    material: "Cuerpo y Bonete GGG-40", 
    tipo: "Ranurada AWWA C515",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula compuerta cierre EPDM ranurada. Husillo ascendente. Certificación UL/FM.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 333.80},
      {codigo: '11', medida: '3"', precio: 381.79},
      {codigo: '12', medida: '4"', precio: 480.79},
      {codigo: '13', medida: '5"', precio: 684.75},
      {codigo: '14', medida: '6"', precio: 777.87},
      {codigo: '16', medida: '8"', precio: 1234.29},
      {codigo: '18', medida: '10"', precio: 1772.57},
      {codigo: '20', medida: '12"', precio: 2460.48}
    ]
  },
  {
    articulo: "2403", 
    nombre: "VÁLVULA RETENCIÓN INCENDIO BRIDADA", 
    categoria: "Incendio", 
    material: "Cuerpo y Tapa GGG-40", 
    tipo: "Bridada ANSI B16.1 - Disco oscilante",
    presion: "300 PSI",
    descripcion: "Válvula de retención disco oscilante bridada. Asiento EPDM. Certificación UL/FM.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 265.46},
      {codigo: '10', medida: '2 1/2"', precio: 343.70},
      {codigo: '11', medida: '3"', precio: 415.36},
      {codigo: '12', medida: '4"', precio: 518.63},
      {codigo: '13', medida: '5"', precio: 768.93},
      {codigo: '14', medida: '6"', precio: 875.74},
      {codigo: '16', medida: '8"', precio: 1390.90}
    ]
  },
  // ============ HIDROSANITARIA - VÁLVULAS LATÓN ============
  {
    articulo: "3023", 
    nombre: "VÁLVULA DE ESFERA PARA MONTAJE ACTUADOR PN 40. PASO TOTAL", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 20.34},
      {codigo: '05', medida: '3/4"', precio: 30.11},
      {codigo: '06', medida: '1"', precio: 44.64},
      {codigo: '07', medida: '1 1/4"', precio: 75.85},
      {codigo: '08', medida: '1 1/2"', precio: 107.93},
      {codigo: '09', medida: '2"', precio: 176.62}
    ]
  },
  {
    articulo: "3028", 
    nombre: "VÁLVULA ESFERA PN 25. PASO ESTÁNDAR", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 6.06},
      {codigo: '05', medida: '3/4"', precio: 8.71},
      {codigo: '06', medida: '1"', precio: 14.7},
      {codigo: '07', medida: '1 1/4"', precio: 19.88},
      {codigo: '08', medida: '1 1/2"', precio: 34.22},
      {codigo: '09', medida: '2"', precio: 48.51},
      {codigo: '10', medida: '2 1/2"', precio: 106.71},
      {codigo: '11', medida: '3"', precio: 171.53},
      {codigo: '12', medida: '4"', precio: 266.48}
    ]
  },
  {
    articulo: "3029", 
    nombre: "VÁLVULA ESFERA PN 25. PASO TOTAL", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 5.93},
      {codigo: '03', medida: '3/8"', precio: 5.93},
      {codigo: '10', medida: '2 1/2"', precio: 125.42},
      {codigo: '11', medida: '3"', precio: 201.61},
      {codigo: '12', medida: '4"', precio: 308.27}
    ]
  },
  {
    articulo: "3034", 
    nombre: "VÁLVULA DE ESFERA LATÓN H-H PN 25. PASO TOTAL", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 6.83},
      {codigo: '03', medida: '3/8"', precio: 6.83},
      {codigo: '04', medida: '1/2"', precio: 8.21},
      {codigo: '05', medida: '3/4"', precio: 13.57},
      {codigo: '06', medida: '1"', precio: 20.06},
      {codigo: '07', medida: '1 1/4"', precio: 31.31},
      {codigo: '08', medida: '1 1/2"', precio: 45.5},
      {codigo: '09', medida: '2"', precio: 68.14}
    ]
  },
  {
    articulo: "3035", 
    nombre: "VÁLVULA DE ESFERA LATÓN M-H PN 25. PASO TOTAL", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 6.37},
      {codigo: '03', medida: '3/8"', precio: 6.37},
      {codigo: '04', medida: '1/2"', precio: 7.85},
      {codigo: '05', medida: '3/4"', precio: 12.77},
      {codigo: '06', medida: '1"', precio: 19.4}
    ]
  },
  {
    articulo: "3036", 
    nombre: "VÁLVULA DE ESFERA LATÓN MARIPOSA M-H PN 25. PASO TOTAL", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 6.69},
      {codigo: '03', medida: '3/8"', precio: 6.69},
      {codigo: '04', medida: '1/2"', precio: 8.28},
      {codigo: '05', medida: '3/4"', precio: 13.25},
      {codigo: '06', medida: '1"', precio: 19.98}
    ]
  },
  {
    articulo: "3044", 
    nombre: "VÁLVULA DE DESCARGA PARA CALDERA PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.37}
    ]
  },
  {
    articulo: "3046", 
    nombre: "VÁLVULA ESFERA CON RACOR MEDIA UNIÓN PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 11.54},
      {codigo: '05', medida: '3/4"', precio: 18.93},
      {codigo: '06', medida: '1"', precio: 29.39},
      {codigo: '07', medida: '1 1/4"', precio: 45.39}
    ]
  },
  {
    articulo: "3056", 
    nombre: "VÁLVULA DE ESFERA EMPOTRAR ROSCA GAS PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 11.44},
      {codigo: '05', medida: '3/4"', precio: 15.94},
      {codigo: '06', medida: '1"', precio: 25.16}
    ]
  },
  {
    articulo: "3059", 
    nombre: "VÁLVULA DE ESFERA PARA MANGUERA PN 16", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 8.17},
      {codigo: '05', medida: '3/4"', precio: 10.94},
      {codigo: '06', medida: '1"', precio: 17.09}
    ]
  },
  {
    articulo: "3060", 
    nombre: "VÁLVULA DE ESFERA PARA MANGUERA RAPID-GE PN 16", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 13.35},
      {codigo: '05', medida: '3/4"', precio: 17.45},
      {codigo: '06', medida: '1"', precio: 22.09}
    ]
  },
  {
    articulo: "3061", 
    nombre: "VÁLVULA PARA MANGUERA 2 SALIDAS 360°", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 36.2}
    ]
  },
  {
    articulo: "3062", 
    nombre: "VÁLVULA MANGUERA 2 SALIDAS INDEPENDIENTES", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 21.03}
    ]
  },
  {
    articulo: "3064", 
    nombre: "VÁLVULA ESFERA BOCA RIEGO VERTICAL LATÓN", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 18.56},
      {codigo: '05', medida: '3/4"', precio: 23.11},
      {codigo: '06', medida: '1"', precio: 32.28}
    ]
  },
  {
    articulo: "3070", 
    nombre: "VÁLVULA ESFERA 3 VÍAS TIPO L PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 64.53},
      {codigo: '05', medida: '3/4"', precio: 98.83},
      {codigo: '06', medida: '1"', precio: 144.73},
      {codigo: '07', medida: '1 1/4"', precio: 222.37},
      {codigo: '08', medida: '1 1/2"', precio: 308.56},
      {codigo: '09', medida: '2"', precio: 473.1}
    ]
  },
  {
    articulo: "3075", 
    nombre: "VÁLVULA DE ESFERA ESCUADRA M-H CON RACOR PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 24.79},
      {codigo: '06', medida: '1"', precio: 37.13}
    ]
  },
  {
    articulo: "3080", 
    nombre: "VÁLVULA ESFERA 3 VÍAS TIPO T PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 64.53},
      {codigo: '05', medida: '3/4"', precio: 98.83},
      {codigo: '06', medida: '1"', precio: 144.73},
      {codigo: '07', medida: '1 1/4"', precio: 222.37},
      {codigo: '08', medida: '1 1/2"', precio: 308.56},
      {codigo: '09', medida: '2"', precio: 473.1}
    ]
  },
  {
    articulo: "3086", 
    nombre: "VÁLVULA ESFERA MINI M-M", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 5.7},
      {codigo: '03', medida: '3/8"', precio: 5.84}
    ]
  },
  {
    articulo: "3091", 
    nombre: "VÁLVULA ESFERA ESCUADRA LAVADORA LATÓN", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.54}
    ]
  },
  {
    articulo: "3092", 
    nombre: "VÁLVULA MIXTA LAVADORA - LAVABO", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 18.0}
    ]
  },
  {
    articulo: "3094", 
    nombre: "VÁLVULA ESCUADRA ISIS", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 5.78},
      {codigo: '04', medida: '1/2"', precio: 6.04}
    ]
  },
  {
    articulo: "3095", 
    nombre: "VÁLVULA ESCUADRA M-M CON FILTRO", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 6.57},
      {codigo: '04', medida: '1/2"', precio: 6.96}
    ]
  },
  {
    articulo: "3096", 
    nombre: "VÁLVULA ESFÉRICA MINI H-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 4.97},
      {codigo: '02', medida: '1/4"', precio: 4.97},
      {codigo: '03', medida: '3/8"', precio: 5.67},
      {codigo: '04', medida: '1/2"', precio: 7.28}
    ]
  },
  {
    articulo: "3097", 
    nombre: "VÁLVULA ESFÉRICA MINI M-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 4.69},
      {codigo: '02', medida: '1/4"', precio: 4.97},
      {codigo: '03', medida: '3/8"', precio: 5.67},
      {codigo: '04', medida: '1/2"', precio: 7.28}
    ]
  },
  {
    articulo: "3104", 
    nombre: "VÁLVULA ESCUADRA REDONDA TAU", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 14.84}
    ]
  },
  {
    articulo: "3106", 
    nombre: "VÁLVULA ESCUADRA CUADRADA CUBIK", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 20.84}
    ]
  },
  {
    articulo: "3109", 
    nombre: "VÁLVULA ESCUADRA DOBLE REDONDA TAU", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 22.18}
    ]
  },
  {
    articulo: "3121", 
    nombre: "VÁLVULA DE RETENCIÓN REGE PN 25/12", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 7.32},
      {codigo: '05', medida: '3/4"', precio: 10.78},
      {codigo: '06', medida: '1"', precio: 15.83},
      {codigo: '07', medida: '1 1/4"', precio: 22.06},
      {codigo: '08', medida: '1 1/2"', precio: 31.44},
      {codigo: '09', medida: '2"', precio: 47.72},
      {codigo: '10', medida: '2 1/2"', precio: 103.83},
      {codigo: '11', medida: '3"', precio: 148.1},
      {codigo: '12', medida: '4"', precio: 230.98}
    ]
  },
  {
    articulo: "3190", 
    nombre: "VÁLVULA DE ALIVIO DE PRESIÓN PN 16", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 54.0},
      {codigo: '05', medida: '3/4"', precio: 73.82},
      {codigo: '06', medida: '1"', precio: 98.42},
      {codigo: '07', medida: '1 1/4"', precio: 152.42},
      {codigo: '08', medida: '1 1/2"', precio: 186.94},
      {codigo: '09', medida: '2"', precio: 267.99},
      {codigo: '10', medida: '2 1/2"', precio: 854.41},
      {codigo: '11', medida: '3"', precio: 1033.65},
      {codigo: '12', medida: '4"', precio: 2012.59}
    ]
  },
  {
    articulo: "3193", 
    nombre: "VÁLVULA DE SEGURIDAD Y RETENCIÓN", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 6.04}
    ]
  },
  {
    articulo: "3194", 
    nombre: "VÁLVULA DE ALIVIO DE PRESIÓN 8 BAR", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 13.07}
    ]
  },
  {
    articulo: "3220", 
    nombre: "VÁLVULA DE COMPUERTA LATÓN PN 16", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.69},
      {codigo: '05', medida: '3/4"', precio: 12.03},
      {codigo: '06', medida: '1"', precio: 17.62},
      {codigo: '07', medida: '1 1/4"', precio: 26.14},
      {codigo: '08', medida: '1 1/2"', precio: 35.65},
      {codigo: '09', medida: '2"', precio: 62.37},
      {codigo: '10', medida: '2 1/2"', precio: 106.21},
      {codigo: '11', medida: '3"', precio: 150.08},
      {codigo: '12', medida: '4"', precio: 272.22}
    ]
  },
  {
    articulo: "3272", 
    nombre: "VÁLVULA DE ESFERA 3 VÍAS ACTUADOR TIPO L PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 45.05},
      {codigo: '05', medida: '3/4"', precio: 69.44},
      {codigo: '06', medida: '1"', precio: 108.99}
    ]
  },
  {
    articulo: "3282", 
    nombre: "VÁLVULA DE ESFERA 3 VÍAS ACTUADOR TIPO T PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 45.05},
      {codigo: '05', medida: '3/4"', precio: 69.44},
      {codigo: '06', medida: '1"', precio: 108.99}
    ]
  },
  {
    articulo: "3302", 
    nombre: "FILTRO COLADOR TIPO Y LATÓN PN 16", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 7.07},
      {codigo: '05', medida: '3/4"', precio: 10.7},
      {codigo: '06', medida: '1"', precio: 15.84},
      {codigo: '07', medida: '1 1/4"', precio: 31.92},
      {codigo: '08', medida: '1 1/2"', precio: 42.29},
      {codigo: '09', medida: '2"', precio: 70.12},
      {codigo: '11', medida: '3"', precio: 169.81},
      {codigo: '12', medida: '4"', precio: 321.73}
    ]
  },
  {
    articulo: "3310", 
    nombre: "FILTRO POLIVALENTE PARA AGUA 800U", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.44},
      {codigo: '05', medida: '3/4"', precio: 15.58},
      {codigo: '06', medida: '1"', precio: 24.08},
      {codigo: '07', medida: '1 1/4"', precio: 45.42},
      {codigo: '08', medida: '1 1/2"', precio: 66.8},
      {codigo: '09', medida: '2"', precio: 106.01}
    ]
  },
  {
    articulo: "3311", 
    nombre: "FILTRO POLIVALENTE PARA GASOIL 300U", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.63},
      {codigo: '05', medida: '3/4"', precio: 15.89},
      {codigo: '06', medida: '1"', precio: 24.49},
      {codigo: '07', medida: '1 1/4"', precio: 46.74},
      {codigo: '08', medida: '1 1/2"', precio: 69.38},
      {codigo: '09', medida: '2"', precio: 108.83}
    ]
  },
  {
    articulo: "3312", 
    nombre: "FILTRO POLIVALENTE PARA GAS 100U", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.63},
      {codigo: '05', medida: '3/4"', precio: 15.89},
      {codigo: '06', medida: '1"', precio: 24.49},
      {codigo: '07', medida: '1 1/4"', precio: 47.49},
      {codigo: '08', medida: '1 1/2"', precio: 70.57},
      {codigo: '09', medida: '2"', precio: 110.59}
    ]
  },
  {
    articulo: "3318", 
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN REDUX-GE PN 25", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 47.45},
      {codigo: '05', medida: '3/4"', precio: 52.9},
      {codigo: '06', medida: '1"', precio: 96.55},
      {codigo: '07', medida: '1 1/4"', precio: 151.45},
      {codigo: '08', medida: '1 1/2"', precio: 188.66},
      {codigo: '09', medida: '2"', precio: 248.64},
      {codigo: '10', medida: '2 1/2"', precio: 894.82},
      {codigo: '11', medida: '3"', precio: 1188.53},
      {codigo: '12', medida: '4"', precio: 2084.73}
    ]
  },
  {
    articulo: "3780", 
    nombre: "PRESÓSTATO PRESIÓN 4 KGS", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 14.09}
    ]
  },
  {
    articulo: "3781", 
    nombre: "PRESÓSTATO PRESIÓN 10 KGS", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 18.05}
    ]
  },
  {
    articulo: "3886", 
    nombre: "VÁLVULA DE FLOTADOR SIN BOYA", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 27.63},
      {codigo: '05', medida: '3/4"', precio: 47.26},
      {codigo: '06', medida: '1"', precio: 52.06},
      {codigo: '07', medida: '1 1/4"', precio: 56.44}
    ]
  },
  {
    articulo: "5090", 
    nombre: "VÁLVULA ESFERA BRONCE PASO TOTAL IDEAL H-H", 
    categoria: "Hidrosanitaria", 
    material: "Bronce",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 8.45},
      {codigo: '03', medida: '3/8"', precio: 8.6},
      {codigo: '10', medida: '2 1/2"', precio: 205.6},
      {codigo: '11', medida: '3"', precio: 320.05},
      {codigo: '12', medida: '4"', precio: 522.67}
    ]
  },
  {
    articulo: "5100", 
    nombre: "VÁLVULA DE RETENCIÓN EUROPA PN 25/18/12", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 13.33},
      {codigo: '05', medida: '3/4"', precio: 18.01},
      {codigo: '06', medida: '1"', precio: 24.61},
      {codigo: '07', medida: '1 1/4"', precio: 38.63},
      {codigo: '08', medida: '1 1/2"', precio: 52.33},
      {codigo: '09', medida: '2"', precio: 80.37},
      {codigo: '10', medida: '2 1/2"', precio: 186.16},
      {codigo: '11', medida: '3"', precio: 276.74},
      {codigo: '12', medida: '4"', precio: 462.93}
    ]
  },
  {
    articulo: "5103", 
    nombre: "VÁLVULA DE RETENCIÓN YORK PN 12/10/8", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.41},
      {codigo: '05', medida: '3/4"', precio: 12.92},
      {codigo: '06', medida: '1"', precio: 16.56},
      {codigo: '07', medida: '1 1/4"', precio: 24.57},
      {codigo: '08', medida: '1 1/2"', precio: 36.57},
      {codigo: '09', medida: '2"', precio: 50.29},
      {codigo: '10', medida: '2 1/2"', precio: 94.5},
      {codigo: '11', medida: '3"', precio: 132.17},
      {codigo: '12', medida: '4"', precio: 230.91}
    ]
  },
  {
    articulo: "5104", 
    nombre: "VÁLVULA DE RETENCIÓN ROMA LATÓN", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 20.64},
      {codigo: '05', medida: '3/4"', precio: 25.79},
      {codigo: '06', medida: '1"', precio: 35.09},
      {codigo: '09', medida: '2"', precio: 100.7}
    ]
  },
  {
    articulo: "5116", 
    nombre: "VÁLVULA ESFÉRICA LATÓN NIQUELADO H-H", 
    categoria: "Hidrosanitaria", 
    material: "Latón niquelado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 9.34},
      {codigo: '05', medida: '3/4"', precio: 13.87},
      {codigo: '06', medida: '1"', precio: 20.66},
      {codigo: '09', medida: '2"', precio: 77.61}
    ]
  },
  {
    articulo: "5130", 
    nombre: "VÁLVULA DE RETENCIÓN CLAPETA GOMA PN 12/8", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 12.62},
      {codigo: '05', medida: '3/4"', precio: 17.38},
      {codigo: '06', medida: '1"', precio: 25.57},
      {codigo: '07', medida: '1 1/4"', precio: 38.08},
      {codigo: '08', medida: '1 1/2"', precio: 49.59},
      {codigo: '09', medida: '2"', precio: 69.47},
      {codigo: '10', medida: '2 1/2"', precio: 139.4},
      {codigo: '11', medida: '3"', precio: 192.19},
      {codigo: '12', medida: '4"', precio: 346.92}
    ]
  },
  {
    articulo: "5362", 
    nombre: "PURGADOR AUTOMÁTICO DE AIRE", 
    categoria: "Hidrosanitaria", 
    material: "Latón cromado",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 12.39},
      {codigo: '04', medida: '1/2"', precio: 14.52}
    ]
  },
  // ============ ELECTROVÁLVULAS ============
  // NORMAL CERRADA - 2 VÍAS
  {
    articulo: "4010", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN MIXTA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Mixta",
    descripcion: "Electroválvula 2 vías NC. Diafragma NBR+PA. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 82.64},
      {codigo: '04', medida: '1/2"', precio: 85.75},
      {codigo: '05', medida: '3/4"', precio: 85.75},
      {codigo: '06', medida: '1"', precio: 132.34}
    ]
  },
  {
    articulo: "4010V", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN MIXTA VITON", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Mixta - Viton",
    descripcion: "Electroválvula 2 vías NC. Diafragma y Núcleo Móvil Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '07', medida: '1 1/4"', precio: 263.10},
      {codigo: '08', medida: '1 1/2"', precio: 277.80}
    ]
  },
  {
    articulo: "4020", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN INDIRECTA BUNA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Indirecta - BUNA",
    descripcion: "Electroválvula 2 vías NC acción indirecta. Obturador BUNA. Temp. máx 90°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 67.95},
      {codigo: '04', medida: '1/2"', precio: 67.95},
      {codigo: '05', medida: '3/4"', precio: 112.56},
      {codigo: '06', medida: '1"', precio: 124.85},
      {codigo: '07', medida: '1 1/4"', precio: 259.32},
      {codigo: '08', medida: '1 1/2"', precio: 275.17},
      {codigo: '09', medida: '2"', precio: 381.08}
    ]
  },
  {
    articulo: "4020V", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN INDIRECTA VITON", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Indirecta - Viton",
    descripcion: "Electroválvula 2 vías NC acción indirecta. Obturador Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 68.85},
      {codigo: '04', medida: '1/2"', precio: 68.85},
      {codigo: '05', medida: '3/4"', precio: 123.03},
      {codigo: '06', medida: '1"', precio: 135.91},
      {codigo: '07', medida: '1 1/4"', precio: 291.06},
      {codigo: '08', medida: '1 1/2"', precio: 306.95},
      {codigo: '09', medida: '2"', precio: 446.15}
    ]
  },
  {
    articulo: "4020E", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN INDIRECTA EPDM", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Indirecta - EPDM",
    descripcion: "Electroválvula 2 vías NC acción indirecta. Obturador EPDM. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 123.03},
      {codigo: '06', medida: '1"', precio: 135.91},
      {codigo: '07', medida: '1 1/4"', precio: 291.06},
      {codigo: '08', medida: '1 1/2"', precio: 306.92},
      {codigo: '09', medida: '2"', precio: 446.15}
    ]
  },
  // NORMAL ABIERTA - 2 VÍAS
  {
    articulo: "4021", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN INDIRECTA BUNA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Indirecta - BUNA",
    descripcion: "Electroválvula 2 vías NA acción indirecta. Obturador BUNA. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 94.47},
      {codigo: '04', medida: '1/2"', precio: 94.47},
      {codigo: '05', medida: '3/4"', precio: 133.18},
      {codigo: '06', medida: '1"', precio: 145.50},
      {codigo: '07', medida: '1 1/4"', precio: 279.93},
      {codigo: '08', medida: '1 1/2"', precio: 295.82},
      {codigo: '09', medida: '2"', precio: 401.59}
    ]
  },
  {
    articulo: "4021V", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN INDIRECTA VITON", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Indirecta - Viton",
    descripcion: "Electroválvula 2 vías NA acción indirecta. Obturador Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '03', medida: '3/8"', precio: 96.01},
      {codigo: '04', medida: '1/2"', precio: 96.01},
      {codigo: '05', medida: '3/4"', precio: 143.64},
      {codigo: '06', medida: '1"', precio: 156.52},
      {codigo: '07', medida: '1 1/4"', precio: 311.78},
      {codigo: '08', medida: '1 1/2"', precio: 327.50},
      {codigo: '09', medida: '2"', precio: 466.80}
    ]
  },
  {
    articulo: "4021E", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN INDIRECTA EPDM", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Indirecta - EPDM",
    descripcion: "Electroválvula 2 vías NA acción indirecta. Obturador EPDM. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '05', medida: '3/4"', precio: 143.64},
      {codigo: '06', medida: '1"', precio: 156.52},
      {codigo: '07', medida: '1 1/4"', precio: 311.78},
      {codigo: '08', medida: '1 1/2"', precio: 327.50},
      {codigo: '09', medida: '2"', precio: 466.80}
    ]
  },
  // ELECTROVÁLVULAS INOX
  {
    articulo: "4630", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC INOX ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - PTFE",
    descripcion: "Electroválvula 2 vías NC inox. Obturador PTFE. Temp. máx 180°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 125.44}
    ]
  },
  {
    articulo: "4631", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC INOX ACCIÓN MIXTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Mixta - Viton",
    descripcion: "Electroválvula 2 vías NC inox. Obturador Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 225.09},
      {codigo: '05', medida: '3/4"', precio: 281.33},
      {codigo: '06', medida: '1"', precio: 363.93}
    ]
  },
  {
    articulo: "4632", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC INOX ACCIÓN INDIRECTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Indirecta - Viton",
    descripcion: "Electroválvula 2 vías NC inox acción indirecta. Obturador Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 408.77},
      {codigo: '05', medida: '3/4"', precio: 631.54},
      {codigo: '06', medida: '1"', precio: 631.54}
    ]
  },
  {
    articulo: "4640", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA INOX ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - PTFE",
    descripcion: "Electroválvula 2 vías NA inox. Obturador PTFE. Temp. máx 180°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 147.21}
    ]
  },
  {
    articulo: "4642", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA INOX ACCIÓN INDIRECTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Abierta - Acción Indirecta - Viton",
    descripcion: "Electroválvula 2 vías NA inox acción indirecta. Obturador Viton. Temp. máx 140°C. Disponible 220V/110V/24V AC y 12V/24V DC.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 473.21},
      {codigo: '05', medida: '3/4"', precio: 695.99},
      {codigo: '06', medida: '1"', precio: 695.99}
    ]
  },
  // ELECTROVÁLVULAS ACCIÓN DIRECTA PEQUEÑAS
  {
    articulo: "4030", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton",
    descripcion: "Electroválvula 2 vías NC acción directa. Pasaje int. 2,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 54.01},
      {codigo: '02', medida: '1/4"', precio: 54.01}
    ]
  },
  {
    articulo: "4031", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA 14W", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton - 14W",
    descripcion: "Electroválvula 2 vías NC acción directa 14W. Pasaje int. 2,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 82.18},
      {codigo: '02', medida: '1/4"', precio: 82.18}
    ]
  },
  {
    articulo: "4030T", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA PTFE", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - PTFE",
    descripcion: "Electroválvula 2 vías NC acción directa. Pasaje int. 2,5mm. Obturador PTFE. Temp. máx 180°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 59.41},
      {codigo: '02', medida: '1/4"', precio: 59.41}
    ]
  },
  {
    articulo: "4031T", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA PTFE 14W", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - PTFE - 14W",
    descripcion: "Electroválvula 2 vías NC acción directa 14W. Pasaje int. 2,5mm. Obturador PTFE. Temp. máx 180°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 90.40},
      {codigo: '02', medida: '1/4"', precio: 90.40}
    ]
  },
  {
    articulo: "4034", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA 4,5MM", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton",
    descripcion: "Electroválvula 2 vías NC acción directa. Pasaje int. 4,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 54.01},
      {codigo: '02', medida: '1/4"', precio: 54.01}
    ]
  },
  {
    articulo: "4035", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NC ACCIÓN DIRECTA 4,5MM 14W", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton - 14W",
    descripcion: "Electroválvula 2 vías NC acción directa 14W. Pasaje int. 4,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 87.04},
      {codigo: '02', medida: '1/4"', precio: 87.04}
    ]
  },
  // ELECTROVÁLVULAS NA ACCIÓN DIRECTA
  {
    articulo: "4040", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - Viton",
    descripcion: "Electroválvula 2 vías NA acción directa. Pasaje int. 2,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 74.66},
      {codigo: '02', medida: '1/4"', precio: 74.66}
    ]
  },
  {
    articulo: "4041", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN DIRECTA 14W", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - Viton - 14W",
    descripcion: "Electroválvula 2 vías NA acción directa 14W. Pasaje int. 2,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 103.01},
      {codigo: '02', medida: '1/4"', precio: 103.01}
    ]
  },
  {
    articulo: "4040T", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN DIRECTA PTFE", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - PTFE",
    descripcion: "Electroválvula 2 vías NA acción directa. Pasaje int. 2,5mm. Obturador PTFE. Temp. máx 180°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 81.40},
      {codigo: '02', medida: '1/4"', precio: 81.40}
    ]
  },
  {
    articulo: "4041T", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN DIRECTA PTFE 14W", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - PTFE - 14W",
    descripcion: "Electroválvula 2 vías NA acción directa 14W. Pasaje int. 2,5mm. Obturador PTFE. Temp. máx 180°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 112.50},
      {codigo: '02', medida: '1/4"', precio: 112.50}
    ]
  },
  // ELECTROVÁLVULAS 3 VÍAS
  {
    articulo: "4320", 
    nombre: "ELECTROVÁLVULA 3 VÍAS NC ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - 3 Vías - Acción Directa - Viton",
    descripcion: "Electroválvula 3 vías NC acción directa. Pasaje int. 2,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 57.96},
      {codigo: '02', medida: '1/4"', precio: 57.96}
    ]
  },
  {
    articulo: "4324", 
    nombre: "ELECTROVÁLVULA 3 VÍAS NC ACCIÓN DIRECTA 220V AC", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - 3 Vías - Acción Directa - Viton - 220V AC",
    descripcion: "Electroválvula 3 vías NC acción directa 220V AC. Pasaje int. 1,5mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 58.03},
      {codigo: '02', medida: '1/4"', precio: 58.03}
    ]
  },
  {
    articulo: "46303", 
    nombre: "ELECTROVÁLVULA 3 VÍAS NC INOX ACCIÓN DIRECTA", 
    categoria: "Electroválvulas", 
    material: "Inox 316 / Núcleo Inox",
    tipo: "Normal Cerrada - 3 Vías - Acción Directa - Viton",
    descripcion: "Electroválvula 3 vías NC inox acción directa. Pasaje int. 3mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 132.16}
    ]
  },
  // ELECTROVÁLVULAS ESPECIALES - MÁQUINA DE CAFÉ
  {
    articulo: "4061", 
    nombre: "ELECTROVÁLVULA NC APTA MÁQUINA DE CAFÉ", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton - Máquina de Café",
    descripcion: "Electroválvula NC acción directa apta máquina de café. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 31.36}
    ]
  },
  {
    articulo: "4210", 
    nombre: "ELECTROVÁLVULA NC APTA MÁQUINA DE CAFÉ 1/8", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - Acción Directa - Viton - Máquina de Café",
    descripcion: "Electroválvula NC acción directa apta máquina de café 1/8\". Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 36.54}
    ]
  },
  {
    articulo: "4340P", 
    nombre: "ELECTROVÁLVULA 3 VÍAS NC APTA MÁQUINA DE CAFÉ", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Cerrada - 3 Vías - Viton - Máquina de Café",
    descripcion: "Electroválvula 3 vías NC apta máquina de café. Pasaje int. 1,2mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 39.38}
    ]
  },
  // ELECTROVÁLVULAS ESPECIALES - COMPRESOR DE AIRE
  {
    articulo: "4055PW", 
    nombre: "ELECTROVÁLVULA NA APTA COMPRESOR DE AIRE", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - FH+NBR - Compresor",
    descripcion: "Electroválvula NA apta compresor de aire. Pasaje int. 8,5mm. Obturador FH+NBR. Temp. máx 60°C.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 76.79}
    ]
  },
  {
    articulo: "402064", 
    nombre: "ELECTROVÁLVULA NA APTA COMPRESOR DE AIRE 1/2", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Viton - Compresor",
    descripcion: "Electroválvula NA apta compresor de aire. Pasaje int. 12mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '04', medida: '1/2"', precio: 113.25}
    ]
  },
  {
    articulo: "4241", 
    nombre: "ELECTROVÁLVULA NA APTA COMPRESOR DE AIRE PEQUEÑA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Viton - Compresor",
    descripcion: "Electroválvula NA apta compresor de aire. Pasaje 1,2mm. Obturador Viton. Temp. máx 140°C.",
    variantes: [
      {codigo: '01', medida: '1/8"', precio: 46.66}
    ]
  },
  {
    articulo: "4046", 
    nombre: "ELECTROVÁLVULA 2 VÍAS NA ACCIÓN DIRECTA NUEVA", 
    categoria: "Electroválvulas", 
    material: "Latón / Núcleo Inox",
    tipo: "Normal Abierta - Acción Directa - Viton",
    descripcion: "Electroválvula 2 vías NA acción directa. Pasaje int. 5,5mm. Obturador Viton. Temp. máx 140°C. NUEVO.",
    variantes: [
      {codigo: '02', medida: '1/4"', precio: 74.66}
    ]
  },
  // ============ INCENDIO - CERTIFICACIÓN UL/FM ============
  // VÁLVULAS MARIPOSA INCENDIO
  {
    articulo: "2120", 
    nombre: "VÁLVULA MARIPOSA INCENDIO EXTREMOS RANURADOS", 
    categoria: "Incendio", 
    material: "Cuerpo Fundición Nodular GGG.40 / Disco Fundición Nodular + EPDM",
    tipo: "Extremos Ranurados - API 609 - AWWA C606",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa incendio extremos ranurados. Palanca hasta 8\", reductor manual desde 10\". Distancia entre caras ASME B16.10. NUEVO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 100.52},
      {codigo: '10', medida: '2 1/2"', precio: 110.17},
      {codigo: '11', medida: '3"', precio: 118.01},
      {codigo: '12', medida: '4"', precio: 143.77},
      {codigo: '13', medida: '5"', precio: 190.25},
      {codigo: '14', medida: '6"', precio: 218.41},
      {codigo: '16', medida: '8"', precio: 363.00},
      {codigo: '18', medida: '10"', precio: 696.00},
      {codigo: '20', medida: '12"', precio: 1135.23}
    ]
  },
  {
    articulo: "2120D", 
    nombre: "VÁLVULA MARIPOSA INCENDIO EXTREMOS RANURADOS DN", 
    categoria: "Incendio", 
    material: "Cuerpo Fundición Nodular GGG.40 / Disco Fundición Nodular + EPDM",
    tipo: "Extremos Ranurados DN - API 609 - AWWA C606",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa incendio extremos ranurados DN. Palanca hasta 8\", reductor manual desde 10\". Distancia entre caras ASME B16.10. NUEVO.",
    variantes: [
      {codigo: '10', medida: 'DN65', precio: 110.17},
      {codigo: '13', medida: 'DN125', precio: 190.25},
      {codigo: '14', medida: 'DN150', precio: 218.41}
    ]
  },
  {
    articulo: "2113", 
    nombre: "VÁLVULA MARIPOSA INCENDIO WAFER CON REDUCTOR Y MICROSWITCH UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo Fundición Nodular GGG.40 / Disco Fundición Nodular + EPDM",
    tipo: "Wafer - API 609 - ASME B16.10 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa tipo wafer con reductor manual y microrruptor final de carrera. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 191.40},
      {codigo: '11', medida: '3"', precio: 197.59},
      {codigo: '12', medida: '4"', precio: 225.28},
      {codigo: '13', medida: '5"', precio: 248.74},
      {codigo: '14', medida: '6"', precio: 281.66},
      {codigo: '16', medida: '8"', precio: 423.67}
    ]
  },
  {
    articulo: "2114", 
    nombre: "VÁLVULA MARIPOSA INCENDIO RANURADOS CON REDUCTOR Y MICROSWITCH UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo Fundición Nodular GGG.40 / Disco Fundición Nodular + EPDM",
    tipo: "Extremos Ranurados - API 609 - AWWA C606 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa extremos ranurados con reductor manual y microrruptor final de carrera. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 194.40},
      {codigo: '11', medida: '3"', precio: 201.58},
      {codigo: '12', medida: '4"', precio: 225.23},
      {codigo: '13', medida: '5"', precio: 267.80},
      {codigo: '14', medida: '6"', precio: 293.62},
      {codigo: '16', medida: '8"', precio: 466.79}
    ]
  },
  {
    articulo: "2114D", 
    nombre: "VÁLVULA MARIPOSA INCENDIO RANURADOS DN CON REDUCTOR Y MICROSWITCH UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo Fundición Nodular GGG.40 / Disco Fundición Nodular + EPDM",
    tipo: "Extremos Ranurados DN - API 609 - AWWA C606 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula mariposa extremos ranurados DN con reductor manual y microrruptor final de carrera. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: 'DN65', precio: 194.40},
      {codigo: '13', medida: 'DN125', precio: 267.80},
      {codigo: '14', medida: 'DN150', precio: 293.62}
    ]
  },
  // VÁLVULAS COMPUERTA INCENDIO
  {
    articulo: "2094", 
    nombre: "VÁLVULA COMPUERTA INCENDIO CIERRE EPDM EXTREMOS BRIDADOS UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo y Bonete Fundición Nodular GGG.40",
    tipo: "Extremos Bridados - AWWA C515 - ANSI B16.1 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula compuerta cierre EPDM extremos bridados. Husillo ascendente. Distancia entre caras ASME B16.10. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 347.74},
      {codigo: '11', medida: '3"', precio: 397.74},
      {codigo: '12', medida: '4"', precio: 500.78},
      {codigo: '13', medida: '5"', precio: 713.33},
      {codigo: '14', medida: '6"', precio: 810.32},
      {codigo: '16', medida: '8"', precio: 1285.68},
      {codigo: '18', medida: '10"', precio: 1846.44},
      {codigo: '20', medida: '12"', precio: 2563.00}
    ]
  },
  {
    articulo: "2100", 
    nombre: "VÁLVULA COMPUERTA INCENDIO CIERRE EPDM EXTREMOS RANURADOS UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo y Bonete Fundición Nodular GGG.40",
    tipo: "Extremos Ranurados - AWWA C515 - ANSI B16.1 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula compuerta cierre EPDM extremos ranurados. Husillo ascendente. Distancia entre caras ASME B16.10. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: '2 1/2"', precio: 333.80},
      {codigo: '11', medida: '3"', precio: 381.79},
      {codigo: '12', medida: '4"', precio: 480.79},
      {codigo: '13', medida: '5"', precio: 684.75},
      {codigo: '14', medida: '6"', precio: 777.87},
      {codigo: '16', medida: '8"', precio: 1234.29},
      {codigo: '18', medida: '10"', precio: 1772.57},
      {codigo: '20', medida: '12"', precio: 2460.48}
    ]
  },
  {
    articulo: "2100D", 
    nombre: "VÁLVULA COMPUERTA INCENDIO CIERRE EPDM RANURADOS DN UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo y Bonete Fundición Nodular GGG.40",
    tipo: "Extremos Ranurados DN - AWWA C515 - ANSI B16.1 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula compuerta cierre EPDM extremos ranurados DN. Husillo ascendente. Distancia entre caras ASME B16.10. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '10', medida: 'DN65', precio: 333.80},
      {codigo: '13', medida: 'DN125', precio: 684.75},
      {codigo: '14', medida: 'DN150', precio: 777.87}
    ]
  },
  // VÁLVULAS RETENCIÓN INCENDIO
  {
    articulo: "2403", 
    nombre: "VÁLVULA RETENCIÓN INCENDIO DISCO OSCILANTE BRIDADOS UL/FM", 
    categoria: "Incendio", 
    material: "Cuerpo y Tapa Fundición Nodular GGG.40 / Asiento EPDM",
    tipo: "Disco Oscilante - AWWA C508 - ANSI B16.1 - UL/FM",
    presion: "300 PSI",
    temperatura: "0°C a +80°C",
    descripcion: "Válvula de retención disco oscilante extremos bridados. Certificación UL/FM. NUEVO.",
    variantes: [
      {codigo: '09', medida: '2"', precio: 265.46},
      {codigo: '10', medida: '2 1/2"', precio: 343.70},
      {codigo: '11', medida: '3"', precio: 415.36},
      {codigo: '12', medida: '4"', precio: 518.63},
      {codigo: '13', medida: '5"', precio: 768.93},
      {codigo: '14', medida: '6"', precio: 958.98},
      {codigo: '16', medida: '8"', precio: 1478.43},
      {codigo: '18', medida: '10"', precio: 2239.71},
      {codigo: '20', medida: '12"', precio: 3347.30}
    ]
  }
];

// ============ CATÁLOGO TODOVALVULAS ============
// Incluye: TODOVALVULAS, CODITAL, BERMAD, VALLOY, ERA
const CATALOGO_TODOVALVULAS = [
  // ============ VÁLVULAS DE FUNDICIÓN ============
  {
    articulo: "930",
    nombre: "VÁLVULA ESCLUSA TODOVALVULAS",
    categoria: "Fundición",
    marca: "TODOVALVULAS",
    material: "Cuerpo y Cuña GGG50 + Epoxy Azul, cierre EPDM",
    descripcion: "Bridada ISO 7005 - PN 10/16. Entre Caras: DIN 3202 F4 o F5. Vástago no Ascendente.",
    variantes: [
      {codigo: 'ANC93050F4C10', medida: 'DN50 Corto', precio: 114.81},
      {codigo: 'ANC93050F4V10', medida: 'DN50 Volante', precio: 114.81},
      {codigo: 'ANC93065F4C10', medida: 'DN65 Corto', precio: 137.49},
      {codigo: 'ANC93065F4V10', medida: 'DN65 Volante', precio: 137.49},
      {codigo: 'ANC93065F5C10', medida: 'DN65 Largo', precio: 144.36},
      {codigo: 'ANC93080F4C10', medida: 'DN80 Corto', precio: 159.70},
      {codigo: 'ANC93080F4V10', medida: 'DN80 Volante', precio: 159.70},
      {codigo: 'ANC93080F5C10', medida: 'DN80 Largo', precio: 173.21},
      {codigo: 'ANC930100F4C10', medida: 'DN100 Corto', precio: 178.00},
      {codigo: 'ANC930100F4V10', medida: 'DN100 Volante', precio: 178.00},
      {codigo: 'ANC930100F5C10', medida: 'DN100 Largo', precio: 203.45},
      {codigo: 'ANC930125F4C10', medida: 'DN125 Corto', precio: 271.57},
      {codigo: 'ANC930150F4C10', medida: 'DN150 Corto', precio: 320.31},
      {codigo: 'ANC930150F4V10', medida: 'DN150 Volante', precio: 320.31},
      {codigo: 'ANC930150F5C10', medida: 'DN150 Largo', precio: 353.27},
      {codigo: 'ANC930150F5V10', medida: 'DN150 Largo Volante', precio: 353.27},
      {codigo: 'ANC930200F4C10', medida: 'DN200 Corto', precio: 492.19},
      {codigo: 'ANC930200F4V10', medida: 'DN200 Volante', precio: 492.19},
      {codigo: 'ANC930200F5C10', medida: 'DN200 Largo', precio: 555.34},
      {codigo: 'ANC930250F4C10', medida: 'DN250 Corto', precio: 780.72},
      {codigo: 'ANC930250F4V10', medida: 'DN250 Volante', precio: 780.72},
      {codigo: 'ANC930250F5C10', medida: 'DN250 Largo', precio: 858.79},
      {codigo: 'ANC930300F4C10', medida: 'DN300 Corto', precio: 1024.15},
      {codigo: 'ANC930300F4V10', medida: 'DN300 Volante', precio: 1024.15},
      {codigo: 'ANC930350F4C10', medida: 'DN350 Corto', precio: 1771.25},
      {codigo: 'ANC930400F4C10', medida: 'DN400 Corto', precio: 3107.84},
      {codigo: 'ANC930400F4V10', medida: 'DN400 Volante', precio: 3107.84},
      {codigo: 'ANC930500F4C10', medida: 'DN500 Corto', precio: 3876.54}
    ]
  },
  {
    articulo: "930PVC",
    nombre: "VÁLVULA ESCLUSA ENCHUFE A PVC",
    categoria: "Fundición",
    marca: "TODOVALVULAS",
    material: "Cuerpo y Cuña GGG50 + Epoxy Azul, Cierre EPDM",
    descripcion: "Enchufe a PVC PN 16. Entre Caras: DIN 3202 F5.",
    variantes: [
      {codigo: 'ANCPVC50F5C', medida: '50/63', precio: 113.42},
      {codigo: 'ANCPVC65F5C', medida: '65/75', precio: 130.76},
      {codigo: 'ANCPVC80F5C', medida: '80/90', precio: 154.30},
      {codigo: 'ANCPVC100F5C', medida: '100/110', precio: 184.00},
      {codigo: 'ANCPVC150F5C', medida: '150/160', precio: 317.47},
      {codigo: 'ANCPVC200F5C', medida: '200/200', precio: 516.12},
      {codigo: 'ANCPVC250F5C', medida: '250/250', precio: 836.56}
    ]
  },
  {
    articulo: "SWINGCHECK",
    nombre: "VÁLVULA RETENCIÓN BRIDADA A CLAPETA",
    categoria: "Fundición",
    marca: "TODOVALVULAS",
    descripcion: "DIN 3202 Presión de trabajo PN10/16/25",
    variantes: [
      {codigo: 'ANCSCHV10010', medida: 'DN100', precio: 319.20},
      {codigo: 'ANCSCHV15010', medida: 'DN150', precio: 589.40},
      {codigo: 'ANCSCHV20010', medida: 'DN200', precio: 896.35},
      {codigo: 'ANCSCHV25010', medida: 'DN250', precio: 1706.95},
      {codigo: 'ANCSCHV30010', medida: 'DN300', precio: 2298.80}
    ]
  },
  {
    articulo: "398",
    nombre: "VÁLVULA RETENCIÓN A BOLA ROSCADA",
    categoria: "Fundición",
    marca: "CODITAL",
    material: "Cuerpo Fundición Gris GG-25/50 + Epoxy Azul",
    descripcion: "Roscada HH BSP. Temp.max. 80°C.",
    variantes: [
      {codigo: 'COD2003980003300', medida: '1 1/4"', precio: 85.42},
      {codigo: 'COD2003980004000', medida: '1 1/2"', precio: 100.31},
      {codigo: 'COD2003980005000', medida: '2"', precio: 127.13}
    ]
  },
  {
    articulo: "399",
    nombre: "VÁLVULA RETENCIÓN A BOLA BRIDADA",
    categoria: "Fundición",
    marca: "CODITAL",
    material: "Cuerpo fundición gris GG-25/50 + epoxy azul",
    descripcion: "Bridada PN 10/16. Entre caras: DIN 3202 F6.",
    variantes: [
      {codigo: 'COD2003990005000', medida: 'DN50', precio: 161.00},
      {codigo: 'COD2003990006500', medida: 'DN65', precio: 196.69},
      {codigo: 'COD2003990008000', medida: 'DN80', precio: 251.98},
      {codigo: 'COD2003990010000', medida: 'DN100', precio: 337.29},
      {codigo: 'COD2003990012500', medida: 'DN125', precio: 518.81},
      {codigo: 'COD2003990015000', medida: 'DN150', precio: 673.62},
      {codigo: 'COD2003990020000', medida: 'DN200', precio: 1240.42},
      {codigo: 'COD2003990025000', medida: 'DN250', precio: 2015.90},
      {codigo: 'COD2003990030000', medida: 'DN300', precio: 3855.80},
      {codigo: 'COD2003990035010', medida: 'DN350', precio: 5913.88},
      {codigo: 'COD2003990040010', medida: 'DN400', precio: 8914.33}
    ]
  },
  // VÁLVULAS MARIPOSA
  {
    articulo: "710",
    nombre: "VÁLVULA MARIPOSA WAFER",
    categoria: "Mariposa",
    marca: "TODOVALVULAS",
    material: "Cuerpo GGG50 - Disco AISI 304 - Asiento EPDM",
    descripcion: "Wafer ISO PN 10/16 o ANSI #150. Entre Caras: ISO 5752 S.20",
    variantes: [
      {codigo: 'ANC71050G40CF8L10', medida: 'DN50 Palanca', precio: 50.64},
      {codigo: 'ANC71065G40CF8L10', medida: 'DN65 Palanca', precio: 59.84},
      {codigo: 'ANC71080G40CF8L10', medida: 'DN80 Palanca', precio: 66.98},
      {codigo: 'ANC710100G40CF8L10', medida: 'DN100 Palanca', precio: 89.18},
      {codigo: 'ANC710100G40CF8G10', medida: 'DN100 Reductor', precio: 123.75},
      {codigo: 'ANC710150G40CF8L10', medida: 'DN150 Palanca', precio: 149.00},
      {codigo: 'ANC710150G40CF8G10', medida: 'DN150 Reductor', precio: 194.47},
      {codigo: 'ANC710200G40CF8L10', medida: 'DN200 Palanca', precio: 256.23},
      {codigo: 'ANC710200G40CF8G10', medida: 'DN200 Reductor', precio: 312.87},
      {codigo: 'ANC711250G40CF8G10', medida: 'DN250 Reductor', precio: 455.60},
      {codigo: 'ANC710300G40CF8G10', medida: 'DN300 Reductor', precio: 625.77},
      {codigo: 'ANC710350G40CF8G10', medida: 'DN350 Reductor', precio: 939.97},
      {codigo: 'ANC710400G40CF8G10', medida: 'DN400 Reductor', precio: 1376.70},
      {codigo: 'ANC710450G40CF8G10', medida: 'DN450 Reductor', precio: 1619.33},
      {codigo: 'ANC710500G40CF8G10', medida: 'DN500 Reductor', precio: 2499.06},
      {codigo: 'ANC710600G40CF8G10', medida: 'DN600 Reductor', precio: 3701.39},
      {codigo: 'ANC710700G40CF8G10', medida: 'DN700 Reductor', precio: 6769.66}
    ]
  },
  {
    articulo: "711",
    nombre: "VÁLVULA MARIPOSA TIPO LUG",
    categoria: "Mariposa",
    marca: "TODOVALVULAS",
    material: "Cuerpo GGG50 - Disco AISI 304 - Asiento EPDM",
    descripcion: "ANSI #150",
    variantes: [
      {codigo: 'ANC71150G40CF8LA5', medida: 'DN50 Palanca', precio: 72.84},
      {codigo: 'ANC71165G40CF8LA5', medida: 'DN65 Palanca', precio: 86.07},
      {codigo: 'ANC71180G40CF8LA5', medida: 'DN80 Palanca', precio: 96.34},
      {codigo: 'ANC711100G40CF8LA5', medida: 'DN100 Palanca', precio: 128.27},
      {codigo: 'ANC711125G40CF8LA5', medida: 'DN125 Palanca', precio: 128.47},
      {codigo: 'ANC711150G40CF8LA5', medida: 'DN150 Palanca', precio: 214.32},
      {codigo: 'ANC711200G40CF8LA5', medida: 'DN200 Palanca', precio: 368.58},
      {codigo: 'ANC711250G40CF8GA5', medida: 'DN250 Reductor', precio: 655.36},
      {codigo: 'ANC711300G40CF8GA5', medida: 'DN300 Reductor', precio: 900.15}
    ]
  },
  {
    articulo: "740",
    nombre: "VÁLVULA MARIPOSA PTFE",
    categoria: "Mariposa",
    marca: "TODOVALVULAS",
    material: "Cuerpo GGG50 - Disco AISI 304 - Asiento PTFE",
    variantes: [
      {codigo: 'ANC74050G40CF8LM', medida: 'DN50', precio: 229.42},
      {codigo: 'ANC74065G40CF8LM', medida: 'DN65', precio: 273.29},
      {codigo: 'ANC74080G40CF8LM', medida: 'DN80', precio: 310.73},
      {codigo: 'ANC740100G40CF8LM', medida: 'DN100', precio: 439.53},
      {codigo: 'ANC740125G40CF8LM', medida: 'DN125', precio: 615.42},
      {codigo: 'ANC740150G40CF8LM', medida: 'DN150', precio: 786.48},
      {codigo: 'ANC740200G40CF8LM', medida: 'DN200', precio: 1286.39}
    ]
  },
  {
    articulo: "810",
    nombre: "VÁLVULA RETENCIÓN DUO CHECK WAFER",
    categoria: "Retención",
    marca: "TODOVALVULAS",
    material: "Cuerpo GG25 - Disco CF8 (SS304) - Asiento EPDM",
    variantes: [
      {codigo: 'ANC81050G50CF8IA', medida: '2"', precio: 38.80},
      {codigo: 'ANC81065G50CF8IA', medida: '2 1/2"', precio: 47.47},
      {codigo: 'ANC81080G50CF8IA', medida: '3"', precio: 64.08},
      {codigo: 'ANC810100G50CF8IA', medida: '4"', precio: 94.81},
      {codigo: 'ANC810125G50CF8IA', medida: '5"', precio: 118.96},
      {codigo: 'ANC810150G50CF8IA', medida: '6"', precio: 160.72},
      {codigo: 'ANC810200G50CF8IA', medida: '8"', precio: 266.40},
      {codigo: 'ANC810250G50CF8IA', medida: '10"', precio: 422.89},
      {codigo: 'ANC810300G50CF8IA', medida: '12"', precio: 590.40},
      {codigo: 'ANC810350G50CF8IA', medida: '14"', precio: 874.62},
      {codigo: 'ANC810400G50CF8IA', medida: '16"', precio: 1224.89}
    ]
  },
  {
    articulo: "413",
    nombre: "MANGUITO DE DILATACIÓN SIMPLE ONDA",
    categoria: "Accesorios",
    marca: "CODITAL",
    material: "Cuerpo EPDM, Bridas Acero Galvanizado",
    descripcion: "ISO PN 10 - Temp máx 90°C",
    variantes: [
      {codigo: 'COD3004130003200', medida: 'DN32', precio: 52.63},
      {codigo: 'COD3004130004000', medida: 'DN40', precio: 54.06},
      {codigo: 'COD3004130005000', medida: 'DN50', precio: 56.10},
      {codigo: 'COD3004130006500', medida: 'DN65', precio: 77.91},
      {codigo: 'COD3004130008000', medida: 'DN80', precio: 98.13},
      {codigo: 'COD3004130010000', medida: 'DN100', precio: 124.35},
      {codigo: 'COD3004130012500', medida: 'DN125', precio: 179.31},
      {codigo: 'COD3004130015000', medida: 'DN150', precio: 207.29},
      {codigo: 'COD3004130020000', medida: 'DN200', precio: 358.47},
      {codigo: 'COD3004130025000', medida: 'DN250', precio: 476.63},
      {codigo: 'COD3004130030000', medida: 'DN300', precio: 585.94}
    ]
  },
  // VÁLVULAS LATÓN
  {
    articulo: "1501",
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN",
    categoria: "Latón",
    marca: "CODITAL",
    material: "Latón CW617N niquelado",
    descripcion: "Alto caudal PN 25. Asiento inox 304.",
    variantes: [
      {codigo: 'COD2015010001500', medida: '1/2"', precio: 52.05},
      {codigo: 'COD2015010002000', medida: '3/4"', precio: 55.32},
      {codigo: 'COD2015010002600', medida: '1"', precio: 101.89},
      {codigo: 'COD2015010003300', medida: '1 1/4"', precio: 155.32},
      {codigo: 'COD2015010004000', medida: '1 1/2"', precio: 186.62},
      {codigo: 'COD2015010005000', medida: '2"', precio: 269.96},
      {codigo: 'COD2015010006600', medida: '2 1/2"', precio: 537.39},
      {codigo: 'COD2015010008000', medida: '3"', precio: 690.04},
      {codigo: 'COD2015010010200', medida: '4"', precio: 1570.07}
    ]
  },
  {
    articulo: "233",
    nombre: "VÁLVULA RETENCIÓN LATÓN",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Obturador latón F/F ISO 228-1. PN 16-10-8",
    variantes: [
      {codigo: 'COD2002330001500', medida: '1/2"', precio: 6.24},
      {codigo: 'COD2002330002000', medida: '3/4"', precio: 11.37},
      {codigo: 'COD2002330002600', medida: '1"', precio: 12.00},
      {codigo: 'COD2002330003300', medida: '1 1/4"', precio: 20.33},
      {codigo: 'COD2002330004000', medida: '1 1/2"', precio: 29.31},
      {codigo: 'COD2002330005000', medida: '2"', precio: 44.15},
      {codigo: 'COD2002330006600', medida: '2 1/2"', precio: 88.50},
      {codigo: 'COD200233000800', medida: '3"', precio: 119.64},
      {codigo: 'COD2002330010200', medida: '4"', precio: 208.12}
    ]
  },
  {
    articulo: "501",
    nombre: "VÁLVULA DE PIE LATÓN",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "PN16, ISO 228-1",
    variantes: [
      {codigo: 'COD2005010001500', medida: '1/2"', precio: 11.92},
      {codigo: 'COD2005010002000', medida: '3/4"', precio: 12.66},
      {codigo: 'COD2005010002600', medida: '1"', precio: 16.37},
      {codigo: 'COD2005010003300', medida: '1 1/4"', precio: 25.30},
      {codigo: 'COD2005010004000', medida: '1 1/2"', precio: 33.48},
      {codigo: 'COD2005010005000', medida: '2"', precio: 54.28},
      {codigo: 'COD2005010006600', medida: '2 1/2"', precio: 69.90},
      {codigo: 'COD2005010008000', medida: '3"', precio: 96.67},
      {codigo: 'COD2005010010200', medida: '4"', precio: 175.33}
    ]
  },
  {
    articulo: "1203",
    nombre: "VÁLVULA RETENCIÓN CLAPETA LATÓN",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Asiento NBR. PN 16/10. F/F ISO 228-1",
    variantes: [
      {codigo: 'COD2012030001500', medida: '1/2"', precio: 10.56},
      {codigo: 'COD2012030002000', medida: '3/4"', precio: 14.52},
      {codigo: 'COD2012030002600', medida: '1"', precio: 21.40},
      {codigo: 'COD2012030003300', medida: '1 1/4"', precio: 32.84},
      {codigo: 'COD2012030004000', medida: '1 1/2"', precio: 42.78},
      {codigo: 'COD2012030005000', medida: '2"', precio: 66.36},
      {codigo: 'COD2002030006600', medida: '2 1/2"', precio: 129.83},
      {codigo: 'COD2002030008000', medida: '3"', precio: 201.54},
      {codigo: 'COD2002030010200', medida: '4"', precio: 332.53}
    ]
  },
  {
    articulo: "913",
    nombre: "VÁLVULA FLOTADOR",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo latón, junta NBR, varilla inox",
    variantes: [
      {codigo: 'COD2009130001500', medida: '1/2"', precio: 24.95},
      {codigo: 'COD2009130002000', medida: '3/4"', precio: 37.50},
      {codigo: 'COD2009130002600', medida: '1"', precio: 48.00},
      {codigo: 'COD2009130003300', medida: '1 1/4"', precio: 70.00}
    ]
  },
  {
    articulo: "417",
    nombre: "VÁLVULA DE SEGURIDAD",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Metal/metal. PN 16. ISO 228-1",
    variantes: [
      {codigo: 'COD241734', medida: '3/4"', precio: 85.00},
      {codigo: 'COD200417', medida: '1"', precio: 115.00}
    ]
  },
  {
    articulo: "416",
    nombre: "FILTRO Y CON TAMIZ",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Tamiz inox 304 desmontable. PN 16",
    variantes: [
      {codigo: 'COD2004160001500', medida: '1/2"', precio: 7.91},
      {codigo: 'COD2004160002000', medida: '3/4"', precio: 11.26},
      {codigo: 'COD200416000260', medida: '1"', precio: 16.35},
      {codigo: 'COD2004160003300', medida: '1 1/4"', precio: 33.36},
      {codigo: 'COD2004160004000', medida: '1 1/2"', precio: 44.22},
      {codigo: 'COD2004160005000', medida: '2"', precio: 77.02},
      {codigo: 'COD2004160006600', medida: '2 1/2"', precio: 149.32},
      {codigo: 'COD2004160008000', medida: '3"', precio: 187.60},
      {codigo: 'COD2004160010200', medida: '4"', precio: 355.67}
    ]
  },
  {
    articulo: "1207",
    nombre: "VÁLVULA COMPUERTA LATÓN PN10",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo, tapa, eje y compuerta latón. Eje no ascendente.",
    variantes: [
      {codigo: 'COD2012070001500', medida: '1/2"', precio: 8.97},
      {codigo: 'COD2012070002000', medida: '3/4"', precio: 11.26},
      {codigo: 'COD2012070002600', medida: '1"', precio: 16.31},
      {codigo: 'COD2012070003300', medida: '1 1/4"', precio: 24.29},
      {codigo: 'COD2012070004000', medida: '1 1/2"', precio: 31.17},
      {codigo: 'COD2012070005000', medida: '2"', precio: 55.17},
      {codigo: 'COD2012070006600', medida: '2 1/2"', precio: 88.80},
      {codigo: 'COD2012070008000', medida: '3"', precio: 126.19},
      {codigo: 'COD2012070010200', medida: '4"', precio: 241.45}
    ]
  },
  {
    articulo: "205",
    nombre: "VÁLVULA RETENCIÓN LATÓN NYLON",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Obturador y eje nylon (PA6). PN 16-10-8",
    variantes: [
      {codigo: 'COD2002050001500', medida: '1/2"', precio: 5.64},
      {codigo: 'COD2002050002000', medida: '3/4"', precio: 7.04},
      {codigo: 'COD2002050002600', medida: '1"', precio: 11.94},
      {codigo: 'COD2002050003300', medida: '1 1/4"', precio: 17.28},
      {codigo: 'COD2002050004000', medida: '1 1/2"', precio: 24.84},
      {codigo: 'COD2002050005000', medida: '2"', precio: 36.20},
      {codigo: 'COD2002050006600', medida: '2 1/2"', precio: 78.53},
      {codigo: 'COD2002050008000', medida: '3"', precio: 95.35},
      {codigo: 'COD2002050010200', medida: '4"', precio: 157.04}
    ]
  },
  {
    articulo: "201",
    nombre: "FILTRO INOX",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Conector ABS. Conexión BSP",
    variantes: [
      {codigo: 'COD2002010001500', medida: '1/2"', precio: 1.55},
      {codigo: 'COD2002010002000', medida: '3/4"', precio: 1.65},
      {codigo: 'COD2002010002600', medida: '1"', precio: 2.00},
      {codigo: 'COD2002010003300', medida: '1 1/4"', precio: 2.36},
      {codigo: 'COD2002010004000', medida: '1 1/2"', precio: 3.08},
      {codigo: 'COD2002010005000', medida: '2"', precio: 9.13},
      {codigo: 'COD2002010006600', medida: '2 1/2"', precio: 20.27}
    ]
  },
  // MANÓMETROS
  {
    articulo: "249",
    nombre: "MANÓMETRO INOX CON GLICERINA",
    categoria: "Instrumentación",
    marca: "CODITAL",
    descripcion: "Conexión radial",
    variantes: [
      {codigo: 'COD2002490063002', medida: '63x1/4" 0-2.5bar', precio: 20.09},
      {codigo: 'COD2002490063004', medida: '63x1/4" 0-4bar', precio: 20.09},
      {codigo: 'COD2002490063006', medida: '63x1/4" 0-6bar', precio: 20.09},
      {codigo: 'COD2002490063010', medida: '63x1/4" 0-10bar', precio: 20.09},
      {codigo: 'COD2002490100002', medida: '100x1/2" 0-2.5bar', precio: 44.03},
      {codigo: 'COD2002490100004', medida: '100x1/2" 0-4bar', precio: 44.03},
      {codigo: 'COD2002490100006', medida: '100x1/2" 0-6bar', precio: 44.03},
      {codigo: 'COD2002490100010', medida: '100x1/2" 0-10bar', precio: 44.03},
      {codigo: 'COD2002490100016', medida: '100x1/2" 0-16bar', precio: 44.03},
      {codigo: 'COD2002490100025', medida: '100x1/2" 0-25bar', precio: 44.03},
      {codigo: 'COD2002490100040', medida: '100x1/2" 0-40bar', precio: 44.03},
      {codigo: 'COD2002490100100', medida: '100x1/2" 0-100bar', precio: 44.03}
    ]
  },
  {
    articulo: "250",
    nombre: "MANÓMETRO ABS SECO RADIAL",
    categoria: "Instrumentación",
    marca: "CODITAL",
    variantes: [
      {codigo: 'COD2002500052002', medida: '50x1/4" 0-2.5bar', precio: 6.73},
      {codigo: 'COD2002500052006', medida: '50x1/4" 0-6bar', precio: 6.73},
      {codigo: 'COD2002500052010', medida: '50x1/4" 0-10bar', precio: 6.73},
      {codigo: 'COD2002500052016', medida: '50x1/4" 0-16bar', precio: 6.73},
      {codigo: 'COD2002500063002', medida: '63x1/4" 0-2.5bar', precio: 8.17},
      {codigo: 'COD2002500063006', medida: '63x1/4" 0-6bar', precio: 8.17},
      {codigo: 'COD2002500063010', medida: '63x1/4" 0-10bar', precio: 8.17},
      {codigo: 'COD2002500063016', medida: '63x1/4" 0-16bar', precio: 8.17}
    ]
  },
  {
    articulo: "251M",
    nombre: "MANÓMETRO ABS SECO AXIAL",
    categoria: "Instrumentación",
    marca: "CODITAL",
    variantes: [
      {codigo: 'COD2002510052006', medida: '50x1/4" 0-6bar', precio: 6.73},
      {codigo: 'COD2002510052010', medida: '50x1/4" 0-10bar', precio: 6.73},
      {codigo: 'COD2002510063002', medida: '63x1/4" 0-2.5bar', precio: 8.17},
      {codigo: 'COD2002510063006', medida: '63x1/4" 0-6bar', precio: 8.17},
      {codigo: 'COD2002510063010', medida: '63x1/4" 0-10bar', precio: 8.17},
      {codigo: 'COD2002510063016', medida: '63x1/4" 0-16bar', precio: 8.17}
    ]
  },
  // VÁLVULAS DE ESFERA LATÓN
  {
    articulo: "120",
    nombre: "VÁLVULA ESFERA H/H PALANCA SMART",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso estándar. BSPP ISO 228-1",
    variantes: [
      {codigo: 'COD19202Z', medida: '1/2"', precio: 5.71},
      {codigo: 'COD19203Z', medida: '3/4"', precio: 8.16},
      {codigo: 'COD19204Z', medida: '1"', precio: 14.00},
      {codigo: 'COD19205Z', medida: '1 1/4"', precio: 24.28},
      {codigo: 'COD19206Z', medida: '1 1/2"', precio: 32.20},
      {codigo: 'COD19207Z', medida: '2"', precio: 45.37}
    ]
  },
  {
    articulo: "121",
    nombre: "VÁLVULA ESFERA M/H PALANCA SMART",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso estándar. BSPP ISO 228-1",
    variantes: [
      {codigo: 'COD19212Z', medida: '1/2"', precio: 7.37},
      {codigo: 'COD19213Z', medida: '3/4"', precio: 11.73},
      {codigo: 'COD19214Z', medida: '1"', precio: 17.63},
      {codigo: 'COD19215Z', medida: '1 1/4"', precio: 26.83},
      {codigo: 'COD19216Z', medida: '1 1/2"', precio: 39.90},
      {codigo: 'COD19217Z', medida: '2"', precio: 59.69}
    ]
  },
  {
    articulo: "123",
    nombre: "VÁLVULA ESFERA H/H MARIPOSA SMART",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Palanca mariposa. Paso estándar.",
    variantes: [
      {codigo: 'COD19232Z', medida: '1/2"', precio: 6.97},
      {codigo: 'COD19233Z', medida: '3/4"', precio: 11.26},
      {codigo: 'COD19234Z', medida: '1"', precio: 17.08}
    ]
  },
  {
    articulo: "220",
    nombre: "VÁLVULA ESFERA H/H PALANCA PASO TOTAL",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso total. BSPP ISO 228-1",
    variantes: [
      {codigo: 'COD29201Z', medida: '3/8"', precio: 5.90},
      {codigo: 'COD29202Z', medida: '1/2"', precio: 6.97},
      {codigo: 'COD29203Z', medida: '3/4"', precio: 12.07},
      {codigo: 'COD29204Z', medida: '1"', precio: 17.79},
      {codigo: 'COD29205Z', medida: '1 1/4"', precio: 25.97},
      {codigo: 'COD29206Z', medida: '1 1/2"', precio: 41.71},
      {codigo: 'COD29207Z', medida: '2"', precio: 64.10},
      {codigo: 'COD29208Z', medida: '2 1/2"', precio: 114.58},
      {codigo: 'COD29209Z', medida: '3"', precio: 186.88},
      {codigo: 'COD29210Z', medida: '4"', precio: 307.12}
    ]
  },
  {
    articulo: "251E",
    nombre: "VÁLVULA ESFERA M/H CON UNIÓN MARIPOSA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso total.",
    variantes: [
      {codigo: 'COD29513Z', medida: '1/2"', precio: 12.88},
      {codigo: 'COD29514Z', medida: '3/4"', precio: 23.98},
      {codigo: 'COD29515Z', medida: '1"', precio: 31.00}
    ]
  },
  {
    articulo: "236",
    nombre: "MINI VÁLVULA ESFERA H/H",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Junta PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29362Z', medida: '3/8"', precio: 7.48},
      {codigo: 'COD29363Z', medida: '1/2"', precio: 7.56}
    ]
  },
  {
    articulo: "237",
    nombre: "MINI VÁLVULA ESFERA M/H",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Junta PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29372Z', medida: '3/8"', precio: 5.88},
      {codigo: 'COD29373Z', medida: '1/2"', precio: 7.22}
    ]
  },
  {
    articulo: "238",
    nombre: "MINI VÁLVULA ESFERA M/M",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Junta PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29381Z', medida: '1/4"', precio: 4.72},
      {codigo: 'COD29382Z', medida: '3/8"', precio: 4.80}
    ]
  },
  {
    articulo: "227",
    nombre: "VÁLVULA ESFERA MANGUERA PALANCA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Temp máx 120°C",
    variantes: [
      {codigo: 'COD29273Z', medida: '1/2"x3/4"', precio: 7.59},
      {codigo: 'COD29274Z', medida: '3/4"x1"', precio: 10.39}
    ]
  },
  {
    articulo: "248E",
    nombre: "VÁLVULA ESFERA MANGUERA MARIPOSA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Temp máx 120°C",
    variantes: [
      {codigo: 'COD29483Z', medida: '1/2"x3/4"', precio: 8.13},
      {codigo: 'COD29484Z', medida: '3/4"x1"', precio: 11.13}
    ]
  },
  {
    articulo: "247",
    nombre: "VÁLVULA ESFERA MANGUERA BLOQUEABLE",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón cromado. Palanca bloqueable.",
    variantes: [
      {codigo: 'COD29473Z', medida: '1/2"x3/4"', precio: 10.91}
    ]
  },
  // VÁLVULAS DE ESFERA INOX
  {
    articulo: "3446",
    nombre: "VÁLVULA ESFERA INOX H/H 2 PIEZAS",
    categoria: "Esfera Inox",
    marca: "CODITAL",
    material: "Inox 316 CF8M",
    descripcion: "Paso total. PN 64-50-40-25. Palanca bloqueable.",
    variantes: [
      {codigo: 'COD2034460000800', medida: '1/4"', precio: 20.38},
      {codigo: 'COD2034460001200', medida: '3/8"', precio: 22.00},
      {codigo: 'COD2034460001500', medida: '1/2"', precio: 24.45},
      {codigo: 'COD2034460002000', medida: '3/4"', precio: 29.68},
      {codigo: 'COD2034460002600', medida: '1"', precio: 44.33},
      {codigo: 'COD2034460003300', medida: '1 1/4"', precio: 65.64},
      {codigo: 'COD203446000400', medida: '1 1/2"', precio: 84.06},
      {codigo: 'COD2034460005000', medida: '2"', precio: 152.62},
      {codigo: 'COD2034460006600', medida: '2 1/2"', precio: 311.04},
      {codigo: 'COD2034460008000', medida: '3"', precio: 449.30}
    ]
  },
  {
    articulo: "1405",
    nombre: "VÁLVULA ESFERA INOX H/H 3 PIEZAS",
    categoria: "Esfera Inox",
    marca: "CODITAL",
    material: "Inox 316 CF8M",
    descripcion: "Paso total. PN 64-50-40-25. Palanca bloqueable.",
    variantes: [
      {codigo: 'COD2014050000800', medida: '1/4"', precio: 35.03},
      {codigo: 'COD2014050001200', medida: '3/8"', precio: 33.52},
      {codigo: 'COD2014050001500', medida: '1/2"', precio: 36.56},
      {codigo: 'COD2014050002000', medida: '3/4"', precio: 51.35},
      {codigo: 'COD2014050002600', medida: '1"', precio: 67.65},
      {codigo: 'COD2014050003300', medida: '1 1/4"', precio: 110.48},
      {codigo: 'COD2014050004000', medida: '1 1/2"', precio: 151.08},
      {codigo: 'COD2014050005000', medida: '2"', precio: 208.17},
      {codigo: 'COD2014050006600', medida: '2 1/2"', precio: 420.24},
      {codigo: 'COD2014050008000', medida: '3"', precio: 617.52},
      {codigo: 'COD2014050010200', medida: '4"', precio: 1307.72}
    ]
  },
  // VÁLVULAS DE AIRE BERMAD
  {
    articulo: "C30-P",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN PLÁSTICO",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Potable",
    variantes: [
      {codigo: 'BERC30P1BSP', medida: '1" Roscada', precio: 157.56},
      {codigo: 'BERC30P2BSP', medida: '2" Roscada', precio: 308.29},
      {codigo: 'BERC30P216', medida: '2" Bridada', precio: 397.52},
      {codigo: 'BERC30P316', medida: '3" Bridada', precio: 416.15}
    ]
  },
  {
    articulo: "C30-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN METÁLICA",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Potable",
    variantes: [
      {codigo: 'BERC30C1BSP', medida: '1" Roscada', precio: 405.76},
      {codigo: 'BERC30C2BSP', medida: '2" Roscada', precio: 506.84},
      {codigo: 'BERC30C216', medida: '2" Bridada', precio: 683.14}
    ]
  },
  {
    articulo: "A30-P",
    nombre: "VÁLVULA AIRE AUTOMÁTICA PLÁSTICO",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Potable",
    variantes: [
      {codigo: 'BERA30P075BSP', medida: '3/4" Roscada', precio: 116.55},
      {codigo: 'BERA30P1BSP', medida: '1" Roscada', precio: 116.55}
    ]
  },
  {
    articulo: "C70-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN NOMINAL AYSA",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Potable. APROBADA AYSA",
    variantes: [
      {codigo: 'BERC702BSP', medida: '2" Roscada', precio: 787.68},
      {codigo: 'BERC702', medida: '2" Bridada', precio: 849.20},
      {codigo: 'BERC703', medida: '3" Bridada', precio: 1200.20},
      {codigo: 'BERC704', medida: '4" Bridada', precio: 1635.10},
      {codigo: 'BERC706', medida: '6" Bridada', precio: 2917.44},
      {codigo: 'BERC708', medida: '8" Bridada', precio: 5156.80}
    ]
  },
  {
    articulo: "C75-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN REDUCIDA",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Potable",
    variantes: [
      {codigo: 'BERC75C316', medida: '3" Bridada', precio: 964.00},
      {codigo: 'BERC75C416', medida: '4" Bridada', precio: 1337.24},
      {codigo: 'BERC75C616', medida: '6" Bridada', precio: 2335.28},
      {codigo: 'BERC75C816', medida: '8" Bridada', precio: 4150.07},
      {codigo: 'BERC75C1016', medida: '10" Bridada', precio: 6615.44},
      {codigo: 'BERC75C1216', medida: '12" Bridada', precio: 12800.00}
    ]
  },
  {
    articulo: "C50-P",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN AGUA SERVIDA PLÁSTICO",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 10. Agua Servida",
    variantes: [
      {codigo: 'BERC50P210', medida: '2" Bridada', precio: 1300.22},
      {codigo: 'BERC50P310', medida: '3" Bridada', precio: 1369.14},
      {codigo: 'BERC50P2BSP', medida: '2" Roscada', precio: 1126.89},
      {codigo: 'BERC50P3BSP', medida: '3" Roscada', precio: 1165.38}
    ]
  },
  {
    articulo: "C50-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN AGUA SERVIDA METÁLICA",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "PN 16. Agua Servida",
    variantes: [
      {codigo: 'BERC50C2BSP', medida: '2" Roscada', precio: 2780.41},
      {codigo: 'BERC50C216', medida: '2" Bridada', precio: 2860.86},
      {codigo: 'BERC50C316', medida: '3" Bridada', precio: 2973.92}
    ]
  },
  // VÁLVULAS DE AIRE VALLOY
  {
    articulo: "VAC313",
    nombre: "VÁLVULA AIRE VALLOY NOMINAL",
    categoria: "Válvulas de Aire",
    marca: "VALLOY",
    descripcion: "PN 16. Agua Servida. OPCIONAL AISI",
    variantes: [
      {codigo: 'VALVEC313FD50', medida: '2" Bridada', precio: 1191.91},
      {codigo: 'VALVEC313FD80', medida: '3" Bridada', precio: 1332.58},
      {codigo: 'VALVEC313FD100', medida: '4" Bridada', precio: 2099.63},
      {codigo: 'VALVEC313FD150', medida: '6" Bridada', precio: 3205.05},
      {codigo: 'VALVEC313FD200', medida: '8" Bridada', precio: 6149.23}
    ]
  },
  {
    articulo: "VA306",
    nombre: "VÁLVULA AIRE VALLOY AYSA",
    categoria: "Válvulas de Aire",
    marca: "VALLOY",
    descripcion: "PN 16. Agua Servida. Aprobada AYSA",
    variantes: [
      {codigo: 'VALVA306ACD50', medida: '2" Bridada', precio: 2493.77},
      {codigo: 'VALVA306ACD80', medida: '3" Bridada', precio: 2605.57},
      {codigo: 'VALVA306ACD100', medida: '4" Bridada', precio: 2749.32},
      {codigo: 'VALVA306ACD150', medida: '6" Bridada', precio: 2934.60},
      {codigo: 'VALVA306ACD200', medida: '8" Bridada', precio: 3303.02}
    ]
  },
  // ACCESORIOS PVC ERA
  {
    articulo: "GP005",
    nombre: "RAMAL T NORMAL PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectado CL 10 JE",
    variantes: [
      {codigo: 'ERATEJG75', medida: 'DN75', precio: 23.86},
      {codigo: 'ERATEJG90', medida: 'DN90', precio: 39.68},
      {codigo: 'ERATEJG110', medida: 'DN110', precio: 42.30},
      {codigo: 'ERATEJG125', medida: 'DN125', precio: 63.79},
      {codigo: 'ERATEJG160', medida: 'DN160', precio: 87.48},
      {codigo: 'ERATEJG200', medida: 'DN200', precio: 145.00},
      {codigo: 'ERATEJG250', medida: 'DN250', precio: 221.69},
      {codigo: 'ERATEJG315', medida: 'DN315', precio: 421.87},
      {codigo: 'ERATEJG355', medida: 'DN355', precio: 669.54}
    ]
  },
  {
    articulo: "GP016",
    nombre: "CUPLA PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectada CL 10 JE",
    variantes: [
      {codigo: 'ERACUPJG63', medida: 'DN63', precio: 6.42},
      {codigo: 'ERACUPJG75', medida: 'DN75', precio: 17.02},
      {codigo: 'ERACUPJG90', medida: 'DN90', precio: 18.61},
      {codigo: 'ERACUPJG110', medida: 'DN110', precio: 19.63},
      {codigo: 'ERACUPJG125', medida: 'DN125', precio: 33.87},
      {codigo: 'ERACUPJG160', medida: 'DN160', precio: 44.33},
      {codigo: 'ERACUPJG200', medida: 'DN200', precio: 81.08},
      {codigo: 'ERACUPJG225', medida: 'DN225', precio: 86.16},
      {codigo: 'ERACUPJG250', medida: 'DN250', precio: 100.25},
      {codigo: 'ERACUPJG315', medida: 'DN315', precio: 182.78},
      {codigo: 'ERACUPJG355', medida: 'DN355', precio: 281.25}
    ]
  },
  {
    articulo: "GP017",
    nombre: "ADAPTADOR DE BRIDA PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectado CL 10 JE",
    variantes: [
      {codigo: 'ERAABRJG63', medida: 'DN63', precio: 15.28},
      {codigo: 'ERAABRJG75', medida: 'DN75', precio: 15.87},
      {codigo: 'ERAABRJG90', medida: 'DN90', precio: 18.18},
      {codigo: 'ERAABRJG110', medida: 'DN110', precio: 22.26},
      {codigo: 'ERAABRJG160', medida: 'DN160', precio: 41.42},
      {codigo: 'ERAABRJG200', medida: 'DN200', precio: 71.64},
      {codigo: 'ERAABRJG250', medida: 'DN250', precio: 128.15},
      {codigo: 'ERAABRJG315', medida: 'DN315', precio: 157.64},
      {codigo: 'ERAABRJG355', medida: 'DN355', precio: 211.97}
    ]
  },
  // ELECTROFUSIÓN PEAD
  {
    articulo: "EF-CUPLA",
    nombre: "CUPLA ELECTROFUSIÓN PEAD",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT9020040502', medida: 'DN50', precio: 7.16},
      {codigo: 'PMT9020040632', medida: 'DN63', precio: 7.72},
      {codigo: 'PMT9020040752', medida: 'DN75', precio: 10.24},
      {codigo: 'PMT9020040902', medida: 'DN90', precio: 11.92},
      {codigo: 'PMT9020041102', medida: 'DN110', precio: 20.16},
      {codigo: 'PMT9020041602', medida: 'DN160', precio: 37.84},
      {codigo: 'PMT9020042002', medida: 'DN200', precio: 87.36},
      {codigo: 'PMT9020042502', medida: 'DN250', precio: 133.72},
      {codigo: 'PMT9020043152', medida: 'DN315', precio: 240.24},
      {codigo: 'PMT9020043552', medida: 'DN355', precio: 332.48},
      {codigo: 'PMT9020044002', medida: 'DN400', precio: 531.88}
    ]
  },
  {
    articulo: "EF-CODO90",
    nombre: "CODO 90° ELECTROFUSIÓN PEAD",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT9020060502', medida: 'DN50', precio: 10.55},
      {codigo: 'PMT9020060632', medida: 'DN63', precio: 11.77},
      {codigo: 'PMT9020060752', medida: 'DN75', precio: 20.16},
      {codigo: 'PMT9020060902', medida: 'DN90', precio: 28.80},
      {codigo: 'PMT9020061102', medida: 'DN110', precio: 36.32},
      {codigo: 'PMT9020061602', medida: 'DN160', precio: 112.56},
      {codigo: 'PMT9020062002', medida: 'DN200', precio: 199.92}
    ]
  },
  {
    articulo: "EF-TE",
    nombre: "TE ELECTROFUSIÓN PEAD",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT9020070502', medida: 'DN50', precio: 16.80},
      {codigo: 'PMT9020070632', medida: 'DN63', precio: 17.48},
      {codigo: 'PMT9020070752', medida: 'DN75', precio: 35.28},
      {codigo: 'PMT9020070902', medida: 'DN90', precio: 38.80},
      {codigo: 'PMT9020071102', medida: 'DN110', precio: 41.56},
      {codigo: 'PMT9020071602', medida: 'DN160', precio: 171.88},
      {codigo: 'PMT9020072002', medida: 'DN200', precio: 246.96}
    ]
  },
  // CAUDALÍMETROS
  {
    articulo: "TURBO-IR-M",
    nombre: "CAUDALÍMETRO TURBO-IR-M",
    categoria: "Caudalímetros",
    marca: "BERMAD",
    descripcion: "Con registro magnético y pulso",
    variantes: [
      {codigo: 'BERTIRM50', medida: '2" (35m³/h)', precio: 446.75},
      {codigo: 'BERTIRM80', medida: '3" (75m³/h)', precio: 483.68},
      {codigo: 'BERTIRM100', medida: '4" (125m³/h)', precio: 537.93},
      {codigo: 'BERTIRM150', medida: '6" (250m³/h)', precio: 848.45},
      {codigo: 'BERTIRM200', medida: '8" (450m³/h)', precio: 938.49},
      {codigo: 'BERTIRM250', medida: '10" (600m³/h)', precio: 1542.21},
      {codigo: 'BERTIRM300', medida: '12" (800m³/h)', precio: 1927.76}
    ]
  },
  {
    articulo: "TURBO-BAR-M",
    nombre: "CAUDALÍMETRO WOLTMAN",
    categoria: "Caudalímetros",
    marca: "BERMAD",
    descripcion: "Tipo Woltman",
    variantes: [
      {codigo: 'WPH50', medida: '2" (40m³/h)', precio: 527.55},
      {codigo: 'WPH80', medida: '3" (63m³/h)', precio: 672.99},
      {codigo: 'WPH100', medida: '4" (100m³/h)', precio: 881.93},
      {codigo: 'WPH150', medida: '6" (250m³/h)', precio: 1304.41},
      {codigo: 'WPH200', medida: '8" (400m³/h)', precio: 1639.17},
      {codigo: 'WPH250', medida: '10" (630m³/h)', precio: 2365.26},
      {codigo: 'WPH300', medida: '12" (1000m³/h)', precio: 3947.63},
      {codigo: 'WPH350', medida: '14" (1200m³/h)', precio: 5442.72}
    ]
  },
  // ACCESORIOS VARIOS
  {
    articulo: "JUNTAMAS",
    nombre: "REPARACIÓN PARA CAÑOS PVC",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    variantes: [
      {codigo: 'JUNTAMAS1212', medida: 'Ø40', precio: 13.10},
      {codigo: 'JUNTAMAS1201', medida: 'Ø50', precio: 16.64},
      {codigo: 'JUNTAMAS1202', medida: 'Ø63', precio: 18.67},
      {codigo: 'JUNTAMAS1203', medida: 'Ø75', precio: 21.42},
      {codigo: 'JUNTAMAS1204', medida: 'Ø90', precio: 25.25},
      {codigo: 'JUNTAMAS1205', medida: 'Ø110', precio: 27.62},
      {codigo: 'JUNTAMAS1206', medida: 'Ø160', precio: 42.69}
    ]
  },
  {
    articulo: "JUNTAS-PLANA",
    nombre: "ARO DE GOMA PLANA",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Con tela",
    variantes: [
      {codigo: 'PEJPDN50', medida: 'DN50', precio: 5.91},
      {codigo: 'PEJPDN65', medida: 'DN65', precio: 6.52},
      {codigo: 'PEJPDN80', medida: 'DN80', precio: 6.29},
      {codigo: 'PEJPDN100', medida: 'DN100', precio: 10.24},
      {codigo: 'PEJPDN150', medida: 'DN150', precio: 12.29},
      {codigo: 'PEJPDN200', medida: 'DN200', precio: 15.72},
      {codigo: 'PEJPDN250', medida: 'DN250', precio: 22.60},
      {codigo: 'PEJPDN300', medida: 'DN300', precio: 27.50},
      {codigo: 'PEJPDN350', medida: 'DN350', precio: 37.81},
      {codigo: 'PEJPDN400', medida: 'DN400', precio: 48.61}
    ]
  },
  {
    articulo: "BULONES",
    nombre: "BULONES GALVANIZADOS",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Bulón + 2 Arandelas + Tuerca",
    variantes: [
      {codigo: 'PEBUL58X3Z', medida: '5/8x3" Brida50-65', precio: 6.69},
      {codigo: 'PEBUL58X312Z', medida: '5/8x3.5" Brida80-100', precio: 7.24},
      {codigo: 'PEBUL58X4Z', medida: '5/8x4" Brida150', precio: 7.83},
      {codigo: 'PEBUL34X312Z', medida: '3/4x3.5" Brida200', precio: 10.81},
      {codigo: 'PEBUL34X4Z', medida: '3/4x4" Brida250-300', precio: 11.66},
      {codigo: 'PEBUL1X412Z', medida: '1x4.5" Brida400-500', precio: 32.22}
    ]
  },
  {
    articulo: "HIDRANTES",
    nombre: "HIDRANTE A BOLA",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Con conexión a PVC. Pintura epoxi.",
    variantes: [
      {codigo: 'PEHIDRBOINT65PVC', medida: 'DN63 PVC', precio: 354.32},
      {codigo: 'PEHIDRBOINT75PVC', medida: 'DN75 PVC', precio: 354.80},
      {codigo: 'PEHIDRBOINT6510', medida: 'DN65 Bridado', precio: 397.17},
      {codigo: 'PEHIDRBOINT8010', medida: 'DN80 Bridado', precio: 393.00}
    ]
  }
];

// ============ CATÁLOGO COMBINADO ============
const CATALOGO_COMPLETO = [...CATALOGO_GENEBRE, ...CATALOGO_TODOVALVULAS];


// ========================================
// FUNCIONES DE BÚSQUEDA INTELIGENTE
// ========================================

/**
 * Decodifica un código GENEBRE completo
 * Ejemplo: "001210912" -> { articulo: "2109", medida: "4\"", ... }
 */
function decodificarCodigo(codigo) {
  // Limpiar código
  codigo = codigo.replace(/\s/g, '').toUpperCase();
  
  // Quitar prefijo 001 si existe
  if (codigo.startsWith('001')) {
    codigo = codigo.substring(3);
  }
  
  // El código restante es ARTICULO + MEDIDA (últimos 2 dígitos)
  if (codigo.length < 3) return null;
  
  const codigoMedida = codigo.slice(-2);
  const articulo = codigo.slice(0, -2);
  
  // Buscar artículo en catálogo
  const producto = CATALOGO_GENEBRE.find(p => p.articulo === articulo);
  if (!producto) return null;
  
  // Buscar variante
  const variante = producto.variantes.find(v => v.codigo === codigoMedida);
  if (!variante) return null;
  
  return {
    codigoCompleto: `001${articulo}${codigoMedida}`,
    articulo: articulo,
    nombre: producto.nombre,
    categoria: producto.categoria,
    material: producto.material,
    medida: variante.medida,
    precio: variante.precio,
    descripcion: producto.descripcion
  };
}

/**
 * Busca productos por número de artículo
 */
function buscarPorArticulo(articulo) {
  articulo = articulo.replace(/\s/g, '').toUpperCase();
  return CATALOGO_COMPLETO.filter(p => p.articulo === articulo || p.articulo.toUpperCase().includes(articulo));
}

/**
 * Busca productos por palabras clave
 */
function buscarPorKeywords(texto) {
  const keywords = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .split(/\s+/)
    .filter(k => k.length > 2);
  
  if (keywords.length === 0) return [];
  
  return CATALOGO_COMPLETO.filter(producto => {
    const searchText = `${producto.nombre} ${producto.categoria} ${producto.material || ''} ${producto.tipo || ''} ${producto.descripcion || ''} ${producto.marca || 'GENEBRE'}`
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Debe coincidir con todas las keywords
    return keywords.every(kw => searchText.includes(kw));
  });
}

/**
 * Busca productos por medida específica
 */
function buscarPorMedida(medida, productos = CATALOGO_COMPLETO) {
  // Normalizar medida
  medida = medida.replace(/\s/g, '').toLowerCase()
    .replace('pulgadas', '"').replace('pulgada', '"')
    .replace('pulg', '"').replace('"', '"');
  
  if (!medida.includes('"')) {
    medida = medida + '"';
  }
  
  return productos.filter(p => 
    p.variantes.some(v => v.medida.replace(/\s/g, '').toLowerCase() === medida)
  );
}

/**
 * Búsqueda inteligente principal
 */
function busquedaInteligente(consulta) {
  const resultados = {
    tipo: null,
    productos: [],
    mensaje: ''
  };
  
  // 1. Intentar decodificar como código completo
  const codigoMatch = consulta.match(/0{0,3}(\d{4,6}[A-Z]?\d{0,2})/i);
  if (codigoMatch) {
    const codigo = codigoMatch[1];
    
    // Si tiene suficientes dígitos para ser código completo
    if (codigo.length >= 5) {
      const decoded = decodificarCodigo(codigo);
      if (decoded) {
        resultados.tipo = 'codigo_exacto';
        resultados.productos = [decoded];
        resultados.mensaje = `Encontré el producto por código:`;
        return resultados;
      }
    }
    
    // Buscar como artículo
    const porArticulo = buscarPorArticulo(codigo.slice(0, 4));
    if (porArticulo.length > 0) {
      resultados.tipo = 'articulo';
      resultados.productos = porArticulo;
      resultados.mensaje = `Encontré ${porArticulo.length} artículo(s) que coinciden:`;
      return resultados;
    }
  }
  
  // 2. Buscar por palabras clave
  const porKeywords = buscarPorKeywords(consulta);
  
  // 3. Detectar medida en la consulta
  const medidaMatch = consulta.match(/(\d+\s*\d*\/?\d*)\s*[""]?(?:pulgadas?|pulg)?[""]?/i);
  
  if (porKeywords.length > 0) {
    let productosFinales = porKeywords;
    
    // Filtrar por medida si se especificó
    if (medidaMatch) {
      const medida = medidaMatch[1];
      const filtrados = buscarPorMedida(medida, porKeywords);
      if (filtrados.length > 0) {
        productosFinales = filtrados;
      }
    }
    
    resultados.tipo = 'keywords';
    resultados.productos = productosFinales.slice(0, 10); // Limitar a 10 resultados
    resultados.mensaje = `Encontré ${productosFinales.length} producto(s) que coinciden:`;
    return resultados;
  }
  
  // 4. Solo medida
  if (medidaMatch) {
    const porMedida = buscarPorMedida(medidaMatch[1]);
    if (porMedida.length > 0) {
      resultados.tipo = 'medida';
      resultados.productos = porMedida.slice(0, 10);
      resultados.mensaje = `Tenemos ${porMedida.length} productos en medida ${medidaMatch[1]}":`;
      return resultados;
    }
  }
  
  // Sin resultados
  resultados.tipo = 'sin_resultados';
  resultados.mensaje = 'No encontré productos con esos criterios. Podés buscar por:\n- Código (ej: 2109, 001210912)\n- Tipo (ej: válvula esfera inox)\n- Medida (ej: 2 pulgadas)';
  return resultados;
}

/**
 * Formatea resultados de búsqueda para WhatsApp
 */
function formatearResultados(resultados) {
  if (resultados.tipo === 'sin_resultados') {
    return resultados.mensaje;
  }
  
  let respuesta = resultados.mensaje + '\n\n';
  
  if (resultados.tipo === 'codigo_exacto') {
    const p = resultados.productos[0];
    const marca = p.marca || 'GENEBRE';
    respuesta += `*${marca} - Art. ${p.articulo}* - ${p.nombre}\n`;
    respuesta += `Medida: ${p.medida}\n`;
    respuesta += `Material: ${p.material}\n`;
    respuesta += `Precio lista: USD ${p.precio.toFixed(2)}\n`;
    respuesta += `Código: ${p.codigoCompleto}`;
  } else {
    for (const producto of resultados.productos.slice(0, 5)) {
      const marca = producto.marca || 'GENEBRE';
      respuesta += `*${marca} - Art. ${producto.articulo}* - ${producto.nombre}\n`;
      if (producto.material) respuesta += `${producto.material}\n`;
      
      // Mostrar hasta 6 variantes
      const variantes = producto.variantes.slice(0, 6);
      const precios = variantes.map(v => `${v.medida}: USD ${v.precio.toFixed(2)}`).join(' | ');
      respuesta += `${precios}`;
      
      if (producto.variantes.length > 6) {
        respuesta += ` (+${producto.variantes.length - 6} medidas más)`;
      }
      respuesta += '\n\n';
    }
    
    if (resultados.productos.length > 5) {
      respuesta += `... y ${resultados.productos.length - 5} producto(s) más. Podés especificar más tu búsqueda.`;
    }
  }
  
  return respuesta.trim();
}

// ========================================
// SISTEMA DEL BOT
// ========================================

const SYSTEM_PROMPT = `Sos el asistente virtual de VAL ARG S.R.L., distribuidora de válvulas e instrumentación industrial en Argentina.

DATOS DE LA EMPRESA:
- Dirección: 14 de Julio 175, Paternal, Capital Federal
- Horario: Lunes a Viernes 9:00 a 18:00
- Teléfono/WhatsApp: +54 11 2592-8529
- Email: ventas@val-ar.com.ar
- Web: www.val-ar.com.ar

MARCAS QUE DISTRIBUIMOS:
- GENEBRE: Válvulas esfera, mariposa, retención, filtros, electroválvulas (inox, latón, hierro, PVC)
- TODOVALVULAS: Esclusas, mariposas, retención fundición
- CODITAL: Válvulas latón, reductoras presión, filtros, esfera inox
- BERMAD: Válvulas de aire, caudalímetros
- VALLOY: Válvulas de aire agua servida
- ERA: Accesorios PVC (tees, cuplas, adaptadores brida)
- CEPEX: Válvulas PVC/PP para industria química
- KITO: Válvulas mariposa industriales
- AERRE: Actuadores neumáticos
- WINTERS: Manómetros y termómetros
- CENI: Válvulas esfera industriales
- DANFOSS: Presostatos

CONDICIONES COMERCIALES:
- Precios en USD (dólares americanos) cotización BNA billete vendedor
- Los precios NO incluyen IVA (21%)
- Validez de la oferta: 5 días
- Si hay diferencia de cambio ±3% entre acreditación de fondos y fecha de factura, se emite nota de débito/crédito

SISTEMA DE CÓDIGOS GENEBRE:
Los códigos tienen formato: 001 + ARTÍCULO + MEDIDA
- Ejemplo: 001210912 = Art. 2109 (Mariposa Wafer ANSI) en 4"
- Códigos de medida: 02=1/4", 03=3/8", 04=1/2", 05=3/4", 06=1", 07=1 1/4", 08=1 1/2", 09=2", 10=2 1/2", 11=3", 12=4", 13=5", 14=6", 16=8", 18=10", 20=12"

INSTRUCCIONES:
1. Respondé de forma breve y amigable, estilo WhatsApp
2. Usá español argentino (vos, tenés)
3. NO uses markdown ni asteriscos, texto plano
4. Respuestas cortas (3-4 oraciones máximo)
5. Los precios son de LISTA en USD, pueden tener descuentos por volumen
6. Si preguntan condiciones comerciales, IVA o forma de pago, mencioná las condiciones
7. Para stock, disponibilidad o pedidos: indicá que un vendedor va a contactar
8. Si preguntan algo que requiere cotización formal o pedido, marcá [ESCALAR]
9. Si piden hablar con una persona o dicen "urgente", marcá [ESCALAR]

FUNCIONES DE BÚSQUEDA:
Cuando el usuario busque productos, usá la información que te paso del catálogo.
Si no encontrás algo específico, ofrecé alternativas o pedí más detalles.`;

// Detectar si requiere escalado a vendedor
function requiereEscalado(mensaje) {
  const triggers = [
    'hablar con alguien', 'hablar con una persona', 'vendedor', 'persona real',
    'urgente', 'hacer un pedido', 'quiero comprar', 'necesito cotización',
    'cotizar', 'presupuesto', 'factura', 'cuenta corriente', 'forma de pago'
  ];
  const msgLower = mensaje.toLowerCase();
  return triggers.some(t => msgLower.includes(t));
}

// Normalizar número argentino
function normalizarNumero(numero) {
  let clean = numero.replace(/\D/g, '');
  if (clean.startsWith('549') && clean.length === 13) {
    clean = '54' + clean.substring(3);
  }
  return clean;
}

// Obtener o crear conversación
function obtenerConversacion(numero) {
  if (!conversaciones.has(numero)) {
    conversaciones.set(numero, {
      mensajes: [],
      ultimaActividad: Date.now()
    });
  }
  return conversaciones.get(numero);
}

// Agregar mensaje a la conversación
function agregarMensaje(numero, rol, contenido) {
  const conv = obtenerConversacion(numero);
  conv.mensajes.push({ role: rol, content: contenido });
  conv.ultimaActividad = Date.now();
  
  // Mantener solo los últimos N mensajes
  if (conv.mensajes.length > MAX_MENSAJES_MEMORIA * 2) {
    conv.mensajes = conv.mensajes.slice(-MAX_MENSAJES_MEMORIA * 2);
  }
}

// Enviar mensaje WhatsApp
async function enviarMensaje(numero, texto) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: numero,
          type: 'text',
          text: { body: texto }
        })
      }
    );
    return await response.json();
  } catch (error) {
    console.error('Error enviando mensaje:', error);
  }
}

// Procesar mensaje con Claude
async function procesarConClaude(numero, mensajeUsuario) {
  // Primero hacer búsqueda en catálogo
  const resultadosBusqueda = busquedaInteligente(mensajeUsuario);
  let contextoProductos = '';
  
  if (resultadosBusqueda.productos.length > 0) {
    contextoProductos = '\n\nRESULTADOS DE BÚSQUEDA EN CATÁLOGO:\n' + formatearResultados(resultadosBusqueda);
  }
  
  const conv = obtenerConversacion(numero);
  
  // Agregar mensaje del usuario
  agregarMensaje(numero, 'user', mensajeUsuario);
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT + contextoProductos,
      messages: conv.mensajes
    });
    
    const respuestaBot = response.content[0].text;
    
    // Guardar respuesta
    agregarMensaje(numero, 'assistant', respuestaBot);
    
    return respuestaBot;
  } catch (error) {
    console.error('Error con Claude:', error);
    return 'Disculpá, tuve un problema técnico. ¿Podés repetir tu consulta?';
  }
}

// ========================================
// ENDPOINTS
// ========================================

// Verificación webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verificado!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recibir mensajes
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages;
          
          if (messages && messages.length > 0) {
            const msg = messages[0];
            const numero = normalizarNumero(msg.from);
            const texto = msg.text?.body || '';
            
            console.log(`Mensaje de ${numero}: ${texto}`);
            
            // Verificar si requiere escalado
            if (requiereEscalado(texto)) {
              await enviarMensaje(numero, 
                'Entendido, voy a derivarte con un vendedor que te va a contactar a la brevedad. Gracias por comunicarte con VAL ARG!'
              );
              // Aquí podrías notificar al vendedor
              console.log(`[ESCALAR] Mensaje de ${numero} requiere atención humana`);
            } else {
              // Procesar con Claude
              const respuesta = await procesarConClaude(numero, texto);
              
              // Verificar si Claude marcó escalado
              if (respuesta.includes('[ESCALAR]')) {
                const respuestaLimpia = respuesta.replace('[ESCALAR]', '').trim();
                await enviarMensaje(numero, respuestaLimpia);
                console.log(`[ESCALAR] Respuesta de Claude requiere escalado`);
              } else {
                await enviarMensaje(numero, respuesta);
              }
            }
          }
        }
      }
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});

// Health check
app.get('/', (req, res) => {
  const stats = {
    status: 'Bot VAL ARG activo',
    conversaciones: conversaciones.size,
    productos_catalogo: CATALOGO_GENEBRE.length,
    variantes_totales: CATALOGO_GENEBRE.reduce((acc, p) => acc + p.variantes.length, 0)
  };
  res.json(stats);
});

// Test de búsqueda (para debug)
app.get('/buscar/:query', (req, res) => {
  const resultado = busquedaInteligente(req.params.query);
  res.json({
    query: req.params.query,
    resultado: resultado,
    formateado: formatearResultados(resultado)
  });
});

// Limpiar conversaciones viejas cada hora
setInterval(() => {
  const ahora = Date.now();
  const unaHora = 60 * 60 * 1000;
  
  for (const [numero, conv] of conversaciones) {
    if (ahora - conv.ultimaActividad > unaHora) {
      conversaciones.delete(numero);
    }
  }
}, 60 * 60 * 1000);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot VAL ARG corriendo en puerto ${PORT}`);
  console.log(`Catálogo GENEBRE: ${CATALOGO_GENEBRE.length} artículos`);
  console.log(`Catálogo TODOVALVULAS: ${CATALOGO_TODOVALVULAS.length} artículos`);
  console.log(`Total artículos: ${CATALOGO_GENEBRE.length + CATALOGO_TODOVALVULAS.length}`);
  console.log(`Total variantes: ${CATALOGO_GENEBRE.reduce((acc, p) => acc + p.variantes.length, 0) + CATALOGO_TODOVALVULAS.reduce((acc, p) => acc + p.variantes.length, 0)}`);
});
