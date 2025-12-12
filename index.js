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
// CATÁLOGO TODOVALVULAS - Extraído del PDF Lista N°16 2025

const CATALOGO_TODOVALVULAS = [
  // ============ VÁLVULAS DE FUNDICIÓN ============
  {
    articulo: "930",
    nombre: "VÁLVULA ESCLUSA TODOVALVULAS",
    categoria: "Fundición",
    marca: "TODOVALVULAS",
    material: "Cuerpo y Cuña GGG50 + Epoxy Azul, cierre EPDM",
    descripcion: "Bridada ISO 7005 - PN 10/16. Entre Caras: DIN 3202 F4 o F5. Vástago no Ascendente. Accionamiento con CAP (C) y Volante (V).",
    variantes: [
      {codigo: 'ANC93050F4C10', medida: 'DN50 Corto', precio: 114.81},
      {codigo: 'ANC93050F4V10', medida: 'DN50 Corto Volante', precio: 114.81},
      {codigo: 'ANC93065F4C10', medida: 'DN65 Corto', precio: 137.49},
      {codigo: 'ANC93065F4V10', medida: 'DN65 Corto Volante', precio: 137.49},
      {codigo: 'ANC93065F5C10', medida: 'DN65 Largo', precio: 144.36},
      {codigo: 'ANC93080F4C10', medida: 'DN80 Corto', precio: 159.70},
      {codigo: 'ANC93080F4V10', medida: 'DN80 Corto Volante', precio: 159.70},
      {codigo: 'ANC93080F5C10', medida: 'DN80 Largo', precio: 173.21},
      {codigo: 'ANC930100F4C10', medida: 'DN100 Corto', precio: 178.00},
      {codigo: 'ANC930100F4V10', medida: 'DN100 Corto Volante', precio: 178.00},
      {codigo: 'ANC930100F5C10', medida: 'DN100 Largo', precio: 203.45},
      {codigo: 'ANC930125F4C10', medida: 'DN125 Corto', precio: 271.57},
      {codigo: 'ANC930150F4C10', medida: 'DN150 Corto', precio: 320.31},
      {codigo: 'ANC930150F4V10', medida: 'DN150 Corto Volante', precio: 320.31},
      {codigo: 'ANC930150F5C10', medida: 'DN150 Largo', precio: 353.27},
      {codigo: 'ANC930150F5V10', medida: 'DN150 Largo Volante', precio: 353.27},
      {codigo: 'ANC930200F4C10', medida: 'DN200 Corto', precio: 492.19},
      {codigo: 'ANC930200F4V10', medida: 'DN200 Corto Volante', precio: 492.19},
      {codigo: 'ANC930200F4V16', medida: 'DN200 Corto PN16', precio: 492.19},
      {codigo: 'ANC930200F5C10', medida: 'DN200 Largo', precio: 555.34},
      {codigo: 'ANC930200F5C16', medida: 'DN200 Largo PN16', precio: 555.34},
      {codigo: 'ANC930200F5V16', medida: 'DN200 Largo Volante PN16', precio: 555.34},
      {codigo: 'ANC930250F4C10', medida: 'DN250 Corto', precio: 780.72},
      {codigo: 'ANC930250F4V10', medida: 'DN250 Corto Volante', precio: 780.72},
      {codigo: 'ANC930250F4V16', medida: 'DN250 Corto PN16', precio: 780.72},
      {codigo: 'ANC930250F5C10', medida: 'DN250 Largo', precio: 858.79},
      {codigo: 'ANC930300F4C10', medida: 'DN300 Corto', precio: 1024.15},
      {codigo: 'ANC930300F4V10', medida: 'DN300 Corto Volante', precio: 1024.15},
      {codigo: 'ANC930300F4V16', medida: 'DN300 Corto PN16', precio: 1024.15},
      {codigo: 'ANC930350F4C10', medida: 'DN350 Corto', precio: 1771.25},
      {codigo: 'ANC930400F4C10', medida: 'DN400 Corto', precio: 3107.84},
      {codigo: 'ANC930400F4V10', medida: 'DN400 Corto Volante', precio: 3107.84},
      {codigo: 'ANC930500F4C10', medida: 'DN500 Corto', precio: 3876.54},
      {codigo: 'ANC930500F4H10', medida: 'DN500 Corto', precio: 3876.54}
    ]
  },
  {
    articulo: "930PVC",
    nombre: "VÁLVULA ESCLUSA ENCHUFE A PVC",
    categoria: "Fundición",
    marca: "TODOVALVULAS",
    material: "Cuerpo y Cuña GGG50 + Epoxy Azul, Cierre EPDM",
    descripcion: "Enchufe a PVC PN 16. Entre Caras: DIN 3202 F5. Vástago no Ascendente, Accionamiento a CAP.",
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
    descripcion: "DIN 3202 Presión de trabajo PN10 PN16 PN25",
    variantes: [
      {codigo: 'ANCSCHV10010', medida: 'DN100 ISO10', precio: 319.20},
      {codigo: 'ANCSCHV15010', medida: 'DN150 ISO10', precio: 589.40},
      {codigo: 'ANCSCHV20010', medida: 'DN200 ISO10', precio: 896.35},
      {codigo: 'ANCSCHV25010', medida: 'DN250 ISO10', precio: 1706.95},
      {codigo: 'ANCSCHV30010', medida: 'DN300 ISO10', precio: 2298.80}
    ]
  },
  {
    articulo: "398",
    nombre: "VÁLVULA RETENCIÓN A BOLA ROSCADA",
    categoria: "Fundición",
    marca: "CODITAL",
    material: "Cuerpo Fundición Gris GG-25/50 + Epoxy Azul",
    descripcion: "Roscada HH BSP. Temp.max. 80°C. Bola de Acero + EPDM. Juntas EPDM.",
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
    descripcion: "Bridada PN 10/16 (EN 1092-2). Entre caras: DIN 3202 F6. Temp.max. 80°C. Bola de acero + EPDM y juntas de EPDM.",
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
  // ============ VÁLVULAS MARIPOSA ============
  {
    articulo: "710",
    nombre: "VÁLVULA MARIPOSA WAFER",
    categoria: "Mariposa",
    marca: "TODOVALVULAS",
    material: "Cuerpo GGG50 - Disco AISI 304 - Asiento EPDM",
    descripcion: "Wafer para colocar entre ISO PN 10/16 o ANSI 16.5 (#150). Entre Caras: ISO 5752 S.20. Accionamiento a Palanca DN 50 a 200, con Reductor DN 100 en adelante.",
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
    descripcion: "Accionamiento a palanca 50 a 200 y con reductor desde DN 250 hasta DN 300. ANSI #150.",
    variantes: [
      {codigo: 'ANC71150G40CF8LA5', medida: 'DN50 ANSI#150 Palanca', precio: 72.84},
      {codigo: 'ANC71165G40CF8LA5', medida: 'DN65 ANSI#150 Palanca', precio: 86.07},
      {codigo: 'ANC71180G40CF8LA5', medida: 'DN80 ANSI#150 Palanca', precio: 96.34},
      {codigo: 'ANC711100G40CF8LA5', medida: 'DN100 ANSI#150 Palanca', precio: 128.27},
      {codigo: 'ANC711125G40CF8LA5', medida: 'DN125 ANSI#150 Palanca', precio: 128.47},
      {codigo: 'ANC711150G40CF8LA5', medida: 'DN150 ANSI#150 Palanca', precio: 214.32},
      {codigo: 'ANC711200G40CF8LA5', medida: 'DN200 ANSI#150 Palanca', precio: 368.58},
      {codigo: 'ANC711250G40CF8GA5', medida: 'DN250 ANSI#150 Reductor', precio: 655.36},
      {codigo: 'ANC711300G40CF8GA5', medida: 'DN300 ANSI#150 Reductor', precio: 900.15}
    ]
  },
  {
    articulo: "740",
    nombre: "VÁLVULA MARIPOSA PTFE",
    categoria: "Mariposa",
    marca: "TODOVALVULAS",
    material: "Cuerpo GGG50 - Disco AISI 304 - Asiento PTFE",
    descripcion: "Accionamiento a palanca. Multiposición.",
    variantes: [
      {codigo: 'ANC74050G40CF8LM', medida: 'DN50 Palanca', precio: 229.42},
      {codigo: 'ANC74065G40CF8LM', medida: 'DN65 Palanca', precio: 273.29},
      {codigo: 'ANC74080G40CF8LM', medida: 'DN80 Palanca', precio: 310.73},
      {codigo: 'ANC740100G40CF8LM', medida: 'DN100 Palanca', precio: 439.53},
      {codigo: 'ANC740125G40CF8LM', medida: 'DN125 Palanca', precio: 615.42},
      {codigo: 'ANC740150G40CF8LM', medida: 'DN150 Palanca', precio: 786.48},
      {codigo: 'ANC740200G40CF8LM', medida: 'DN200 Palanca', precio: 1286.39}
    ]
  },
  {
    articulo: "810",
    nombre: "VÁLVULA RETENCIÓN DUO CHECK WAFER",
    categoria: "Retención",
    marca: "TODOVALVULAS",
    material: "Cuerpo: GG25/A126 Class B - Disco: CF8 (SS304) - Asiento: EPDM",
    descripcion: "Pin y Resorte: SS304",
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
    material: "Cuerpo EPDM, Bridas de Acero Galvanizado",
    descripcion: "Perforado ISO PN 10 - Temperatura máxima 90 grados",
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
  // ============ VÁLVULAS Y ACCESORIOS LATÓN ============
  {
    articulo: "1501",
    nombre: "VÁLVULA REDUCTORA DE PRESIÓN",
    categoria: "Latón",
    marca: "CODITAL",
    material: "Cuerpo latón CW617N niquelado",
    descripcion: "Alto caudal PN 25. Pistón de latón (inox a partir de 1 1/4\"). Asiento de inox 304, juntas de EPDM. 2 tomas de 1/4\" para manómetro.",
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
    descripcion: "Cualquier posición, obturador de latón F/F ISO 228-1. TEMP -10°C + 90°C. PN 16-10-8 BAR",
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
    descripcion: "PN16, ISO 228-1. TEMP -10°C + 90°C",
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
    descripcion: "Asiento de NBR. PN 16/10 TEMP -10°C + 90°C. F/F ISO 228-1",
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
    descripcion: "Cuerpo de latón, junta de NBR, varilla roscada 1/4\" de inox, barra plana de inox",
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
    descripcion: "Estanqueidad metal/metal. Cuerpo de latón y bronce, eje latón, muelle inox. PN 16. ISO 228-1",
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
    descripcion: "Cuerpo y tapa de latón, junta de fibra, tamiz de inox 304 desmontable. PN 16 BAR.",
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
    descripcion: "Cuerpo, tapa, eje y compuerta de latón. Junta de PTFE y juntas elásticas de NBR. Volante de fundición. Eje no ascendente. TEMP -10°C + 80°C.",
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
    descripcion: "Cualquier posición, obturador y eje nylon (PA6), junta plana NBR, muelle inox. PN 16-10-8 BAR",
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
    descripcion: "Conector ABS. Apto para todas las válvulas con conexión BSP",
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
  // ============ MANÓMETROS ============
  {
    articulo: "249",
    nombre: "MANÓMETRO INOX CON GLICERINA",
    categoria: "Instrumentación",
    marca: "CODITAL",
    descripcion: "Con relleno de silicona, conexión radial",
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
    descripcion: "Dial seco, conexión radial",
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
    articulo: "251",
    nombre: "MANÓMETRO ABS SECO AXIAL",
    categoria: "Instrumentación",
    marca: "CODITAL",
    descripcion: "Dial seco, conexión axial",
    variantes: [
      {codigo: 'COD2002510052006', medida: '50x1/4" 0-6bar', precio: 6.73},
      {codigo: 'COD2002510052010', medida: '50x1/4" 0-10bar', precio: 6.73},
      {codigo: 'COD2002510063002', medida: '63x1/4" 0-2.5bar', precio: 8.17},
      {codigo: 'COD2002510063006', medida: '63x1/4" 0-6bar', precio: 8.17},
      {codigo: 'COD2002510063010', medida: '63x1/4" 0-10bar', precio: 8.17},
      {codigo: 'COD2002510063016', medida: '63x1/4" 0-16bar', precio: 8.17}
    ]
  },
  // ============ VÁLVULAS DE ESFERA LATÓN ============
  {
    articulo: "120",
    nombre: "VÁLVULA ESFERA H/H PALANCA PLANA SMART",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso estándar. Vástago inexpulsable. BSPP ISO 228-1. Temp: -10°C/+120°C",
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
    nombre: "VÁLVULA ESFERA M/H PALANCA PLANA SMART",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso estándar. Vástago inexpulsable. BSPP ISO 228-1. Temp: -10°C/+120°C",
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
    descripcion: "Latón forjado niquelado. Palanca mariposa. Paso estándar. BSPP ISO 228-1. Temp: -10°C/+120°C",
    variantes: [
      {codigo: 'COD19232Z', medida: '1/2"', precio: 6.97},
      {codigo: 'COD19233Z', medida: '3/4"', precio: 11.26},
      {codigo: 'COD19234Z', medida: '1"', precio: 17.08}
    ]
  },
  {
    articulo: "220",
    nombre: "VÁLVULA ESFERA H/H PALANCA PLANA PASO TOTAL",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Paso total. Vástago inexpulsable. BSPP ISO 228-1. Temp: -10°C/+120°C",
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
    articulo: "251MH",
    nombre: "VÁLVULA ESFERA M/H CON UNIÓN MARIPOSA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Latón forjado niquelado. Palanca mariposa. Paso total. BSPP ISO 228-1. Temp: -10°C/+120°C",
    variantes: [
      {codigo: 'COD29513Z', medida: '1/2"', precio: 12.88},
      {codigo: 'COD29514Z', medida: '3/4"', precio: 23.98},
      {codigo: 'COD29515Z', medida: '1"', precio: 31.00}
    ]
  },
  {
    articulo: "236",
    nombre: "MINI VÁLVULA ESFERA CROMADA H/H",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo y esfera latón cromado. Junta esfera PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29362Z', medida: '3/8"', precio: 7.48},
      {codigo: 'COD29363Z', medida: '1/2"', precio: 7.56}
    ]
  },
  {
    articulo: "237",
    nombre: "MINI VÁLVULA ESFERA CROMADA M/H",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo y esfera latón cromado. Junta esfera PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29372Z', medida: '3/8"', precio: 5.88},
      {codigo: 'COD29373Z', medida: '1/2"', precio: 7.22}
    ]
  },
  {
    articulo: "238",
    nombre: "MINI VÁLVULA ESFERA CROMADA M/M",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo y esfera latón cromado. Junta esfera PTFE, o-ring EPDM",
    variantes: [
      {codigo: 'COD29381Z', medida: '1/4"', precio: 4.72},
      {codigo: 'COD29382Z', medida: '3/8"', precio: 4.80}
    ]
  },
  {
    articulo: "227",
    nombre: "VÁLVULA ESFERA PARA MANGUERA PALANCA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo, esfera, manguito latón cromado. Temp máx 120°C",
    variantes: [
      {codigo: 'COD29273Z', medida: '1/2" x 3/4"', precio: 7.59},
      {codigo: 'COD29274Z', medida: '3/4" x 1"', precio: 10.39}
    ]
  },
  {
    articulo: "248",
    nombre: "VÁLVULA ESFERA PARA MANGUERA MARIPOSA",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo, esfera, manguito latón cromado. Temp máx 120°C",
    variantes: [
      {codigo: 'COD29483Z', medida: '1/2" x 3/4"', precio: 8.13},
      {codigo: 'COD29484Z', medida: '3/4" x 1"', precio: 11.13}
    ]
  },
  {
    articulo: "247",
    nombre: "VÁLVULA ESFERA PARA MANGUERA BLOQUEABLE",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Cuerpo, esfera, manguito latón cromado. Temp máx 120°C. Palanca bloqueable.",
    variantes: [
      {codigo: 'COD29473Z', medida: '1/2" x 3/4"', precio: 10.91}
    ]
  },
  // ============ VÁLVULAS DE ESFERA INOX ============
  {
    articulo: "3446",
    nombre: "VÁLVULA ESFERA INOX H/H 2 PIEZAS BLOQUEABLE",
    categoria: "Esfera Inox",
    marca: "CODITAL",
    material: "Inox 316 CF8M",
    descripcion: "Dos cuerpos, paso total roscada H/H. TEMP -20°C + 180°C. PN 64-50-40-25 BAR. Palanca bloqueable.",
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
    nombre: "VÁLVULA ESFERA INOX H/H 3 PIEZAS BLOQUEABLE",
    categoria: "Esfera Inox",
    marca: "CODITAL",
    material: "Inox 316 CF8M",
    descripcion: "Tres cuerpos, paso total roscada H/H, sin brida ISO. TEMP -20°C + 180°C. PN 64-50-40-25 BAR. Palanca bloqueable.",
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
  // ============ VÁLVULAS DE AIRE BERMAD ============
  {
    articulo: "C30-P",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN PLÁSTICO",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "Cuerpo Plástico. PN 16. Para Agua Potable",
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
    descripcion: "Cuerpo Metálico. PN 16. Para Agua Potable",
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
    descripcion: "Cuerpo Plástico. PN 16. Para Agua Potable",
    variantes: [
      {codigo: 'BERA30P075BSP', medida: '3/4" Roscada', precio: 116.55},
      {codigo: 'BERA30P1BSP', medida: '1" Roscada', precio: 116.55}
    ]
  },
  {
    articulo: "C70-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN NOMINAL",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "Cuerpo Metálico. PN 16. Para Agua Potable, NOMINAL. APROBADA AYSA",
    variantes: [
      {codigo: 'BERC702BSP', medida: '2" Roscada', precio: 787.68},
      {codigo: 'BERC702"', medida: '2" Bridada', precio: 849.20},
      {codigo: 'BERC703"', medida: '3" Bridada', precio: 1200.20},
      {codigo: 'BERC704"', medida: '4" Bridada', precio: 1635.10},
      {codigo: 'BERC706"', medida: '6" Bridada', precio: 2917.44},
      {codigo: 'BERC708"', medida: '8" Bridada', precio: 5156.80}
    ]
  },
  {
    articulo: "C75-C",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN REDUCIDA",
    categoria: "Válvulas de Aire",
    marca: "BERMAD",
    descripcion: "Cuerpo Metálico. PN 16. Para Agua Potable, REDUCIDA",
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
    descripcion: "Cuerpo Plástico. PN 10. Para Agua Servida",
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
    descripcion: "Cuerpo Metálico. PN 16. Para Agua Servida",
    variantes: [
      {codigo: 'BERC50C2BSP', medida: '2" Roscada', precio: 2780.41},
      {codigo: 'BERC50C216', medida: '2" Bridada', precio: 2860.86},
      {codigo: 'BERC50C316', medida: '3" Bridada', precio: 2973.92}
    ]
  },
  // ============ VÁLVULAS DE AIRE VALLOY ============
  {
    articulo: "VAC313",
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN VALLOY NOMINAL",
    categoria: "Válvulas de Aire",
    marca: "VALLOY",
    descripcion: "Cuerpo Metálico. PN 16. Para Agua Servida, NOMINAL. TOTAL OPCIONAL AISI",
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
    nombre: "VÁLVULA AIRE TRIPLE FUNCIÓN VALLOY AGUA SERVIDA",
    categoria: "Válvulas de Aire",
    marca: "VALLOY",
    descripcion: "Cuerpo Metálico PN 16. Para Agua Servida. Aprobada por Aysa",
    variantes: [
      {codigo: 'VALVA306ACD50', medida: '2" Bridada', precio: 2493.77},
      {codigo: 'VALVA306ACD80', medida: '3" Bridada', precio: 2605.57},
      {codigo: 'VALVA306ACD100', medida: '4" Bridada', precio: 2749.32},
      {codigo: 'VALVA306ACD150', medida: '6" Bridada', precio: 2934.60},
      {codigo: 'VALVA306ACD200', medida: '8" Bridada', precio: 3303.02}
    ]
  },
  // ============ ACCESORIOS PVC ERA ============
  {
    articulo: "GP005",
    nombre: "RAMAL T NORMAL PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectado CL 10 JE",
    variantes: [
      {codigo: 'ERA TE JG 75', medida: 'DN75', precio: 23.86},
      {codigo: 'ERA TE JG 90', medida: 'DN90', precio: 39.68},
      {codigo: 'ERA TE JG 110', medida: 'DN110', precio: 42.30},
      {codigo: 'ERA TE JG 125', medida: 'DN125', precio: 63.79},
      {codigo: 'ERA TE JG 160', medida: 'DN160', precio: 87.48},
      {codigo: 'ERA TE JG 200', medida: 'DN200', precio: 145.00},
      {codigo: 'ERA TE JG 250', medida: 'DN250', precio: 221.69},
      {codigo: 'ERA TE JG 315', medida: 'DN315', precio: 421.87},
      {codigo: 'ERA TE JG 355', medida: 'DN355', precio: 669.54}
    ]
  },
  {
    articulo: "GP013",
    nombre: "RAMAL T REDUCIDO PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectado CL 10 JE",
    variantes: [
      {codigo: 'ERA TER JG 75x63', medida: '75x63', precio: 22.26},
      {codigo: 'ERA TER JG 90x63', medida: '90x63', precio: 35.91},
      {codigo: 'ERA TER JG 90x75', medida: '90x75', precio: 38.09},
      {codigo: 'ERA TER JG 110x63', medida: '110x63', precio: 40.12},
      {codigo: 'ERA TER JG 110x75', medida: '110x75', precio: 40.69},
      {codigo: 'ERA TER JG 110x90', medida: '110x90', precio: 41.42},
      {codigo: 'ERA TER JG 160x63', medida: '160x63', precio: 71.64},
      {codigo: 'ERA TER JG 160x75', medida: '160x75', precio: 73.52},
      {codigo: 'ERA TER JG 160x90', medida: '160x90', precio: 75.86},
      {codigo: 'ERA TER JG 160x110', medida: '160x110', precio: 80.36},
      {codigo: 'ERA TER JG 200x75', medida: '200x75', precio: 100.83},
      {codigo: 'ERA TER JG 200x90', medida: '200x90', precio: 107.37},
      {codigo: 'ERA TER JG 200x110', medida: '200x110', precio: 112.89},
      {codigo: 'ERA TER JG 200x160', medida: '200x160', precio: 129.45},
      {codigo: 'ERA TER JG 250x110', medida: '250x110', precio: 157.06},
      {codigo: 'ERA TER JG 250x160', medida: '250x160', precio: 188.58},
      {codigo: 'ERA TER JG 250x200', medida: '250x200', precio: 204.56}
    ]
  },
  {
    articulo: "GP015",
    nombre: "REDUCCIÓN HH PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectada CL 10 JE",
    variantes: [
      {codigo: 'ERA RED JG 90x75', medida: '90x75', precio: 16.73},
      {codigo: 'ERA RED JG 110x63', medida: '110x63', precio: 17.61},
      {codigo: 'ERA RED JG 110x90', medida: '110x90', precio: 18.90},
      {codigo: 'ERA RED JG 160x110', medida: '160x110', precio: 41.73},
      {codigo: 'ERA RED JG 200x110', medida: '200x110', precio: 48.84},
      {codigo: 'ERA RED JG 200x160', medida: '200x160', precio: 52.04},
      {codigo: 'ERA RED JG 250x200', medida: '250x200', precio: 81.37},
      {codigo: 'ERA RED JG 315x200', medida: '315x200', precio: 178.85},
      {codigo: 'ERA RED JG 315x250', medida: '315x250', precio: 195.11},
      {codigo: 'ERA RED JG 355x315', medida: '355x315', precio: 266.57}
    ]
  },
  {
    articulo: "GP016",
    nombre: "CUPLA PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectada CL 10 JE",
    variantes: [
      {codigo: 'ERA CUP JG 63', medida: 'DN63', precio: 6.42},
      {codigo: 'ERA CUP JG 75', medida: 'DN75', precio: 17.02},
      {codigo: 'ERA CUP JG 90', medida: 'DN90', precio: 18.61},
      {codigo: 'ERA CUPJG 110', medida: 'DN110', precio: 19.63},
      {codigo: 'ERA CUP JG 125', medida: 'DN125', precio: 33.87},
      {codigo: 'ERA CUP JG 160', medida: 'DN160', precio: 44.33},
      {codigo: 'ERA CUP JG 200', medida: 'DN200', precio: 81.08},
      {codigo: 'ERA CUP JG 225', medida: 'DN225', precio: 86.16},
      {codigo: 'ERA CUP JG 250', medida: 'DN250', precio: 100.25},
      {codigo: 'ERA CUP JG 315', medida: 'DN315', precio: 182.78},
      {codigo: 'ERA CUP JG 355', medida: 'DN355', precio: 281.25}
    ]
  },
  {
    articulo: "GP017",
    nombre: "ADAPTADOR DE BRIDA PVC",
    categoria: "Accesorios PVC",
    marca: "ERA",
    descripcion: "Inyectado CL 10 JE",
    variantes: [
      {codigo: 'ERA ABR JG 63', medida: 'DN63', precio: 15.28},
      {codigo: 'ERA ABR JG 75', medida: 'DN75', precio: 15.87},
      {codigo: 'ERA ABR JG 90', medida: 'DN90', precio: 18.18},
      {codigo: 'ERA ABR JG 110', medida: 'DN110', precio: 22.26},
      {codigo: 'ERA ABR JG 160', medida: 'DN160', precio: 41.42},
      {codigo: 'ERA ABR JG 200', medida: 'DN200', precio: 71.64},
      {codigo: 'ERA ABR JG 250', medida: 'DN250', precio: 128.15},
      {codigo: 'ERA ABR JG 315', medida: 'DN315', precio: 157.64},
      {codigo: 'ERA ABR JG 355', medida: 'DN355', precio: 211.97}
    ]
  },
  // ============ JUNTAMAS ============
  {
    articulo: "JUNTAMAS",
    nombre: "REPARACIÓN PARA CAÑOS PVC",
    categoria: "Accesorios PVC",
    marca: "TODOVALVULAS",
    variantes: [
      {codigo: 'JUNTAMAS1212', medida: 'PVC Ø40', precio: 13.10},
      {codigo: 'JUNTAMAS1201', medida: 'PVC Ø50', precio: 16.64},
      {codigo: 'JUNTAMAS1202', medida: 'PVC Ø63', precio: 18.67},
      {codigo: 'JUNTAMAS1203', medida: 'PVC Ø75', precio: 21.42},
      {codigo: 'JUNTAMAS1204', medida: 'PVC Ø90', precio: 25.25},
      {codigo: 'JUNTAMAS1205', medida: 'PVC Ø110', precio: 27.62},
      {codigo: 'JUNTAMAS1206', medida: 'PVC Ø160', precio: 42.69},
      {codigo: 'JUNTAMAS1214', medida: 'PVC Extra Larga Ø40', precio: 33.45},
      {codigo: 'JUNTAMAS1207', medida: 'PVC Extra Larga Ø50', precio: 31.92},
      {codigo: 'JUNTAMAS1208', medida: 'PVC Extra Larga Ø63', precio: 35.71},
      {codigo: 'JUNTAMAS1209', medida: 'PVC Extra Larga Ø75', precio: 37.42},
      {codigo: 'JUNTAMAS1210', medida: 'PVC Extra Larga Ø90', precio: 40.28},
      {codigo: 'JUNTAMAS1211', medida: 'PVC Extra Larga Ø110', precio: 45.31},
      {codigo: 'JUNTAMAS1216', medida: 'PVC Extra Larga Ø125', precio: 74.47},
      {codigo: 'JUNTAMAS1215', medida: 'PVC Extra Larga Ø140', precio: 81.31},
      {codigo: 'JUNTAMAS1220', medida: 'PVC Extra Larga Ø160', precio: 107.90},
      {codigo: 'JUNTAMAS1217', medida: 'PVC Extra Larga Ø200', precio: 131.36},
      {codigo: 'JUNTAMAS1218', medida: 'PVC Extra Larga Ø250', precio: 160.06},
      {codigo: 'JUNTAMAS1222', medida: 'PVC Extra Larga Ø315', precio: 241.11}
    ]
  },
  // ============ ELECTROFUSIÓN PEAD ============
  {
    articulo: "EF-BRIDA",
    nombre: "ADAPTADOR DE BRIDA PEAD EF",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT900900502', medida: 'DN50', precio: 4.86},
      {codigo: 'PMT900900632', medida: 'DN63', precio: 5.56},
      {codigo: 'PMT900900752', medida: 'DN75', precio: 7.28},
      {codigo: 'PMT900900902', medida: 'DN90', precio: 9.36},
      {codigo: 'PMT900901102', medida: 'DN110', precio: 14.24},
      {codigo: 'PMT900901602', medida: 'DN160', precio: 34.24},
      {codigo: 'PMT900902002', medida: 'DN200', precio: 61.76},
      {codigo: 'PMT900902502', medida: 'DN250', precio: 106.12},
      {codigo: 'PMT900903152', medida: 'DN315', precio: 152.08},
      {codigo: 'PMT900903552', medida: 'DN355', precio: 227.32},
      {codigo: 'PMT900904002', medida: 'DN400', precio: 299.36}
    ]
  },
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
    articulo: "EF-CODO45",
    nombre: "CODO 45° ELECTROFUSIÓN PEAD",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT9020050502', medida: 'DN50', precio: 11.55},
      {codigo: 'PMT9020050632', medida: 'DN63', precio: 13.81},
      {codigo: 'PMT9020050752', medida: 'DN75', precio: 22.83},
      {codigo: 'PMT9020050902', medida: 'DN90', precio: 28.85},
      {codigo: 'PMT9020051102', medida: 'DN110', precio: 32.87},
      {codigo: 'PMT9020051602', medida: 'DN160', precio: 101.85}
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
      {codigo: 'PMT9020062002', medida: 'DN200', precio: 199.92},
      {codigo: 'PMT9020062502', medida: 'DN250 KIT', precio: 500.64},
      {codigo: 'PMT9020063152', medida: 'DN315 KIT', precio: 942.48}
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
      {codigo: 'PMT9020072002', medida: 'DN200', precio: 246.96},
      {codigo: 'PMT9020072502', medida: 'DN250', precio: 571.52},
      {codigo: 'PMT9020073152', medida: 'DN315', precio: 1081.92}
    ]
  },
  {
    articulo: "EF-RED",
    nombre: "REDUCCIÓN ELECTROFUSIÓN PEAD",
    categoria: "Electrofusión PEAD",
    marca: "TODOVALVULAS",
    descripcion: "SDR 11",
    variantes: [
      {codigo: 'PMT9020963502', medida: '63x50', precio: 19.68},
      {codigo: 'PMT9020975632', medida: '75x63', precio: 22.49},
      {codigo: 'PMT902099075', medida: '90x75', precio: 31.92},
      {codigo: 'PMT90209110902', medida: '110x90', precio: 42.00},
      {codigo: 'PMT902091601102', medida: '160x110', precio: 84.00}
    ]
  },
  // ============ CAUDALÍMETROS ============
  {
    articulo: "TURBO-IR-M",
    nombre: "CAUDALÍMETRO TURBO-IR-M",
    categoria: "Caudalímetros",
    marca: "BERMAD",
    descripcion: "Con registro magnético y pulso. Bridado.",
    variantes: [
      {codigo: 'BERTIRM-50', medida: '2" (35 m³/h)', precio: 446.75},
      {codigo: 'BERTIRM-80', medida: '3" (75 m³/h)', precio: 483.68},
      {codigo: 'BERTIRM-100', medida: '4" (125 m³/h)', precio: 537.93},
      {codigo: 'BERTIRM-150', medida: '6" (250 m³/h)', precio: 848.45},
      {codigo: 'BERTIRM-200', medida: '8" (450 m³/h)', precio: 938.49},
      {codigo: 'BERTIRM-250', medida: '10" (600 m³/h)', precio: 1542.21},
      {codigo: 'BERTIRM-300', medida: '12" (800 m³/h)', precio: 1927.76}
    ]
  },
  {
    articulo: "TURBO-BAR-M",
    nombre: "CAUDALÍMETRO TURBO-BAR-M WOLTMAN",
    categoria: "Caudalímetros",
    marca: "BERMAD",
    descripcion: "Tipo Woltman. Bridado.",
    variantes: [
      {codigo: 'WPH-50', medida: '2" (40 m³/h)', precio: 527.55},
      {codigo: 'WPH-80', medida: '3" (63 m³/h)', precio: 672.99},
      {codigo: 'WPH-100', medida: '4" (100 m³/h)', precio: 881.93},
      {codigo: 'WPH-150', medida: '6" (250 m³/h)', precio: 1304.41},
      {codigo: 'WPH-200', medida: '8" (400 m³/h)', precio: 1639.17},
      {codigo: 'WPH-250', medida: '10" (630 m³/h)', precio: 2365.26},
      {codigo: 'WPH-300', medida: '12" (1000 m³/h)', precio: 3947.63},
      {codigo: 'WPH-350', medida: '14" (1200 m³/h)', precio: 5442.72}
    ]
  },
  // ============ BULONES Y ACCESORIOS ============
  {
    articulo: "BULONES",
    nombre: "BULONES GALVANIZADOS",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Bulón + 2 Arandelas Planas + Tuerca. Tratamiento Dacromet bajo requerimiento.",
    variantes: [
      {codigo: 'PEBUL58X3Z', medida: '5/8x3" (Brida 50-65)', precio: 6.69},
      {codigo: 'PEBUL58X312Z', medida: '5/8x3 1/2" (Brida 80-100)', precio: 7.24},
      {codigo: 'PEBUL58X4Z', medida: '5/8x4" (Brida 150)', precio: 7.83},
      {codigo: 'PEBUL34X312Z', medida: '3/4x3 1/2" (Brida 200)', precio: 10.81},
      {codigo: 'PEBUL34X4Z', medida: '3/4x4" (Brida 250-300)', precio: 11.66},
      {codigo: 'PEBUL1X412Z', medida: '1x4 1/2" (Brida 400-500)', precio: 32.22}
    ]
  },
  {
    articulo: "JUNTAS-PLANA",
    nombre: "ARO DE GOMA PLANA",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Aro de goma plana con tela",
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
      {codigo: 'PEJPDN400', medida: 'DN400', precio: 48.61},
      {codigo: 'PEJPDN450', medida: 'DN450', precio: 52.74},
      {codigo: 'PEJPDN500', medida: 'DN500', precio: 57.93}
    ]
  },
  {
    articulo: "ADBRIDA-PVC",
    nombre: "ADAPTADOR DE BRIDA PVC HIERRO",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Terminación con pintura epoxi",
    variantes: [
      {codigo: 'ADPVC50050', medida: '50-50mm', precio: 50.30},
      {codigo: 'ADPVC506563', medida: '50-65/63', precio: 46.59},
      {codigo: 'ADPVC658075', medida: '65-80/75', precio: 63.53},
      {codigo: 'ADPVC080-090', medida: '80-90mm', precio: 72.00},
      {codigo: 'ADPVC100-110', medida: '100-110mm', precio: 102.45},
      {codigo: 'ADPVC125125', medida: '125mm', precio: 143.99},
      {codigo: 'ADPVC150-160', medida: '150-160mm', precio: 183.23},
      {codigo: 'ADPVC200-200', medida: '200-200mm', precio: 249.87},
      {codigo: 'ADPVC250-250', medida: '250mm', precio: 292.22},
      {codigo: 'ADPVC300-315', medida: '300-315mm', precio: 343.04},
      {codigo: 'ADPVC350355', medida: '350-355mm', precio: 465.85},
      {codigo: 'ADPVC400-400', medida: '400-400mm', precio: 796.18}
    ]
  },
  {
    articulo: "HIDRANTES",
    nombre: "HIDRANTE A BOLA",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Bridados y con conexión a PVC. Terminación con pintura epoxi.",
    variantes: [
      {codigo: 'PEHIDRBOINT65PVC', medida: 'DN63 Inserto PVC', precio: 354.32},
      {codigo: 'PEHIDRBOINT75PVC', medida: 'DN75 Inserto PVC', precio: 354.80},
      {codigo: 'PEHIDRBOINT6510', medida: 'DN65 Bridado', precio: 397.17},
      {codigo: 'PEHIDRBOINT8010', medida: 'DN80 Bridado', precio: 393.00}
    ]
  },
  {
    articulo: "BRIDAS-PEAD",
    nombre: "BRIDA CONEXIÓN PEAD",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "Terminación con pintura epoxi",
    variantes: [
      {codigo: 'PEBRPEAD505010', medida: '50-50', precio: 49.24},
      {codigo: 'PEBRPEAD5010', medida: '50-63', precio: 33.34},
      {codigo: 'PEBRPEAD6510', medida: '60/65-63', precio: 37.38},
      {codigo: 'PEBRPEAD8010', medida: '80-75', precio: 39.06},
      {codigo: 'PEBRPEAD9010', medida: '80-90', precio: 33.62},
      {codigo: 'PEBRPEAD10010', medida: '100-110', precio: 49.67},
      {codigo: 'PEBRPEAD12510', medida: '125-125', precio: 107.17},
      {codigo: 'PEBRPEAD15010', medida: '150-160', precio: 65.83},
      {codigo: 'PEBRPEAD20010', medida: '200-200', precio: 111.15},
      {codigo: 'PEBRPEAD25010', medida: '250-250', precio: 238.91},
      {codigo: 'PEBRPEAD30010', medida: '300-315', precio: 217.67}
    ]
  },
  {
    articulo: "BRASERO",
    nombre: "CAJA BRASERO AYSA",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "De hierro fundido",
    variantes: [
      {codigo: 'PEBRASEROAYSA', medida: 'Standard', precio: 103.00}
    ]
  },
  {
    articulo: "CAJA-HIDRANTE",
    nombre: "CAJA PARA HIDRANTE",
    categoria: "Accesorios",
    marca: "TODOVALVULAS",
    descripcion: "De hierro fundido",
    variantes: [
      {codigo: 'PECAJAHIDRALTA', medida: 'Alta', precio: 145.64}
    ]
  },
  {
    articulo: "535",
    nombre: "ADAPTADOR RÁPIDO 3 BOLAS",
    categoria: "Latón",
    marca: "CODITAL",
    descripcion: "Conectores de bolas",
    variantes: [
      {codigo: 'COD20053503B1500', medida: 'Manguera 15', precio: 11.89},
      {codigo: 'COD20053503B1900', medida: 'Manguera 19', precio: 13.93}
    ]
  },
  {
    articulo: "536",
    nombre: "ADAPTADOR RÁPIDO HEMBRA",
    categoria: "Latón",
    marca: "CODITAL",
    variantes: [
      {codigo: 'COD2005360001500', medida: '1/2"', precio: 3.57},
      {codigo: 'COD2005360002000', medida: '3/4"', precio: 3.83}
    ]
  },
  {
    articulo: "1092",
    nombre: "VÁLVULA ESFERA ESCUADRA CON APLIQUE",
    categoria: "Esfera Latón",
    marca: "CODITAL",
    descripcion: "Ø 55",
    variantes: [
      {codigo: 'COD2028110921500', medida: '1/2" x 3/4"', precio: 7.90}
    ]
  }
];

console.log('Total artículos TODOVALVULAS:', CATALOGO_TODOVALVULAS.length);
let totalVariantes = 0;
CATALOGO_TODOVALVULAS.forEach(art => totalVariantes += art.variantes.length);
console.log('Total variantes:', totalVariantes);

// Contar por marca
const marcas = {};
CATALOGO_TODOVALVULAS.forEach(art => {
  const m = art.marca || 'SIN MARCA';
  marcas[m] = (marcas[m] || 0) + 1;
});
console.log('Por marca:', marcas);




// ============ CATÁLOGO WINTERS ============
// 822 productos de instrumentación industrial
const CATALOGO_WINTERS = [
  {codigo: "PEM1397R6R11-BSPT", nombre: "Vacuómetro Winters Serie PEM Economy, dial 1,5\", -30/0\"Hg & -1/0 bar, 1/8\" BSPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 6.732},
  {codigo: "PEM1420R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 1,5\", 0/100 psi & 0/7 bar, 1/8\" BSPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 6.732},
  {codigo: "PEM1423R1R11", nombre: "Manómetro Winters Serie PEM Economy, dial 1,5\", 0/300 psi & 0/20 bar, 1/8\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 6.732},
  {codigo: "PEM1408R11R1S-BSP", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/12 bar & 0/165 psi, 1/8\" BSP posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.094},
  {codigo: "PEM199R3R1-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/2 Kg/cm2 & 0/30 psi, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 7.661999999999999},
  {codigo: "PEM203R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/160 psi & 0/11 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 7.661999999999999},
  {codigo: "PEM204R3R1-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/14 Kg/cm2 & 0/200 psi, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 7.661999999999999},
  {codigo: "PEM205R1R11", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/300 psi & 0/20 bar, 1/4\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 7.661999999999999},
  {codigo: "PEM205R3R1-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/20 Kg/cm2 & 0/300 psi, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 7.661999999999999},
  {codigo: "PEM1411R1R11", nombre: "Manómetro Winters Serie PEM Economy, dial 2\", 0/300 psi & 0/20 bar, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.094},
  {codigo: "PEM210R7R6-BSPT", nombre: "Vacuómetro Winters Serie PEM Economy, dial 2,5\", -760 mmHg/0 & -30/0\"Hg, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM153R1R11-BSPT", nombre: "Manovacuómetro Winters Serie PEM Economy, dial 2,5\", -30\"Hg/0/30 psi & -1/0/2 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM211R3R1S-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/0,6 Kg/cm2 & 0/9 psi, 1/4 BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco. (CODIGO ANTERIOR: PEM211GASISTA)", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM212R3R1-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/2 Kg/cm2 & 0/30 psi, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM213R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM214R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM215R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/160 psi & 0/11 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM290R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/1.000 psi & 0/70 bar, 1/4\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 10.026},
  {codigo: "PEM1439R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" BSPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM1441R1R11-BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 2,5\", 0/200 psi & 0/14 bar, 1/4\" BSPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 8.952},
  {codigo: "PEM295R3R1S-1/2BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/0,6 Kg/cm2 & 0/9 psi, 1/2\" BSPT inf., internos latón, clase ±3-2-3%, seco. (CODIGO ANTERIOR: PEM221GASISTA)", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM221R1R11-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/30 psi & 0/2 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM222R1R11-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM223R1R11-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM224R1R11-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/160 psi & 0/11 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM225R1R11-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM226R1R11-1/2BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/300 psi & 0/20 bar, 1/2\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM226R1R11S-1/2BSPT", nombre: "Manómetro Winters Serie PEM Economy, dial 4\",  0/600 psi & 0/40 bar, 1/2\" BSPT inferior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 24.708},
  {codigo: "PEM222R1R11-BACK-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 30.293999999999997},
  {codigo: "PEM223R1R11-BACK-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 30.293999999999997},
  {codigo: "PEM224R1R11-BACK-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/160 psi & 0/11 bar, 1/2\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 30.293999999999997},
  {codigo: "PEM225R1R11-BACK-1/2", nombre: "Manómetro Winters Serie PEM Economy, dial 4\", 0/200 psi & 0/14 bar, 1/2\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 30.293999999999997},
  {codigo: "PEM206ZRR11-BSP", nombre: "Manómetro Winters Serie PEM-ZR Economy StabiliZR, dial 2\", 0/2 bar, 1/8\" BSP inferior, caja acero, internos latón, clase ±3-2-3%, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 9.6},
  {codigo: "PFQ1102R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/30 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1103R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/60 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1103R1R11", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/60 psi & 0/4 bar, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1103R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/4 Kg/cm2 & 0/60 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1104R1R11", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/100 psi & 0/7 bar, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1105R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/10 Kg/cm2 & 0/150 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1107R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/20 Kg/cm2 & 0/300 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1108R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/40 Kg/cm2 & 0/600 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.46},
  {codigo: "PFQ1111R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/140 Kg/cm2 & 0/2.000 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.874},
  {codigo: "PFQ1113R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/300 Kg/cm2 & 0/4.300 psi, 1/8\" NPT inferior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.874},
  {codigo: "PFQ1122R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/2 Kg/cm2 & 0/30 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 15.978000000000002},
  {codigo: "PFQ1123R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/60 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 15.978000000000002},
  {codigo: "PFQ1130R1R11", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/1.500 psi & 0/100 bar, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 16.62},
  {codigo: "PFQ1130R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/100 Kg/cm2 & 0/1.500 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 16.62},
  {codigo: "PFQ1131R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/140 Kg/cm2 & 0/2.000 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 16.62},
  {codigo: "PFQ1132R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/250 Kg/cm2 & 0/3.600 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina (CODIGO ANTERIOR PFQ1133HIDROLAV)", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 16.62},
  {codigo: "PFQ1133R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/300 Kg/cm2 & 0/4.200 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos latón, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 16.62},
  {codigo: "PFQ1226R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/16 Kg/cm2 & 0/230 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 27.131999999999998},
  {codigo: "PFQ1233R3R1S1", nombre: "Manómetro Winters Serie PFQ Quality, dial 1,5\", 0/400 Kg/cm2 & 0/5.800 psi, 1/8\" NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 2,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 28.05},
  {codigo: "PFQ800R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 2,5\", 0/0,6 Kg/cm2 & 0/9 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina (CODIGO ANTERIOR PFQ800GASISTA)", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ800R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 2,5\", 0/1 Kg/cm2 & 0/15 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ803R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 2,5\", 0/4 Kg/cm2 & 0/60 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ809R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 2,5\", 0/70 Kg/cm2 & 0/1.000 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ900R3", nombre: "Vacuómetro Winters Serie PFQ Quality, dial 2,5\", -1/0 Kg/cm2, 1/4\" NPT posterior, caja Ac. Inox 304, internos latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ919R11R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 2,5\", 0/3.600 psi & 0/250 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 18.018},
  {codigo: "PFQ1285R99-BSP", nombre: "Vacuómetro Winters Serie PFQ Quality, dial 4\", -76 cmHg/0, 1/2\" BSP posterior, caja Ac. Inox 304, internos latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1285R3", nombre: "Vacuómetro Winters Serie PFQ Quality, dial 4\", -1/0 kg/cm2 & -30\"Hg/0 psi, 1/2\" NPT posterior, caja Ac. Inox 304, internos latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1288R3R1", nombre: "Manovacuómetro Winters Serie PFQ Quality, dial 4\",-1/0/4 Kg/cm2 & -30\"Hg/0/60 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1290R3R1", nombre: "Manovacuómetro Winters Serie PFQ Quality, dial 4\",-1/0/10 Kg/cm2 & -30\"Hg/0/160 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1293R3R1S", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/0,6 Kg/cm2 & 0/8 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1293R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/1 Kg/cm2 & 0/14 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1526R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/30 Kg/cm2 & 0/425 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1527R3R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/40 Kg/cm2 & 0/550 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 41.178000000000004},
  {codigo: "PFQ1271R11S-BSP", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/6 bar, 1/4\" BSP posterior, caja Ac. Inox. 304, internos de Ac. Inox. 316, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 57.833999999999996},
  {codigo: "PFQ1282R11R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/700 bar & 0/10.000 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de Ac. Inox. 316, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 65.55},
  {codigo: "PFQ1283R11R1", nombre: "Manómetro Winters Serie PFQ Quality, dial 4\", 0/1.000 bar & 0/15.000 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos de Ac. Inox. 316, clase 1,5%, cierre repujado, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 65.55},
  {codigo: "PFQ1103ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/60 psi & 0/4 bar, 1/8\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 2,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.922},
  {codigo: "PFQ1108ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/600 psi & 0/40 bar, 1/8\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 2,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 14.922},
  {codigo: "PFQ1226ZRR1R11S", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/230 psi & 0/16 bar, 1/8\" NPT posterior, caja Ac. Inox. 304, internos de Ac. Inox., clase 2,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 32.04},
  {codigo: "PFQ801ZRR6R11", nombre: "Vacuómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", -30\"Hg/0 & -1/0 bar 1/4\" NPT inferior, caja Ac. Inox 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ801ZRR7R6", nombre: "Vacuómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", -760 mmHg/0 & -30\"Hg/0, 1/4\" NPT inferior, caja Ac. Inox 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ798ZRR1R11", nombre: "Manovacuómetro Winters Serie PFQ Quality STABILIZR®, dial 2,5\", -30\"Hg/0/30 psi & -1/0/2 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ800ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/15 psi & 0/1 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ802ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/30 psi & 0/2 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ803ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ804ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ805ZRR1R11S", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/150 psi & 0/10 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ806ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/200 psi & 0/14 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ807ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/300 psi & 0/20 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ817ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/400 psi & 0/28 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ808ZRR1R11S", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/500 psi & 0/35 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ808ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/600 psi & 0/40 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ809ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/1.000 psi & 0/70 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ816ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/1.500 psi & 0/100 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ810ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/2.000 psi & 0/140 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ813ZRR1R11S", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/15.000 psi & 0/1.000 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.904},
  {codigo: "PFQ898ZRR1R11", nombre: "Manovacuómetro Winters Serie PFQ Quality STABILIZR®, dial 2,5\", -30\"Hg/0/30 psi & -1/0/2 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ901ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/15 psi & 0/1 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ902ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/30 psi & 0/2 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ903ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ904ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ905ZRR1R11S", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/150 psi & 0/10 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ906ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/200 psi & 0/14 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ907ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/300 psi & 0/20 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ917ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/400 psi & 0/28 bar, 1/4\" NPT posterior, caja Ac. Inox. 304, internos de latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PFQ118ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/1 bar & 0/15 psi, 1/4\" BSPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 35.256},
  {codigo: "PFQ119ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/2 bar & 0/30 psi, 1/4\" BSPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 35.256},
  {codigo: "PFQ129ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/140 bar & 0/2.000 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 35.256},
  {codigo: "PFQ178ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/40 bar & 0/600 psi, 1/4\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 35.256},
  {codigo: "PFQ181ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/140 bar & 0/2.000 psi, 1/4\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 35.256},
  {codigo: "PFQ190ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/700 bar & 0/10.000 psi, 1/4\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 49.644000000000005},
  {codigo: "PFQ191ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 2,5\", 0/1.000 bar & 0/15.000 psi, 1/4\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 49.644000000000005},
  {codigo: "PFQ1240ZRR1R11", nombre: "Manovacuómetro Winters Serie PFQ Quality STABILIZR®, dial 4\", -30\"Hg/0/200 psi & -1/0/14 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1242ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/15 psi & 0/1 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1243ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/30 psi & 0/2 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1244ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1245ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1247ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ717ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/1.000 psi & 0/70 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ720ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/3.000 psi & 0/200 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ722ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/10.000 psi & 0/700 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 57.56400000000001},
  {codigo: "PFQ1293ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/1 bar & 0/15 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1294ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/30 psi & 0/2 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1294ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/2 bar & 0/30 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1295ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1295ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/4 bar & 0/60 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1296ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1298ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/160 psi & 0/11 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1524ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/200 psi & 0/14 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1525ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/300 psi & 0/20 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1526ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/400 psi & 0/30 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1526ZRR11R1", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/30 bar & 0/400 psi, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ1527ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/600 psi & 0/40 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ747ZRR1R11", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/1.000 psi & 0/70 bar, 1/2\" NPT posterior, caja Ac. Inox. 304, internos latón, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 48.198},
  {codigo: "PFQ779ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/140 bar & 0/2.000 psi, 1/2\" BSPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ781ZRR11R1S-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/300 bar & 0/4.500 psi, 1/2\" BSPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1568ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/2 bar & 0/30 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1570ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/7 bar & 0/100 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1573ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/20 bar & 0/300 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1574ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/30 bar & 0/400 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1575ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/40 bar & 0/600 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 61.212},
  {codigo: "PFQ1283ZRR11R1-BSPT", nombre: "Manómetro Winters Serie PFQ-ZR Quality STABILIZR®, dial 4\", 0/1.000 bar & 0/15.000 psi, 1/2\" BSPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, cierre repujado, amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 62.724000000000004},
  {codigo: "15UC", nombre: "Accesorio Winters Brida en U (pestaña) para manómetros Serie PFQ de dial 1,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 2.2739999999999996},
  {codigo: "25FF", nombre: "Accesorio Winters Brida Frontal para manómetros Series PFQ y PFP de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 3.7199999999999998},
  {codigo: "25UC", nombre: "Accesorio Winters Brida en U (pestaña) para manómetros Serie PFQ y PFP de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 3.7199999999999998},
  {codigo: "4UC", nombre: "Accesorio Winters Brida en U (U-Clamp) para manómetros Winters Serie PFQ de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "4UC-PR-DIN", nombre: "[solo Argentina] Brida en U (U-Clamp) para manómetros Winters serie PFP dial 4\" caja DIN", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "4FF", nombre: "Accesorio Winters Brida en frontal para manómetros Serie PFQ de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "PFP821R11S", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/0,6 bar, 1/4\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP827R3-SG-25", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/20 Kg/cm2, 1/4\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 44.892},
  {codigo: "PFP880R1R11S", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/500 psi & 0/35 bar, 1/4\"NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP828R3-SG-25", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 2,5\", 0/40 Kg/cm2, 1/4\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 44.892},
  {codigo: "PFP874R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 2,5\",-1/0/10 Kg/cm2 & -30\"Hg/0/160 psi,  1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP921R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/1 Kg/cm2 & 0/15 psi, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP881R3R1S", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/25 Kg/cm2 & 0/360 psi, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP881R3S-SG-25", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/25 Kg/cm2, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 44.892},
  {codigo: "PFP928R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/40 Kg/cm2 & 0/600 psi, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP930R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/140 Kg/cm2 & 0/2.000 psi, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP851R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 2,5\", 0/400 Kg/cm2 & 0/6.000 psi, 1/4\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1,5%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 36.077999999999996},
  {codigo: "PFP645R3R1-BSPT-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/10 Kg/cm2 & 0/150 psi, 1/4\"BSPT inf, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP650R3R1S", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/25 Kg/cm2 & 0/360 psi, 1/4\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.46},
  {codigo: "PFP655R3R7-SG-4", nombre: "Vacuómetro Winters Serie PFP Premium, dial 4\", -1/0 Kg/cm2 & -760/0 mmHg, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP1044R3-SG-4", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4\", -760 mmHg/0/1 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP1048R3S-SG-4", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4\", -1/0/9 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1% aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP659R3S1-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/5 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP659R3-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/7 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP662R3-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/20 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP663R3S-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/30 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP663R3S1-SG-4", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/35 Kg/cm2, 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 112.914},
  {codigo: "PFP2308R7R6", nombre: "Vacuómetro Winters Serie PFP Premium, dial 4\", -760 mmHg/0 & -30/0\"Hg, dial 4\", 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2309R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4\", -76cmHg/0/1 Kg/cm2 & -30\"Hg/0/15 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int, Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2309R3R1-SG-4", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4\", -76cmHg/0/1 Kg/cm2 & -30\"Hg/0/14 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int, Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 110.02799999999999},
  {codigo: "PFP2313R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4\",-1/0/10 Kg/cm2 & -30\"Hg/0/160 psi, 1/2\"NPT posterior caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2316R3R1S", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/0,6 Kg/cm2 & 0/8 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2316R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/1 Kg/cm2 & 0/15 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2317R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/2 Kg/cm2 & 0/30 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2318R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/4 Kg/cm2 & 0/60 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2323R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/28 kg/cm2 & 0/400 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2323R3R1S", nombre: "Manómetro Winters Serie PFP Premium dial 4\", 0/30 Kg/cm2 & 0/400 psi, 1/2\"NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP2324R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/40 Kg/cm2 & 0/600 psi,  1/2\"NPT posterior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP1191R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/140 Kg/cm2 & 0/2.000 psi,  1/2\"NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP1192R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 4\", 0/200 Kg/cm2 & 0/3.000 psi,  1/2\"NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 95.568},
  {codigo: "PFP752R1R11+SG-45", nombre: "Manovacuómetro Winters Serie PFP Premium, dial 4,5\", -30''HG/bar/0/30 psi & 0/2 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1% aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 158.72399999999996},
  {codigo: "PFP762R11S+TP+TC", nombre: "Manómetro Winters Serie PFP Premium, dial 4,5\", 0/10 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1% aro bayoneta, con glicerina, PLATE + TC", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 133.386},
  {codigo: "PFP763R1R11+SG-45", nombre: "Manómetro Winters Serie PFP Premium, dial 4,5\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 158.72399999999996},
  {codigo: "PFP764R1R11+SG-45", nombre: "Manómetro Winters Serie PFP Premium, dial 4,5\", 0/300 psi & 0/20 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayon con glicerina, con vidrio de seguridad", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 158.72399999999996},
  {codigo: "PFP771R1R11+SG-45", nombre: "Manómetro Winters Serie PFP Premium, dial 4,5\", 0/5.000 psi & 0/350 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, int. Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 158.72399999999996},
  {codigo: "PFP1168R7R6-1/2", nombre: "Vacuómetro Winters Serie PFP Premium, dial 6\", -760 mmHg/0 & -30/0\"Hg, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1159R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/1 Kg/cm2 & 0/15 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1160R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/2 Kg/cm2 & 0/30 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1162R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/7 Kg/cm2 & 0/100 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1163R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/10 Kg/cm2 & 0/150 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1165R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/20 Kg/cm2 & 0/300 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1166R3R1-1/2", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/40 kg/cm2, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1167R3-SG-6-1/2+6FF", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/70Kg/cm2, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, con glicerina, con vidrio de seguridad y 6FF", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 261.588},
  {codigo: "PFP2327R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, -1/0/1 Kg/cm2 & -30\"Hg/0/15 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2329R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, -1/0/4 Kg/cm2 & -30\"Hg/0/60 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2330R3R1", nombre: "Manovacuómetro Winters Serie PFP Premium, -1/0/7 Kg/cm2 & -30\"Hg/0/100 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2334R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/1 Kg/cm2 & 0/15 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2335R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/2 Kg/cm2 & 0/30 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2335R3R1S", nombre: "Manovacuómetro Winters Serie PFP Premium, 0/2,5 Kg/cm2 & 0/36 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1080R3", nombre: "Manómetro Winters Serie PFP Premium, 0/70 Kg/cm2, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1080R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/70 Kg/cm2 & 0/1.000 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1081R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/100 Kg/cm2 & 0/1.500 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1082R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/140 Kg/cm2 & 0/2.000 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1086R3R1", nombre: "Manómetro Winters Serie PFP Premium, 0/600 Kg/cm2 & 0/8.700 psi, dial 6\", 1/2\"NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta. con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 254.47199999999998},
  {codigo: "PFP1169R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/100 Kg/cm2 & 0/1.500 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP1169R3-SG-6+6FF", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/100 Kg/cm2, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, con glicerina, con vidrio de Seguridad y pestaña se sujeción 6FF.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 261.588},
  {codigo: "PFP1171R3R1", nombre: "Manómetro Winters Serie PFP Premium, dial 6\", 0/200 Kg/cm2 & 0/3.000 psi, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 192.87599999999998},
  {codigo: "PFP2033R11+TP+TC", nombre: "Manovacuómetro Winters Serie PFP Premium dial 10\", -1/0/10 bar, 1/2\" NPT inferior caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta + TAG PLATE + TC, con glicerina", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 525.468},
  {codigo: "PFP2031R11R1DRY-1/2", nombre: "Manómetro Winters PFP Serie Premium, dial 10\", 0/7 bar & 0/100 psi 1/2\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, seco", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 525.468},
  {codigo: "PFP2036R11R1DRY-1/2", nombre: "Manómetro Winters PFP Serie Premium, dial 10\", 0/40 bar & 0/600 psi, 1/2\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, seco", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 525.468},
  {codigo: "PFP823ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP824ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP825ZRR11R1", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/10 bar & 0/150 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP825ZRR1R11S", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/150 psi & 0/10 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP826ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/200 psi & 0/14 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP827ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/300 psi & 0/20 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP827ZRR1R3", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/300 psi & 0/20 kg/cm2, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP880ZRR3S-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/25 kg/cm2, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.86000000000001},
  {codigo: "PFP880ZRR3S-T-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/25 kg/cm2, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.86000000000001},
  {codigo: "PFP828ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/600 psi & 0/40 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP828ZRR3-T-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/40 Kg/cm2, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.86000000000001},
  {codigo: "PFP829ZRR3R1S1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/60 kg/cm2 & 0/900 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.86000000000001},
  {codigo: "PFP829ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1.000 psi & 0/70 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP834ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1.500 psi & 0/100 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP834ZRR11R1", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/100 bar & 0/1.500 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP834ZRR3R1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/100 Kg/cm2 & 0/1.500 psi, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.86000000000001},
  {codigo: "PFP830ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/2.000 psi & 0/140 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP831ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/3.000 psi & 0/200 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP832ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/5.000 psi & 0/350 bar, 1/4\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PFP873ZRR1R3+25BF", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", -30\"Hg/100 psi & -1/0/7 Kg/cm2, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con brida posterior.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP874ZRR11R1", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", -1/0/10 bar & -30\"Hg/0/150 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP921ZRR11R1", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1 bar & 0/15 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP921ZRR3R1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1 Kg/cm2 & 0/15 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP922ZRR3R1S-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1,6 kg/cm2 & 0/23 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP923ZRR3R1S-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/2,5 Kg/cm2 & 0/35 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP923ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP924ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP925ZRR3R1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/10 Kg/cm2 & 0/150 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP927ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/300 psi & 0/20 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP881ZRR3R1S-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/25 Kg/cm2 & 0/350 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP928ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/600 psi & 0/40 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP929ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/1.000 psi & 0/70 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP929ZRR3R1S1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/70 Kg/cm2 & 0/1.000 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP930ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/2.000 psi & 0/140 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP930ZRR11R1", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/140 bar & 0/2.000 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP931ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/3.000 psi & 0/200 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.06999999999999},
  {codigo: "PFP931ZRR1-SG-25", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/3.000 psi, 1/4\" NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 43.884},
  {codigo: "PFP3796ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 2,5\", 0/10.000 psi & 0/700 bar, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1,5%, aro bayoneta, con brida frontal", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 49.116},
  {codigo: "PFP1252ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/100 kg/cm2 & 0/1.500 psi, 1/4\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP655ZRR6R11", nombre: "Vacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -30/0\"Hg & -1/0 bar, 1/2\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP655ZRR7R6-SG-4", nombre: "Vacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -760 mmHg/0 & -30/0\"Hg, 1/2\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP655ZRR7R3-SG-4", nombre: "Vacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 760/0 mmHg & -1/0 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP1044ZRR3-SG-4", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -760mmHg/0/1 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP656ZRR1R11S", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/10 psi & 0/0,6 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP656ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/15 psi & 0/1 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP656ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1 Kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP656ZR11R1-BSPT-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1 bar & 0/15 psi, 1/2\" BSPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP656ZRR3-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1 Kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP656ZRR1R99-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 3/15 psi, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP657ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/30 psi & 0/2 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP657ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/2 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP657ZRR3-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/2 Kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP657ZRR3S1-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/2,5 Kg/cm2 & 0/40 psi, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP658ZRR3S-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/3 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP658ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP658R3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/4 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP659ZRR3S-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/6 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP659ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP660ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/160 psi & 0/11 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP661ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP662ZRR3S-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/20 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP662ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/300 psi & 0/20 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP662ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/300 psi & 0/20 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP666ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/400 psi & 0/30 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP663ZRR3S-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/30 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP663ZRR3-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/40 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP663ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/600 psi & 0/40 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP664ZRR3S-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/50 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP664ZRR3S1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/60 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP664ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/70 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP665ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1.500 psi & 0/100 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP665ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/100 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP665ZRR3-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/100 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP667ZRR3S-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/150 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP667ZRR3S1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/160 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP668ZRR3S-T-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/150 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con tope fin escala, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP668ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/3.000 psi & 0/200 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP668ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/200 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP669R3S2-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/350 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP675ZRR3-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/400 kg/cm2, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP670ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/10.000 psi & 0/700 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.87999999999998},
  {codigo: "PFP671ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/15.000 psi & 0/1.000 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.87999999999998},
  {codigo: "PFP2309ZRR1R11", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -30\"Hg/0/15 psi & -1/0/1 bar, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP2310ZRR3R1-SG-4", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -1/0/2 Kg/cm2 & -30\"Hg/0/30 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2311ZRR1R11", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -30\"Hg/0/60 psi & -1/0/4 bar, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 98.59799999999998},
  {codigo: "PFP2313ZRR3R1-SG-4", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", -1/0/10Kg/cm2 & -30\"Hg/0/150 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2316ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1 Kg/cm2 & 0/15 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2317ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/2 Kg/cm2 & 0/30 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2318ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/4 Kg/cm2 & 0/60 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2319ZRR2-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/700 KPa, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2323ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/28 Kg/cm2 & 0/400 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2324ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/40 Kg/cm2 & 0/600 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP2325ZRR3-SG-4-4FF", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/70 Kg/cm2, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad, con brida frontal.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 124.00199999999998},
  {codigo: "PFP1190ZRR1R11-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1.500 psi & 0/100 bar, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP1191ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/140 Kg/cm2 & 0/2.000 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP1192ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/200 Kg/cm2 & 3.000 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 113.05199999999999},
  {codigo: "PFP1195ZRR3R1-SG-4", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 4\", 0/1.000 Kg/cm2 & 0/15.000 psi, 1/2\" NPT posterior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 128.33999999999997},
  {codigo: "PFP2328ZRR1R11", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 6\", -30\"Hg/0/30 psi & -1/0/2 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 197.742},
  {codigo: "PFP2328ZRR3R1", nombre: "Manovacuómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 6\",-1/0/2 Kg/cm2 & -30\"Hg/0/30 psi, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 197.742},
  {codigo: "PFP2334ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 6\", 0/15 psi & 0/1 bar, 1/2\" NPT inferior, caja Ac. Inox. 304., internos Ac. Inox. 316, clase 1%, aro bayoneta.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 197.742},
  {codigo: "PFP1171ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 6\", 0/3.000 psi & 0/200 bar, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 197.742},
  {codigo: "PFP1176ZRR1R11", nombre: "Manómetro Winters Serie PFP-ZR Premium STABILIZR®, dial 6\", 0/6.000 psi & 0/400 bar, 1/2\"NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase 1%, aro bayoneta, con amortiguador seco.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 197.742},
  {codigo: "25BOOT", nombre: "Accesorio Winters Protector de goma para manómetros Serie PFQ y PFP de dial 2,5\", conexión inferior", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 5.1659999999999995},
  {codigo: "25FF", nombre: "Accesorio Winters Brida Frontal para manómetros Serie PFQ y PFP de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 3.7199999999999998},
  {codigo: "25UC", nombre: "Accesorio Winters Brida en U (pestaña) para manómetros Serie PFQ y PFP dial 2,5\" conex. post. 1/4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 3.7199999999999998},
  {codigo: "4BOOT", nombre: "Accesorio Winters Protector de goma para manómetro 4\" PFQ y PFP inferior", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 15.149999999999999},
  {codigo: "4FF", nombre: "Accesorio Winters Brida frontal para manómetros Serie PFP de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "4FF-PR", nombre: "Accesorio Winters Brida frontal para manómetros Serie PFP de dial 4\" pr", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "4UC-PR", nombre: "Accesorio Winters Brida en U (U-Clamp) para manómetros Serie PFP de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "6FF", nombre: "Accesorio Winters Brida en frontal para manómetros Serie PFP dial 6\" (150mm)", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 38.076},
  {codigo: "6FF-160MM", nombre: "[SOLO ARGENTINA] Accesorio Winters Brida frontal para manómetros Serie PFP dial 6\" (160mm)", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 38.076},
  {codigo: "MAXI25", nombre: "Accesorio Winters Aguja ajustable indicadora de máxima presión para manómetros de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 36.15},
  {codigo: "MAXI4", nombre: "Accesorio Winters Aguja ajustable indicadora de máxima presión para manómetros de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 55.356},
  {codigo: "SG-25", nombre: "Accesorio Winters Vidrio de seguridad para manometros de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 8.814},
  {codigo: "SG-4", nombre: "Accesorio Winters Vidrio de seguridad para manometros de dial 4\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 14.46},
  {codigo: "SG-6", nombre: "Accesorio Winters Vidrio de seguridad para manometros de dial 6\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 30.642},
  {codigo: "TAG", nombre: "Accesorio Winters Placa de identificacion (sin grabar)", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 1.4459999999999997},
  {codigo: "PLP301R12R15S1", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/60 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP301R12R15S1-BSPT", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/60 mbar/mmH2O, 1/4\" BSPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP302R12R15", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/100 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP302R12R15-BSPT", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/100 mbar/mmH2O, 1/4\" BSPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP302R12R15S", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/160 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP304R12R15", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/250 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP304R12R99", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/250 mbar/mmH2O, 1/4\" BSPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP304R12R15-BSPT", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/250 mbar/mmH2O, 1/4\" BSPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP303R12R15S1", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/400 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP303R12R15S", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/600 mbar/mmH2O, 1/4\" NPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP340VR12R15-BSPT", nombre: "Vacuómetro Winters Serie PLP, dial 2,5\", -40/0 mbar/mmH2O, 1/4\" BSPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP346R12R99", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/400 mbar/mmH2O, 1/4\" BSPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 44.754},
  {codigo: "PLP351R3-T", nombre: "Vacuómetro Winters Serie PLP, dial 2,5\", 0/0,06 kg/cm2, 1/4\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE, con tope fin escala.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 134.26199999999997},
  {codigo: "PLP351R12R15S1-BSPT", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/60 mbar/mmH2O, 1/4\" BSPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 134.26199999999997},
  {codigo: "PLP352R12R99S", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/100 mbar/mmH2O, 1/4\" BSPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 134.26199999999997},
  {codigo: "PLP353R12R99", nombre: "Manómetro Winters Serie PLP, dial 2,5\", 0/250 mbar/mmH2O, 1/4\" BSPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 134.26199999999997},
  {codigo: "PLP313R12R15-1/2BSPT", nombre: "Manómetro Winters Serie PLP, dial 4\", 0/250 mbar/mmH2O, 1/2\" BSPT inferior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 92.95199999999998},
  {codigo: "PLP4232R12R99VAC", nombre: "Vacuómetro Winters Serie PLP, dial 4\", -100/0 mbar/mmH2O, 1/2\" BSPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 92.95199999999998},
  {codigo: "PLP4232VR12R15-1/2BSPT", nombre: "Vacuómetro Winters Serie PLP, dial 4\", -100/0 mbar/mmH2O, 1/2\" BSPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 92.95199999999998},
  {codigo: "PLP4229VR12R15-1/2BSPT", nombre: "Vacuómetro Winters Serie PLP, dial 4\", -300/0 mbar/mmH2O, 1/2\" BSPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 92.95199999999998},
  {codigo: "PLP4232R12R99", nombre: "Manómetro Winters Serie PLP, dial 4\", 0/100 mbar/mmH2O, 1/4\" NPT posterior, Caja de acero pintada de negro, internos latón, clase ±3-2-3% ANSI/ASME Grado B.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 92.95199999999998},
  {codigo: "PLP4201R8MANOV", nombre: "Manovacuómetro Winters Serie PLP, dial 4\", -30/0/30\" H20, 1/4\" NPT inferior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 158.358},
  {codigo: "PLP4320VR99S-BACK-1/2", nombre: "Vacuómetro Winters Serie PLP, dial 6\", -300/0 MMCA, 1/4\" NPT posterior, caja Ac. Inox 304, internos Ac. Inox. 316, clase ±1,6% FE.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316/latón", precio: 201.96},
  {codigo: "25BOOT-PLP", nombre: "Accesorio Winters Protector de goma para manómetro Serie PLP de dial 2,5\"", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 12.948},
  {codigo: "PPC5061ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/15 psi & 0/1 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5061ZRR99-SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/10 mca, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5062ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/30 psi & 0/2 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5063ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/60 psi & 0/4 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5064ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/100 psi & 0/7 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5065ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/160 psi & 0/11 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5066R1R11", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, seco (sin amortiguación).", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 153.19199999999998},
  {codigo: "PPC5066ZRR11S-SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/15 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 153.19199999999998},
  {codigo: "PPC5069ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/600 psi & 0/40 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5070ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/1.000 psi & 0/70 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5071ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/1.500 psi & 0/100 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5072ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/2.000 psi & 0/140 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5073ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/3.000 psi & 0/200 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5074ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/5.000 psi & 0/350 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "PPC5075ZRR1R11+SG-45", nombre: "Manómetro de proceso Winters Serie PPC-ZR STABILIZR, dial 4,5\", 0/10.000 psi & 0/700 bar, 1/2\" NPT inferior, caja fenólica, clase 0,5%, amortiguador seco, con vidrio de seguridad.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 178.53},
  {codigo: "DPG210", nombre: "Vacuómetro Digital Winters Serie DPG, dial 2,5\", -30/0\"Hg & -1/0 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG203", nombre: "Manovacuómetro Digital Winters Serie DPG, 2,5\", -15/0/15 psi & -1/0/1 bar, 1/4\" NPT inferior, caja ABS, 4 digitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG204", nombre: "Manovacuómetro Digital Winters Serie DPG, dial 2,5\", -15/0/30 psi & -1/0/2 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG207", nombre: "Manovacuómetro Digital Winters Serie DPG, dial 2,5\", -15/0/150 psi & -1/0/10 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG211", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/15 psi & 0/1 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG212", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/30 psi & 0/2 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG213", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/60 psi & 0/4 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG214", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/100 psi & 0/7 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG215", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/160 psi & 0/11 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG216", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/200 psi & 0/14 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG217", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/300 psi & 0/20 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG218", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/600 psi & 0/40 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG219", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/1.000 psi & 0/70 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG220", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/1.500 psi & 0/100 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG221", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/2.000 psi & 0/140 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG222", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/3.000 psi & 0/200 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG223", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/5.000 psi & 0/350 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG224", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/10.000 psi & 0/700 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG225", nombre: "Manómetro Digital Winters Serie DPG, dial 2,5\", 0/15.000 psi & 0/1.000 bar, 1/4\" NPT inferior, caja ABS, 4 dígitos, clase ±1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 242.988},
  {codigo: "DPG3P05N2", nombre: "Manovacuómetro digital Winters DPG+ SERIES, Dial 3.3\", -15/0/100 PSI, 1/2\" NPT inferior, Caja ZINC, 6 digitos, Goma protectora, Clase ±0,1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1569.78},
  {codigo: "DPG3P17N2", nombre: "Manómetro digital Winters DPG+ SERIES, Dial 3.3\", 0/600 PSI, 1/2\" NPT inferior, Caja ZINC, 6 digitos, Goma protectora, Clase ±0,1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1363.23},
  {codigo: "DPG3P27N2", nombre: "Manómetro digital Winters DPG+ SERIES, Dial 3.3\", 0/10.000 PSI, 1/2\" NPT inferior, Caja ZINC, 6 digitos, Goma protectora, Clase ±0,1% FE", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1900.2599999999998},
  {codigo: "G", nombre: "Manómetrica (Estandar)", categoria: "Otros", marca: "WINTERS", material: "", precio: 0.0},
  {codigo: "PSQ15793B", nombre: "Manovacuómetro Sanitario Winters Serie PSQ, dial 2,5\", -30”Hg/0/150 psi & -1/0/10 bar, Tri-Clamp 1,5\" posterior, clase ±1,5%, Aprobación 3A", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 151.128},
  {codigo: "PSQ15607", nombre: "Manómetro Sanitario Winters Serie PSQ, dial 4\", 0/300 psi & 0/20 bar Tri-Clamp 1,5\" inferior, clase ±1%, Aprobación 3A", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 202.62599999999998},
  {codigo: "PSQ15608", nombre: "Manómetro Sanitario Winters Serie PSQ, dial 4\", 0/600 psi & 0/40 bar Tri-Clamp 1,5\" inferior- Aprobación 3A", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 202.62599999999998},
  {codigo: "PSQ151025B", nombre: "Manovacuómetro Sanitario Winters Serie PSQ, dial 4\", -30”Hg/0/150 psi & -1/0/10 bar Tri-Clamp 1,5\" posterior, clase ±1%, Aprobación 3A", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 202.62599999999998},
  {codigo: "PSQ15604B", nombre: "Manómetro Sanitario Winters Serie PSQ, dial 4\", 0/100 psi & 0/7 bar Tri-Clamp 1,5\" posterior, clase ±1%, Aprobación 3A", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 202.62599999999998},
  {codigo: "PAM1753R3SC", nombre: "Manovacuómetro Winters Serie PAM Amoníaco, dial 2,5\", -1/0/25 Kg/cm2/°C, 1/4\"NPT posterior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1,5%, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 35.046},
  {codigo: "PEC0200R6R7", nombre: "Vacuómetro con contactos Winters Serie PEC, Dial 4\", -30/0\"Hg & -760/0 mmHg, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0201R1R11", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/15 psi & 0/1 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT, 1%", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0201R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/1 bar & 0/15 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0202R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/2 bar & 0/30 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0203R1R11", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/60 psi & 0/4 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0203R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/4 bar & 0/60 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0204R1R11", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/100 psi & 0/7 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0204R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/7 bar & 0/100 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0205R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/10 bar & 0/160 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0205R1R11", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/160 psi & 0/11 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0207R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/20 bar & 0/300 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0208R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/28 bar & 0/400 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0210R11S", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/60 bar, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0210R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/70 bar & 0/1.000 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0211R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/100 bar & 0/1.500 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0212R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/140 bar & 0/2.000 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0214R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/350 bar & 0/5.000 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0214R11R1S", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/400 bar & 0/6.000 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "PEC0216R11R1", nombre: "Manómetro con contactos Winters Serie PEC, Dial 4\", 0/700 bar & 0/10.000 psi, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, clase ±1%, Aro bayoneta, 2 SPDT.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 379.296},
  {codigo: "4FF", nombre: "Accesorios Winters Brida frontal para manómetros de dial 4\".", categoria: "Manómetros", marca: "WINTERS", material: "", precio: 10.95},
  {codigo: "PSG40105R12R99", nombre: "Manómetro Winters Serie PSG SCHAEFFER, dial 4\", 0/25 mbar - 0/250 mmH2O, Ac. Inox. 316, 1/2\" NPT inferior.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 1019.3279999999999},
  {codigo: "SG-4", nombre: "4\" VIDRIO DE SEGURIDAD PARA PREMIUM LF", categoria: "Otros", marca: "WINTERS", material: "", precio: 34.428},
  {codigo: "PFG1730R3R99/R134-R22-R438A", nombre: "Manovacuómetro Winters Serie PFG R134/R22/R438A, dial 2,5\", -1/0/8,3 kg/cm2/Retard/°C, 1/8\" NPT inferior, caja plastica azul, internos de latón, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 11.844000000000001},
  {codigo: "PFG1732R3R99/R134-R22-R438A", nombre: "Manómetro Winters Serie PFG R134/R22/R438A, dial 2,5\", 0/35 kg/cm2/Retard/°C, 1/8\" NPT inferior, caja plastica roja, internos de latón, seco", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 11.844000000000001},
  {codigo: "PFG1730R3R99-R22", nombre: "Manovacuómetro Winters Serie PFG R22, 2,5\", -1/0/12,5 kg/cm2/°C, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 44.754},
  {codigo: "PFG1730R3R99-R404", nombre: "Manovacuómetro Winters Serie PFG R404, 2,5\", -1/0/12,5 kg/cm2/°C, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 44.754},
  {codigo: "PFG1731R3R99-R22", nombre: "Manovacuómetro Winters Serie PFG R404, 2,5\", -1/0/25 kg/cm2/°C, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 44.754},
  {codigo: "PFG1731R3R99-R404", nombre: "Manovacuómetro Winters Serie PFG R404, 2,5\", -1/0/25 kg/cm2/°C, 1/4\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 44.754},
  {codigo: "PFG1734R3R99/R404", nombre: "Manovacuómetro Winters Serie PFG R404, 4\", -1/0/12,5 kg/cm2/°C, 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 116.35799999999998},
  {codigo: "PFG1735R3R99-R404", nombre: "Manovacuómetro Winters Serie PFG R404, -1/0/25Kg/cm2/°C, 4\", 1/2\" NPT inferior, caja Ac. Inox. 304, internos Ac. Inox. 316, con glicerina.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce/Níquel/Acero inox", precio: 116.35799999999998},
  {codigo: "PFE3933R1", nombre: "Manómetro Winters Serie PFE SPRINKLER AGUA, dial 3,5\", 0/300 psi 1/4\"NPT inferior, clase ±3-2-3%, Aprobación UL y FM.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón", precio: 20.688},
  {codigo: "PEU1396R7UCSL", nombre: "Vacuómetro Winters Serie PEU, dial 2\", -760 mmHg/0, 1/8\" NPT, posterior caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción. FREE OIL", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 13.476},
  {codigo: "PEU1408R3R1UCSL", nombre: "Manómetro Winters Serie PEU, dial 2\", 0/10 Kg/cm2 & 0/150 psi, 1/8\" NPT, posterior caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción. FREE OIL", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 13.476},
  {codigo: "PEU1413UCCAFE", nombre: "Manometro Winters Serie PEU dial 2\", 0/20 Kg/cm2, 1/8 NPT posterior, internos latón, clase ±3-2-3%, con grampa de sujeción., p/maq. café, p/bomba", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 13.476},
  {codigo: "PEU1431UCR7R6", nombre: "Vacuómetro Winters Serie PEU, dial 2,5\", -760/0 mmHg & -30/0\"Hg, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "PEU1436UCR3R1", nombre: "Manómetro Winters Serie PEU, dial 2,5\", 0/1 Kg/cm2 & 0/15 psi, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "PEU1437UCR3R1", nombre: "Manómetro Winters Serie PEU, dial 2,5\", 0/2 Kg/cm2 & 0/30 psi, 1/4\" NPT posterior,caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "PEU1438UCR3R1", nombre: "Manómetro Winters Serie PEU, dial 2,5\", 0/4 Kg/cm2 & 0/60 psi, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "PEU1440UCR3R1", nombre: "Manómetro Winters Serie PEU, dial 2,5\", 0/10 Kg/cm2 & 0/150 psi, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "PEU1442UCR3R1", nombre: "Manómetro Winters Serie PEU, dial 2,5\", 0/20 Kg/cm2 & 0/300 psi, 1/4\" NPT posterior, caja acero, internos latón, clase ±3-2-3%, con grampa de sujeción.", categoria: "Manómetros", marca: "WINTERS", material: "Caja acero, internos latón", precio: 16.242},
  {codigo: "P1S255R1R11", nombre: "Manómetro Winters Serie P1S, dial 6\", 0/200 psi & 0/14 bar, 1/4\" NPT inferior, caja acero, internos latón, clase ±1%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón", precio: 56.826},
  {codigo: "P1S255R1R11", nombre: "Manómetro Winters Serie P1S, dial 6\", 0/200 psi & 0/14 bar, 1/2\" NPT inferior, caja acero, internos latón, clase ±1%, seco.", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón", precio: 62.748},
  {codigo: "PFD40102", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -1/0/1\" H2O, 1/8 NPT, clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 165.23999999999998},
  {codigo: "PFD40102-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -1/0/1\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40106-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -15/0/15\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40019-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/10\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40022", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/20\" H2O, 1/8 NPT, clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 165.23999999999998},
  {codigo: "PFD40022-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/20\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40024-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0-30\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40026-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/50\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40029-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/100\" H2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40501-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/1 kPa, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40505-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/3 kPa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40507-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/5 kPa, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40510-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0-10 kPa, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40513-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0-25 kPa, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40514-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0-30 kPa, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40351", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -5/0/5 mmH2O, 1/8 NPT", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 330.47999999999996},
  {codigo: "PFD40351-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -5/0/5 mmH2O, 1/8 NPT, clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 332.63399999999996},
  {codigo: "PFD40352", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -10/0/10 mmH2O, 1/8 NPT, clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 330.47999999999996},
  {codigo: "PFD40352-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -10/0/10 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 332.63399999999996},
  {codigo: "PFD40301-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/10 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 332.63399999999996},
  {codigo: "PFD40302", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/15 mmH2O 1/8\" NPT,  clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 330.47999999999996},
  {codigo: "PFD40304-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/25 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40306", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/50 mmH2O, 1/8 NPT, clase ±2%.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 165.23999999999998},
  {codigo: "PFD40306-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/50 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40308-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/100 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40310-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/150 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40312-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/250 mmH2O, 1/8 NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40313", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/300 mmH2O, 1/8 NPT, clase ±2%", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 165.23999999999998},
  {codigo: "PFD40202-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", -100/0/100 Pa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 332.63399999999996},
  {codigo: "PFD40211-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/60 Pa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 332.63399999999996},
  {codigo: "PFD40218-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/500 Pa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40219-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/750 Pa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "PFD40220-RSP", nombre: "Manómetro diferencial magnético Winters Serie PFD WinAIR, dial 4\", 0/1.000 Pa 1/8\" NPT, clase ±2%, con aguja roja de seteo.", categoria: "Manómetros", marca: "WINTERS", material: "Aluminio/Nylon fibra vidrio", precio: 167.394},
  {codigo: "LE130VC", nombre: "Transmisor de Presión Compacto Winters Serie LE1, -30\"Hg/0 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, Alim: 10-30VDC, membrana de acero inoxidable, sensor siliconado.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 466.806},
  {codigo: "LE10060", nombre: "Transmisor de Presión Compacto Winters Serie LE1, -30\"Hg/0/60 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE10100", nombre: "Transmisor de Presión Compacto Winters Serie LE1, -30\"Hg/0/100 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE10150", nombre: "Transmisor de Presión Compacto Winters Serie LE1, -30\"Hg/0/150 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE115", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/15 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE125", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/25 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE160", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/60 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE1100", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/100 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE1150", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/150 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE1300", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/300 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE11000", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/1.000 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE15000", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/5.000 psi, 1/4\" NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor siliconado.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 466.806},
  {codigo: "LE1150R11", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/10 bar, 1/4\"NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE1200R11", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/16 bar, 1/4\"NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE1300R11", nombre: "Transmisor de Presión Compacto Winters Serie LE1, 0/25 bar, 1/4\"NPT, mini DIN, 4-20mA, clase ±0,5%, 10-30VDC, sensor cerámico.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 152.85},
  {codigo: "LE315", nombre: "Transmisor de Presión Winters Serie LE3, 0/15 psi, 1/4\"NPT, Conec ISO 4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE330", nombre: "Transmisor de Presión Winters Serie LE3, 0/30 psi, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE3100", nombre: "Transmisor de Presión Winters Serie LE3, 0/100 psi, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE3150", nombre: "Transmisor de Presión Winters Serie LE3, 0/150 psi, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE31500", nombre: "Transmisor de Presión Winters Serie LE3, 0/1.500 psi, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE330R11", nombre: "Transmisor de Presión Winters Serie LE3, 0/2 bar, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE3100R11", nombre: "Transmisor de Presión Winters Serie LE3, 0/7 bar, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LE3150R11", nombre: "Transmisor de Presión Winters Serie LE3, 0/10 bar, 1/4\"NPT, Conec ISO4400, Sal: 4-20mA, clase ±0,5%, Alim: 8-32VDC, sensor cerámico", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 193.22399999999996},
  {codigo: "LLP0001", nombre: "Transmisor de Presión Winters Serie LLP, 0/60 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0002", nombre: "Transmisor de Presión Winters Serie LLP, 0/100 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0003", nombre: "Transmisor de Presión Winters Serie LLP, 0/160 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0004", nombre: "Transmisor de Presión Winters Serie LLP, 0/250 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0005", nombre: "Transmisor de Presión Winters Serie LLP, 0/400 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0009", nombre: "Transmisor de Presión Winters Serie LLP, 0/600 mbar, 1/4\" BSPT, DIN, Sal: 4-20mA, clase ±0,5%, Alim: 12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 253.36799999999997},
  {codigo: "LLP0004/0-10V", nombre: "Transmisor de Presión Winters Serie LLP, 0/250 mbar, 1/4\" BSPT, DIN, Sal: 0/10V/3h, clase ±0,5%, Alim:12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 263.508},
  {codigo: "LLP0009/0-10V", nombre: "Transmisor de Presión Winters Serie LLP, 0/600 mbar, 1/4\" BSPT, DIN, Sal: 0/10V/3h, clase ±0,5%, Alim:12-28VDC, Diafragma de Ac. Inox.", categoria: "Transmisores", marca: "WINTERS", material: "", precio: 263.508},
  {codigo: "LXP07HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/145 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "LXP09HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/500 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "LXP10HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/1,000 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "LXP11HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/2,500 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "LXP13HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/6,000 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "LXP15HXN4", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/10,000 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/4\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1404.54},
  {codigo: "LXP08HXN2", nombre: "Transmisor de presión antiexplosivo Winters Serie LXP, Housing de acero inoxidable y partes húmedas de acero inoxidable 316 con aprobación NACE, -14.5/0/250 PSI, 4/20 mA + HART, 0.2%, 6' CABLE, 1/2\"NPT", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1280.61},
  {codigo: "G", nombre: "Gauge (standard)", categoria: "Otros", marca: "WINTERS", material: "", precio: 0.0},
  {codigo: "G", nombre: "Gauge", categoria: "Otros", marca: "WINTERS", material: "", precio: 0.0},
  {codigo: "LY16P13HX", nombre: "Transmisor de presión Winters Serie LY16 WinSMART, -14,5/0/6,000 psi, 4/20 mA+HART, clase 0,2%, soldadura de Ac. Inox. 316L, conexión a proceso 1/2\" NPT, Ac. Inox. 316, conexión eléctrica 1/2\" NPT A prueba de llamas, display LCD.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1614.564},
  {codigo: "LY16P16HX", nombre: "Transmisor de presión Winters Serie LY16 WinSMART, -14,5/0/14,500 psi, 4/20 mA+HART, clase 0,2%, soldadura de Ac. Inox. 316L, conexión a proceso 1/2\" NPT, Ac. Inox. 316, conexión eléctrica 1/2\" NPT A prueba de llamas, display LCD.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1614.564},
  {codigo: "LY162M", nombre: "SOPORTE DE MONTAJE DE TUBERÍA para Winters Serie LY16", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 51.833999999999996},
  {codigo: "G", nombre: "Relativa (estándar)", categoria: "Otros", marca: "WINTERS", material: "", precio: 0.0},
  {codigo: "LY36D20HX", nombre: "Transmisor de presión diferencial Winters Serie LY36 WinSMART, -160/0/160\"H20, 4/20mA+HART, 0,75%, O-Ring PTFE, conexión a proceso 1/4\" NPT Ac. Inox. 316, conexión eléctrica 1/2\" NPT, a prueba de llamas, con display LCD.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2391.63},
  {codigo: "LY36D50HX", nombre: "Transmisor de presión diferencial Winters Serie LY36 WinSMART, -72,5/0/145 psi, 4/20mA+HART, 0,75%, O-Ring PTFE, conexión a proceso 1/4\" NPT Ac. Inox. 316, conexión eléctrica 1/2\" NPT, a prueba de llamas, con display LCD.", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2391.63},
  {codigo: "LY36B1", nombre: "Accesorios Winters - Soporte de montaje de tubo (vertical) para transmisor de presión diferencial Serie LY36 WinSMART", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 69.072},
  {codigo: "LY36B2", nombre: "Accesorios Winters - Soporte de montaje de placa para transmisor de presión diferencial Serie LY36 WinSMART", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 69.072},
  {codigo: "LY16HXP07G7C2N2F66", nombre: "Transmisor de Presión WinSMART LY16. -14,5/0/150 psi. 4-20 mA + HART. 0.075%. Fla pr ½NPTHxM 316 SS", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1873.6019999999999},
  {codigo: "LY16HXP10G7C2N2F66", nombre: "Transmisor de Presión WinSMART LY16. -14.5/0/1.000 psi. 4-20 mA+HART. 0.075% Fl pr ½NPTH ½NPTM 304 SS", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1873.6019999999999},
  {codigo: "LY16HXP11G7C2N2F66", nombre: "Transmisor de Presión WinSMART LY16. -14.5/0/2500 psi. 4-20 mA+HART. 0.075% Fl p", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1873.6019999999999},
  {codigo: "LY16HIP07G1C2N2W66", nombre: "Trans. Presión WinSMART LY16, -14,5/150 psi, I.S. 4-20 mA+HART, 0.1%, Fl Pr 1/2\"NPTH, 1/2\"NPTM 316SS", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1830.534},
  {codigo: "LY16HIP09G1C2N2W66", nombre: "Trans. Presión WinSMART LY16, -14,5/500 psi, I.S. 4-20 mA+HART, 0.1%, Fl Pr 1/2\"NPTH, 1/2\"NPTM 316SS", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 1830.534},
  {codigo: "LY361XD60D2C2F4F66", nombre: "Transmisor de Pres. Dif. WinSMART LY36. -72.5/0/435 psi. 4-20 mA. 0.075%. Fl pr ½NPTH.  ½NPTH. 316SS", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2219.01},
  {codigo: "LY36HXD20D2C2F1F66", nombre: "Transmisor de Pres. Dif. WinSMART LY36. -160/0/160 in H2O. 4-20 mA+HART 0.075% ¼NPTF 316 ½NPTF Fl pr", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2391.63},
  {codigo: "LY36HXD30D2C2F1F66", nombre: "Transmisor de Pres. Dif. WinSMART LY36. -1.000/0/1.000 inH2O. 4-20 mA+HART. 0.075%. Fl pr ½NPTH ¼NPTH", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2391.63},
  {codigo: "LY36HXD60D2C2F1F66", nombre: "Transmisor de Pres. Dif. WinSMART LY36. -72.5/0/435 psi. 4-20 mA+HART. 0.075%. ¼NPTF ½NPTF Fl pr", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 2391.63},
  {codigo: "WPS0200", nombre: "Presostato Winters Serie WPS, 20/200 PA SPDT, Diámetro exterior 5/16”, Diámetro interior del tubo ¼”.", categoria: "Presostatos", marca: "WINTERS", material: "Aluminio/Acero inox", precio: 42.690000000000005},
  {codigo: "WPS0300", nombre: "Presostato Winters Serie WPS, 30/300 PA SPDT, Diámetro exterior 5/16”, Diámetro interior del tubo ¼”.", categoria: "Presostatos", marca: "WINTERS", material: "Aluminio/Acero inox", precio: 42.690000000000005},
  {codigo: "WPS1000", nombre: "Presostato Winters Serie WPS, 200/1.000 PA SPDT, Diámetro exterior 5/16”, Diámetro interior del tubo ¼”.", categoria: "Presostatos", marca: "WINTERS", material: "Aluminio/Acero inox", precio: 42.690000000000005},
  {codigo: "WPS2500", nombre: "Presostato Winters Serie WPS, 500/2.500 PA SPDT, Diámetro exterior 5/16”, Diámetro interior del tubo ¼”.", categoria: "Presostatos", marca: "WINTERS", material: "Aluminio/Acero inox", precio: 42.690000000000005},
  {codigo: "WPS4000", nombre: "Presostato Winters Serie WPS, 1.000/4.000 PA SPDT, Diámetro exterior 5/16”, Diámetro interior del tubo ¼”.", categoria: "Presostatos", marca: "WINTERS", material: "Aluminio/Acero inox", precio: 42.690000000000005},
  {codigo: "1WPS002T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 0,2/2,5 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS005T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 0,8/5 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS012T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 1/12 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS050T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 5/50 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS100T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 10/100 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS200T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 20/200 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPS400T4N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 50/400 bar, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPSL134N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 7/70 psi, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "1WPSL174N", nombre: "Presostato compacto Winters Serie 1WPS, Rango ajustable: 30/300 psi, SPDT, 1/4\" NPT, DIN, Material: Ac. Inox. 304", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 123.93},
  {codigo: "9WPSH07N4", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 150/1.000 psi (10,3/69 bar), SPDT Banda muerta fija, 1/4\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 910.89},
  {codigo: "9WPSH09N4", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 700/5.000 psi (48,2/345 bar), SPDT Banda muerta fija, 1/4\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 910.89},
  {codigo: "9WPSV01N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., -1/30\" HG (-1/0 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 780.762},
  {codigo: "9WPSL03N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 5/150 psi (0,3/10,3 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 780.762},
  {codigo: "9WPSL05N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 50/500 psi (3,4/34,5 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 780.762},
  {codigo: "9WPSH08N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 400/3.000 psi (27,6/207 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 910.89},
  {codigo: "9WPSH09N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 700/5.000 psi (48,2/345 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 910.89},
  {codigo: "9WPSH12N2", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 5.000/10.000 psi (344,8/689,6 bar), SPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 910.89},
  {codigo: "9WPSL032CCVN2S", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 5/150 psi (0,3/10,3 bar), DPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 1028.6219999999998},
  {codigo: "9WPSL052CCVN2S", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 50/500 psi (3,4/34,5 bar), DPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 1028.6219999999998},
  {codigo: "9WPSH082CCVN2S", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 400/3.000 psi (27,6/207 bar), DPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 1158.75},
  {codigo: "9WPSH092CCVN2S", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 700/5.000 psi (48,2/345 bar), DPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 1158.75},
  {codigo: "9WPSH122CCVN2S", nombre: "Presostato compacto a prueba de explosiones Winters Serie 9WPS, todo Ac. Inox., 5.000/10.000 psi (344,8/689,6 bar), DPDT Banda muerta fija, 1/2\" NPTH, NEMA 4X, Aprobación CSA para zonas peligrosas.", categoria: "Presostatos", marca: "WINTERS", material: "Acero inox", precio: 1158.75},
  {codigo: "LY49G05BAR12P12222NB3LO", nombre: "Presostato con salida 4…20 mA Winters Serie LY49; 0…5 bar, 4-20mA 3 hilos, contactos: PNP unidireccional, NPN unidireccional, conexión eléctrica M12, caja y conex. a proceso 316L, 1/4 NPT, cable por metro", categoria: "Presostatos", marca: "WINTERS", material: "", precio: 1199.9219999999998},
  {codigo: "D12PTFE1412", nombre: "Sello de diafragma Winters Serie D12, PTFE/AISI316, Sup AISI316, diafragma PTFE, Inf PTFE 1/4 NPTH x 1/2 BSPTM, 260°C", categoria: "Otros", marca: "WINTERS", material: "", precio: 551.6279999999999},
  {codigo: "D12PTFE1212", nombre: "Sello de diafragma Winters Serie D12, PTFE/AISI316, Sup AISI316, diafragma PTFE, Inf PTFE 1/2 NPTH x 1/2 BSPTM, 260°C", categoria: "Otros", marca: "WINTERS", material: "", precio: 551.6279999999999},
  {codigo: "D12PTFE1212-NPT", nombre: "Sello de diafragma Winters Serie D12, cuerpo 316 Ac. Inox., partes humedas PTFE, 1/2\"NPTHx1/2\"NPTM, 16 a 126°C / -11 a 145 psi", categoria: "Otros", marca: "WINTERS", material: "", precio: 551.6279999999999},
  {codigo: "D12PTFE1412-NPT", nombre: "Sello de diafragma Winters Serie D12, cuerpo 316 Ac. Inox., partes humedas PTFE, 1/4\"NPTHx1/2\"NPTM, 16 a 126°C / -11 a 145 psi", categoria: "Otros", marca: "WINTERS", material: "", precio: 551.6279999999999},
  {codigo: "D12PTFE1414-NPT", nombre: "Sello de diafragma Winters Serie D12, cuerpo 316 Ac. Inox., partes humedas PTFE, 1/4\"NPTHx1/4\"NPTM, 16 a 126°C / -11 a 145 psi", categoria: "Otros", marca: "WINTERS", material: "", precio: 551.6279999999999},
  {codigo: "D15992", nombre: "Sello de diafragma Winters Serie D15, 1/4\"NPTF x 3/4\"NPTM, Ac. Inox. 316 - presión de operación máxima: 400 bar", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 75.94200000000001},
  {codigo: "D15-1/2X1", nombre: "Sello de diafragma Winters Serie D15, 1/2\" F X 1\" M para presiones bajas - presión de operación máxima: 400 bar", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 142.29},
  {codigo: "D20980", nombre: "Sello de diafragma Winters Serie D20, Tri-Clamp 1,5\", Conexión a manómetro 1/4\" NPT Hembra", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 75.53399999999999},
  {codigo: "D20980-1/2", nombre: "Sello de diafragma Winters Serie D20, Tri-Clamp 1,5\", Conexión a manómetro 1/2\" NPT Hembra", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 75.53399999999999},
  {codigo: "D20976", nombre: "Sello de diafragma Winters Serie D20, Tri-Clamp 2\", Conexión a manómetro 1/4\" NPT Hembra", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 75.53399999999999},
  {codigo: "D20976-1/2", nombre: "Sello de diafragma Winters Serie D20, Tri-Clamp 2\", Conexión a manómetro 1/2\" NPT Hembra", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 75.53399999999999},
  {codigo: "D26DDLL", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria DIN11851 DN25 hembra 1/2NPT, cuerpo en Ac. Inox AISI316 y membrana en AC. INOX. 316L, membrana soldada, union roscada.", categoria: "Otros", marca: "WINTERS", material: "", precio: 166.278},
  {codigo: "DIN11851-DN32H", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria DIN11851 DN32 hembra 1/2NPT, cuerpo en Ac. Inox AISI316 y membrana en AC. INOX. 316L, membrana soldada, union roscada.", categoria: "Otros", marca: "WINTERS", material: "", precio: 187.962},
  {codigo: "D26DELL", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria DIN11851 DN40 hembra 1/2NPT, cuerpo en Ac. Inox AISI316 y membrana en AC. INOX. 316L, membrana soldada, union roscada.", categoria: "Otros", marca: "WINTERS", material: "", precio: 202.422},
  {codigo: "DIN11851-DN50H", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria DIN11851 DN50 hembra 1/2NPT, cuerpo en Ac. Inox AISI316 y membrana en AC. INOX. 316L, membrana soldada, union roscada-", categoria: "Otros", marca: "WINTERS", material: "", precio: 267.486},
  {codigo: "SMS-HEMBRA-15", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria SMS 1,5'' Hembra a 1/2\"NPT, Cuerpo en AISI316 y Mebrana Soldada en AISI316L con Tuerca.", categoria: "Otros", marca: "WINTERS", material: "", precio: 209.65200000000002},
  {codigo: "SMS-HEMBRA-2", nombre: "Sello de diafragma Winters Serie D26, conexión sanitaria SMS 2'' Hembra a 1/2\"NPT, Cuerpo en AISI316 y Mebrana Soldada en AISI316L con Tuerca.", categoria: "Otros", marca: "WINTERS", material: "", precio: 260.256},
  {codigo: "DIN11851-DN25M", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria DIN11851 DN25 Macho, 1/2NPT, Cuerpo en AISI316 y Membrana Soldada en AISI316L", categoria: "Otros", marca: "WINTERS", material: "", precio: 130.128},
  {codigo: "DIN11851-DN32M", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria DIN11851 DN32 Macho, Cuerpo en AISI316 y Membrana Soldada en AISI316L", categoria: "Otros", marca: "WINTERS", material: "", precio: 159.04799999999997},
  {codigo: "DIN11851-DN40M", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria DIN11851 DN40 Macho, Cuerpo en AISI316 y Membrana Soldada en AISI316L", categoria: "Otros", marca: "WINTERS", material: "", precio: 173.502},
  {codigo: "DIN11851-DN50M", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria DIN11851 DN50 Macho, Cuerpo en AISI316 y Membrana Soldada en AISI316L", categoria: "Otros", marca: "WINTERS", material: "", precio: 195.19199999999998},
  {codigo: "SMS-MACHO-15", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria SMS 1,5'' Macho a 1/2\"NPT, Cuerpo en AISI316 y Mebrana Soldada en AISI316", categoria: "Otros", marca: "WINTERS", material: "", precio: 159.04799999999997},
  {codigo: "SMS-MACHO-2", nombre: "Sello de diafragma Winters Serie D27, conexión sanitaria SMS 2'' Macho a 1/2\"NPT, Cuerpo en AISI316 y Mebrana Soldada en AISI316L", categoria: "Otros", marca: "WINTERS", material: "", precio: 180.73199999999997},
  {codigo: "D30976", nombre: "Sello de diafragma Winters Serie D30, Ac. Inox. 316., conex. 1/4\"NPTH X 1/4\"NPTM 1.000-6.000psi", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 99.62999999999998},
  {codigo: "D362NLSD", nombre: "Sello de diafragma Winters Serie D36, cuerpo Ac. Inox. 316, diafragma Ac. Inox. 316L, 1/2\"NPTHx1/2\"NPTM, pres. operativa: 16 a 400 bar", categoria: "Otros", marca: "WINTERS", material: "", precio: 237.88199999999998},
  {codigo: "D40975", nombre: "Sello de diafragma Winters Serie D40, Ac. Inox. 316, conex. 1/4\" NPTH X 1/4\" NPTM 15-1.000psi", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 123.66},
  {codigo: "D40976", nombre: "Sello de diafragma Winters Serie D40, Ac. Inox. 316, conex. 1/4\" NPTH X 1/2\" NPTM 15-1.000psi", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 123.66},
  {codigo: "D40977", nombre: "Sello de diafragma Winters Serie D40, Ac. Inox. 316, conex. 1/2\" NPTH X 1/2\" NPTM 15-1.000psi", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 123.66},
  {codigo: "D49", nombre: "Sello para homogeneizador Winters Serie D49, AISI 316 AC. INOX., c/brida de 2 agujeros  de AISI 304SS", categoria: "Otros", marca: "WINTERS", material: "", precio: 684.3059999999999},
  {codigo: "D70952+D70956", nombre: "Sello de diafragma bridado Winters Serie D70, Ac. Inox. 316, 1/2 NPT H-H, pres. max. 2.500psi", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 206.07},
  {codigo: "D70952+D70956-TFE", nombre: "Sello de diafragma bridado Winters Serie D70, Ac. Inox. 316, membrana y parte inferior recubierta con teflón, 1/2 NPT H-H, pres. max. 2.500psi.", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 412.068},
  {codigo: "D74857-D74952", nombre: "Sello diafragma D74, material 316 SS, 1/2\"NPTHx1/2\"NPTM, presión operativa: -1 a 2 bar, con flushing (ENSAMBLADO)", categoria: "Sellos Diafragma", marca: "WINTERS", material: "Acero inox", precio: 365.484},
  {codigo: "TAG140AG4", nombre: "Termómetro de columna Winters Serie TAG, caja aluminio anodizado 4,5\", -40/40°C, 1/2\"NPT, conexión angular 90°.", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 49.944},
  {codigo: "TAG130AG4", nombre: "Termómetro de columna Winters Serie TAG, caja aluminio anodizado 4,5\",-40/40°C, 1/2\"NPT vertical", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 48.888},
  {codigo: "TAG131AG4", nombre: "Termómetro de columna Winters Serie TAG, caja aluminio anodizado 4,5\",-5/80°C, 1/2\"NPT vertical", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 48.888},
  {codigo: "TBM10050B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 1\", vástago 5\", terminación en punta (no roscada), caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 7.164},
  {codigo: "TBM10050B28", nombre: "Termómetro bimetálico Winters Serie TBM, 0/50°C, dial 1\", vástago 5\", terminación en punta (no roscada), caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 7.164},
  {codigo: "TBM10050B31", nombre: "Termómetro bimetálico Winters Serie TBM, -20/120°C, dial 1\", vástago 5\", terminación en punta (no roscada), caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 7.164},
  {codigo: "TBM10050B32", nombre: "Termómetro bimetálico Winters Serie TBM, 0/150°C, dial 1\", vástago 5\", terminación en punta (no roscada), caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 7.164},
  {codigo: "TBM10050B34", nombre: "Termómetro bimetálico Winters Serie TBM, 0/300°C, dial 1\", vástago 5\", terminación en punta (no roscada), caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 7.164},
  {codigo: "TBM20025B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 2\", vástago 2,5\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20025B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 2\", vástago 2,5\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20025B32", nombre: "Termómetro bimetálico Winters Serie TBM, 0/150°C, dial 2\", vástago 2,5\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20025B33", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 2\", vástago 2,5\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20025B34", nombre: "Termómetro bimetálico Winters Serie TBM, 0/300°C, dial 2\", vástago 2,5\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B28", nombre: "Termómetro bimetálico Winters Serie TBM, 0/50°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B32", nombre: "Termómetro bimetálico Winters Serie TBM, 0/150°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B33", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B34", nombre: "Termómetro bimetálico Winters Serie TBM, 0/300°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B35", nombre: "Termómetro bimetálico Winters Serie TBM, 0/450°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM20040B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 2\", vástago 4\", 1/4\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 19.278000000000002},
  {codigo: "TBM30015B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 3\", vástago 38MM, 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30025B32", nombre: "Termómetro bimetálico Winters Serie TBM, 0/150°C, dial 3\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30025B33", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 3\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30025B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 3\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30040B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 3\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30040B33-WH", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 3\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304, fondo blanco.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30040B35", nombre: "Termómetro bimetálico Winters Serie TBM, 0/450°C, dial 3\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30040B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 3\", vástago 4\", 1/2 npt posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30040B9", nombre: "Termómetro bimetálico Winters Serie TBM, 10/150°C & 50/300°F, dial 3\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30060B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/-50°C, dial 3\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM30060B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 3\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 20.381999999999998},
  {codigo: "TBM40015B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 4\", vástago 1,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40025B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 4\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40025B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40025B34", nombre: "Termómetro bimetálico Winters Serie TBM, 0/300°C, dial 4\", vástago 2,5\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40040B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 4\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40040B29", nombre: "Termómetro bimetálico Winters Serie TBM, -50/100°C, dial 4\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40040B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40040B31", nombre: "Termómetro bimetálico Winters Serie TBM, -20/120°C, dial 4\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40040B34", nombre: "Termómetro bimetálico Winters Serie TBM, 0/300°C, dial 4\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40060B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 4\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40060B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40060B32S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/120°C, dial 4\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40060B33", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 4\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40060B36S", nombre: "Termómetro bimetálico Winters Serie TBM, 0/600°C, dial 4\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 25.134},
  {codigo: "TBM40090B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 9\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 26.58},
  {codigo: "TBM40260B35S", nombre: "Termómetro bimetálico Winters Serie TBM, dial 4\", 0/400°C,  vástago 26\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 38.556000000000004},
  {codigo: "TBM40260B36S", nombre: "Termómetro bimetálico Winters Serie TBM, dial 4\", 0/600°C,  vástago 26\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 38.556000000000004},
  {codigo: "TBM41040B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 4\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 49.572},
  {codigo: "TBM41040B32", nombre: "Termómetro bimetálico Winters Serie TBM, 0/150°C, dial 4\", vástago 4\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 49.572},
  {codigo: "TBM41040B33", nombre: "Termómetro bimetálico Winters Serie TBM, 0/200°C, dial 4\", vástago 4\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 49.572},
  {codigo: "TBM41100B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 10\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 53.226000000000006},
  {codigo: "TBM41100B48", nombre: "Termómetro bimetálico Winters Serie TBM, 0/120°C, dial 4\", vástago 10\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 53.226000000000006},
  {codigo: "TBM41100B50", nombre: "Termómetro bimetálico Winters Serie TBM, 0/250°C, dial 4\", vástago 10\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 53.226000000000006},
  {codigo: "TBM41150B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 15\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 53.226000000000006},
  {codigo: "TBM41120B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/+50°C, dial 4\", vástago 12\", 1/2\" NPT inferior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 53.226000000000006},
  {codigo: "TBM42040B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 4\", vástago 4\", 1/2\" NPT ángulo variable, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 60.18000000000001},
  {codigo: "TBM42060B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 4\", vástago 6\", 1/2\" NPT ángulo variable, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 60.18000000000001},
  {codigo: "TBM42090B28", nombre: "Termómetro bimetálico Winters Serie TBM, 0/50°C, dial 4\", vástago 9\", 1/2\" NPT ángulo variable, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 62.034},
  {codigo: "TBM42240B28", nombre: "Termómetro bimetálico Winters Serie TBM, 0/50°C, dial 4\", vástago 24\", 1/2\" NPT ángulo variable, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 69.54},
  {codigo: "TBM50040B28", nombre: "Termómetro bimetálico Winters Serie TBM, 0/50°C, dial 5\", vástago 4\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 30.983999999999998},
  {codigo: "TBM50060B27", nombre: "Termómetro bimetálico Winters Serie TBM, -50/50°C, dial 5\", vástago 6\", 1/2\" NPT posterior, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 30.983999999999998},
  {codigo: "TBM52125B30", nombre: "Termómetro bimetálico Winters Serie TBM, 0/100°C, dial 5\", vástago 12,5\", 1/2\" NPT ángulo variable, caja y vastago Ac. Inox. 304.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 70.986},
  {codigo: "TBT160ARG", nombre: "Termómetro bimetálico Winters Serie TBT, dial 90mm, 0/120°C, caja acero, 1/2\"BSPT posterior, vástago 50mm de latón.", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 19.626},
  {codigo: "TCT166", nombre: "Termómetro de contacto con abrazadera Winters Serie TCT, dial 2,5\" -40/40°C, caja de acero, para caños 1/2\" a 4\"", categoria: "Termómetros", marca: "WINTERS", material: "Espiral bimetálico", precio: 10.122},
  {codigo: "TCT167", nombre: "Termómetro de contacto con abrazadera Winters Serie TCT, dial 2,5\" 0/120°C, caja de acero, para caños 1/2\" a 4\"", categoria: "Termómetros", marca: "WINTERS", material: "Espiral bimetálico", precio: 10.122},
  {codigo: "TCT168", nombre: "Termómetro de contacto con abrazadera Winters Serie TCT, dial 2,5\" 30°F a 390°F & 0°C a 200°C, caja de acero, para caños 1/2\" a 4\"", categoria: "Termómetros", marca: "WINTERS", material: "Espiral bimetálico", precio: 10.122},
  {codigo: "THS32025C", nombre: "Termómetro solar Digital Winters Serie THS, dial 3\", -50/160°C, vástago 2,5\", 1/2\" NPT ángulo variable.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 122.07599999999998},
  {codigo: "THS32040C", nombre: "Termómetro solar Digital Winters Serie THS, dial 3\", -50/160°C, vástago 4\", 1/2\" NPT ángulo variable.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox", precio: 128.268},
  {codigo: "TMT7410", nombre: "Term de contacto magnético Winters Serie TMT, dial 2\", -15/260°C caja de acero, con imán de contacto", categoria: "Termómetros", marca: "WINTERS", material: "Espiral bimetálico", precio: 16.392},
  {codigo: "TRR11403052-0/50C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/50°C, carcasa, mallado, capilar 1,5m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 309.828},
  {codigo: "TRR11403052-0/300C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/300° C, carcasa, mallado, capilar 1,5m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 361.46399999999994},
  {codigo: "TRR11403102-0/50C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/50°C, carcasa, mallado, capilar 3m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 309.828},
  {codigo: "TRR11403102-0/100C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/100°C, carcasa, mallado, capilar 3m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 309.828},
  {codigo: "TRR11403102-0/500C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/500°C, carcasa, mallado, capilar 3m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 361.46399999999994},
  {codigo: "TRR12403052-0/50C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 4\", 0/50°C, capilar 1,5m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 309.828},
  {codigo: "TRR11603102-0/500C", nombre: "Termómetro de lectura remota para gas o vapor Winters Serie TRR, dial 6\", 0/500° C,capilar 1,5m, bulbo 0,5\"x6\" de Ac. Inox. 316, conexión 1/2\"BSPT inferior, con pestaña posterior.", categoria: "Termómetros", marca: "WINTERS", material: "Acero inox/latón", precio: 413.09999999999997},
  {codigo: "TD50MM-0/120C", nombre: "Termómetro Winters Serie TD50MM, dial 2\", 0/120°C, caja plastica, capilar cobre 1,5m, inferior, bulbo 30mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 12.948},
  {codigo: "TD50MM-0/350C", nombre: "Termómetro Winters Serie TD50MM, dial 2\", 0/350°C, caja plastica, capilar cobre 1,5m, inferior, bulbo 30mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 14.046},
  {codigo: "TSW174ARG", nombre: "Termómetro para agua caliente Winters Serie TSW, dial 2,5\" 0/120°C, 1/2\" BSPT, vástago 50mm de latón.", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 15.702},
  {codigo: "TTD409", nombre: "Bi-Indicador de Presión y Temperatura Winters Serie TTD Tridicator, dial 3\", 0/100 PSI & 20/160C, conx. inf. 1/2\" NPT latón, vástago 2,75\".", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 32.214},
  {codigo: "TTD408", nombre: "Bi-Indicador de Presión y Temperatura Winters Serie TTD Tridicator, dial 3\", 0/100psi/kpa & 20/160ºC/F, 1/2\" NPT posterior, vástago 2,5\".", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 28.434},
  {codigo: "TY52150H-S", nombre: "Transmisor de temperatura Winters Serie TY52 WinSMART, -50/400°C (-58/752°F), 4/20 mA+HART, clase 0,5%, Largo de inserción 150mm (6\"), conexión a proceso 1/2\" NPT Ac. Inox. 316, conexión eléctrica 1/2\" NPT, a prueba de llamas, con display LCD., diám. Del vastago 12mm", categoria: "RTDs y Termocuplas", marca: "WINTERS", material: "Acero inox", precio: 1485.0120000000002},
  {codigo: "P", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 1/2\" NPTM para termometro vástago 2,5\"(63mm), inserción 35mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 25.758},
  {codigo: "TBR25-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 3/4\" NPTM para termometro vástago 2,5\"(63mm), inserción 35mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 24.497999999999998},
  {codigo: "TBR3550-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 1/2\" NPTM para termometro vástago 4\" (100 mm), inserción 63 mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 35.274},
  {codigo: "TBR35-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 3/4\" NPTM para termometro vástago 4\" (100 mm), inserción 63 mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 33.384},
  {codigo: "TBR6-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 3/4\" NPTM para termometro vástago 6\" (150 mm), inserción 115 mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 48.01200000000001},
  {codigo: "TBR9-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 3/4\" NPTM para termometro vástago 9\" (225 mm), inserción 190 mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 67.332},
  {codigo: "TBR12-2", nombre: "Termopozo roscado Winters Serie TBR, Ac. Inox. 316, 1/2\" NPTH x 3/4\" NPTM para termometro vástago 12\" (300 mm), inserción 267 mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 92.172},
  {codigo: "TSN15SANI2", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 1,5\", 1/2\" NPT H para termometro vastago 2,5\" (63mm), inserción 40mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 144.588},
  {codigo: "TSN15SANI4", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 1,5\", 1/2\" NPT H para termometro vastago 4\"(100mm), inserción 75mm", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 209.65200000000002},
  {codigo: "TSN15SANI6", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 1,5\", 1/2\"NPT H para termometro vastago 6\"(150mm), inserción 125mm", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 325.32},
  {codigo: "TSN15SANI9", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 1,5\", 1/2\"NPT H para termometro vastago 9\"(225mm), inserción 200mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 484.36199999999997},
  {codigo: "TSN2SANI4", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 2\", 1/2\" NPT H para termometro vastago 4\"(100mm), inserción 75mm", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 231.33599999999998},
  {codigo: "TSN2SANI6", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 2\", 1/2\"NPT H para termometro vastago 6\"(150mm), inserción 125mm", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 339.78},
  {codigo: "TSN2SANI9", nombre: "Termopozo Sanitario Winters Serie TSN, Ac. Inox 316, Tri-clamp 2\", 1/2\"NPT H para termometro vastago 9\"(225mm), inserción 200mm.", categoria: "Termómetros", marca: "WINTERS", material: "", precio: 621.72},
  {codigo: "SMV500", nombre: "Mini válvula esférica de latón Winters Serie SMV, 1/4\"NPT HxM, esfera ac. inox, gasket teflón, max. Pres 400 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Latón", precio: 8.748},
  {codigo: "SMV500-1/2", nombre: "Mini válvula esférica de latón Winters Serie SMV, 1/2\"NPT HxM, esfera ac. inox, gasket teflón, max. Pres 400 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Latón", precio: 32.406},
  {codigo: "SMV532-S", nombre: "Mini válvula esférica latón Winters Serie SMV, 1/4\"BSPTH x 1/4''BSPM, esfera inox, gasket teflón, max. Pres 400 psi", categoria: "Válvulas", marca: "WINTERS", material: "Latón", precio: 11.706000000000001},
  {codigo: "SMV533", nombre: "Mini válvula esférica de latón mariposa Winters Serie SMV, 1/4\"NPT HxH, esfera inox, gasket teflón, max. Pres 400 psi", categoria: "Válvulas", marca: "WINTERS", material: "Latón", precio: 9.78},
  {codigo: "NVA8001", nombre: "Válvula aguja Winters Serie NVA, angular, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 103.692},
  {codigo: "NVA9001", nombre: "Válvula aguja Winters Serie NVA, angular, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 107.136},
  {codigo: "88-040-020", nombre: "Válvula Aguja Winters Serie NVA6999 NACE, angular, cuerpo de acero carbono, asiento duro, 1/2 NPT x 1/2 NPT MxH, 10.000 psi", categoria: "Válvulas", marca: "WINTERS", material: "", precio: 116.568},
  {codigo: "P1000081049", nombre: "Válvula aguja Winters Serie NVA, NACE, angular, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "", precio: 116.568},
  {codigo: "NVA5020", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1/4 NPT x 1/4 NPT HxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 42.348},
  {codigo: "NVA5001", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1/2 NPT x 1/2 NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 45.647999999999996},
  {codigo: "NVA5025", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 NPT HxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 73.188},
  {codigo: "NVA5005", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 73.188},
  {codigo: "NVA5003", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1\" NPT x 1\" NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 70.164},
  {codigo: "NVA6020", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1/4 NPT x 1/4 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 42.348},
  {codigo: "NVA6024", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 3/8 NPT x 3/8 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 58.385999999999996},
  {codigo: "NVA6021", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1/2 NPT x 1/2 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 52.674},
  {codigo: "NVA6001", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1/2 NPT x 1/2 NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 52.674},
  {codigo: "NVA6025", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 77.18399999999998},
  {codigo: "NVA6005", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 77.18399999999998},
  {codigo: "NVA6023", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1\" NPT x 1\" NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 73.602},
  {codigo: "NVA6003", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. al carbono, 1\" NPT x 1\" NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 73.602},
  {codigo: "NVA2020", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1/4 NPT x 1/4 NPT HxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 70.368},
  {codigo: "NVA2000", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1/4 NPT x 1/4 NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 70.368},
  {codigo: "NVA2021", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT HxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 80.27999999999999},
  {codigo: "NVA2001", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 80.27999999999999},
  {codigo: "NVA2025", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 3/4 NPT x 3/4 NPT HxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 126.822},
  {codigo: "NVA2003", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1\" NPT x 1\" NPT MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 138.32399999999998},
  {codigo: "NVA3024", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 3/8 NPT x 3/8 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 111.81599999999999},
  {codigo: "NVA3021", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1/2 NPT x 1/2 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 100.728},
  {codigo: "NVA3025", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 3/4 NPT x 3/4 NPT HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 130.614},
  {codigo: "NVA3003", nombre: "Válvula aguja Winters Serie NVA, recto, asiento duro, Ac. Inox., 1\" NPT x 1\" NPT MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 141.768},
  {codigo: "BBV3001", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 1 manija, asiento blando, Ac. Inox., 1/2 NPT x 1/2 MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 107.33999999999999},
  {codigo: "BBV4201", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento blando, Ac. al carbono, 1/2 NPT x 1/2 MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 118.69799999999998},
  {codigo: "BBV6220", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. al carbono, 1/4 NPT x 1/4 HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 118.69799999999998},
  {codigo: "BBV6221", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. al carbono, 1/2 NPT x 1/2 HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 118.69799999999998},
  {codigo: "BBV6201", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. al carbono, 1/2 NPT x 1/2 MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 118.69799999999998},
  {codigo: "BBV6261", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 244.422},
  {codigo: "BBV6271", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. al carbono, 3/4 NPT x 3/4 MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 244.422},
  {codigo: "t", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento blando, Ac. Inox., 1/2 NPT x 1/2 MxH, 6.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "", precio: 165.65399999999997},
  {codigo: "BBV3200", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. Inox., 1/4 NPT x 1/4 MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 165.65399999999997},
  {codigo: "BBV3221", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. Inox., 1/2 NPT x 1/2 HxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 165.65399999999997},
  {codigo: "BBV3201", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, asiento duro, Ac. Inox., 1/2 NPT x 1/2 MxH, 10.000 psi.", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 165.65399999999997},
  {codigo: "BBV3201-P", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, cuerpo y aguja 316SS, Empaq. PTFE, 10.000psi, 1/2\"NPT MxH", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 226.65599999999998},
  {codigo: "BBV3201-P-3O", nombre: "Válvula de bloqueo y purga Winters Serie BBV, 2 manijas, cuerpo y aguja 316SS, Empaq. PTFE, 10.000psi, 1/2\"NPT M, 2 conexiones 1/2\" NPTH y 1 purga 1/4\" NPTH", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 240.97799999999998},
  {codigo: "MVA3ASH2D", nombre: "Manifold Winters Serie MVA, 3 manijas, angular, asiento duro, Ac. Inox. 316, 1/2\" X 1/2\" H X H montaje directo, PTFE, 10.000 psi", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 617.958},
  {codigo: "MVA5ASH2D", nombre: "Manifold Winters Serie MVA, 5 manijas, angular, asiento duro, Ac. Inox. 316, 1/2\" X 1/2\" H X H, montaje directo, PTFE, 10.000 psi", categoria: "Válvulas", marca: "WINTERS", material: "Acero inox/Acero carbono", precio: 903.168},
  {codigo: "SSN515", nombre: "Amortiguador fijo Winters Serie SSN, Latón, 1/4\" NPT HxM, para agua.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox/Latón", precio: 15.702},
  {codigo: "SSN512", nombre: "Amortiguador fijo Winters Serie SSN, Latón, 1/2\" NPT HxM, para agua.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox/Latón", precio: 25.751999999999995},
  {codigo: "SSN518", nombre: "Amortiguador fijo Winters Serie SSN, Ac. Inox., 1/4\" NPT HxM, para agua.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox/Latón", precio: 20.592},
  {codigo: "SSN529", nombre: "Amortiguador fijo Winters Serie SSN, Ac. Inox., 1/2\" NPT HxM, para agua.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox/Latón", precio: 31.331999999999997},
  {codigo: "SAS540", nombre: "Amortiguador ajustable Winters Serie SAS, Latón, 1/4\" NPT HxM", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 38.97},
  {codigo: "SAS541", nombre: "Amortiguador ajustable Winters Serie SAS, Latón, 1/2\" NPT HxM", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 38.97},
  {codigo: "SAS542", nombre: "Amortiguador ajustable Winters Serie SAS, Ac. Inox. 316, 1/4\" NPT HxM", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 63.19799999999999},
  {codigo: "SAS543", nombre: "Amortiguador ajustable Winters Serie SAS, Ac. Inox. 316, 1/2\" NPT HxM", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 63.19799999999999},
  {codigo: "SCT-400", nombre: "Torre de enfriamiento Winters Serie SCT, Ac. Inox., 1/4\"M X 1/4\"H, Max temp: 300°C", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 65.358},
  {codigo: "SCT-500", nombre: "Torre de enfriamiento Winters Serie SCT, Ac. Inox., 1/2\"M X 1/2\"H, Max temp: 300°C", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 81.696},
  {codigo: "SCT-600", nombre: "Torre de enfriamiento Winters Serie SCT, Ac. Inox., 1/4\"M X 1/4\"H, Max temp: 500°C", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 125.71799999999999},
  {codigo: "SCT-700", nombre: "Torre de enfriamiento Winters Serie SCT, Ac. Inox., 1/2\"M X 1/2\"H, Max temp: 500°C", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 125.71799999999999},
  {codigo: "SOP32050", nombre: "Protector de sobrepresión Winters Serie SOP, tipo bellows, Ac. Inox. 316, 2.9/14.5 psi/bar, 1/2\" NPT MxH.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 231.33599999999998},
  {codigo: "SOP159050", nombre: "Protector de sobrepresión Winters Serie SOP, tipo bellows, Ac. Inox. 316, 14.5/58 psi/bar, 1/2\" NPT MxH.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 231.33599999999998},
  {codigo: "SOP9023050", nombre: "Protector de sobrepresión Winters Serie SOP, tipo bellows, Ac. Inox. 316, 58/145 psi/bar, 1/2\" NPT MxH.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 231.33599999999998},
  {codigo: "SOP14039550", nombre: "Protector de sobrepresión Winters Serie SOP, tipo pistón, Ac. Inox. 316, 140/395 psi/bar, 1/2\" NPT MxH.", categoria: "Accesorios", marca: "WINTERS", material: "Acero inox", precio: 274.716},
  {codigo: "SSP525", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de acero al carbón, 1/4\" NPT M x 1/4\" NPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 8.886},
  {codigo: "SSP525-BSPT", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de acero al carbón, 1/4\" BSPT M x 1/4\" BSPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 8.886},
  {codigo: "SSP535", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de ac. inox. 304, 1/4\" NPT M x 1/4\" NPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 17.352},
  {codigo: "SSP535-BSPT", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de ac. inox. 304, 1/4\" BSPT M x 1/4\" BSPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 17.352},
  {codigo: "SSP555", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de acero al carbón, 1/2\" NPT M x 1/2\" NPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 10.782000000000002},
  {codigo: "SSP555-BSPT", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de acero al carbón, 1/2\" BSPT M x 1/2\" BSPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 10.782000000000002},
  {codigo: "SSP585", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de ac. inox. 304, 1/2\" NPT M x 1/2\" NPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 52.56},
  {codigo: "SSP557", nombre: "Sifón Winters Serie SSP, tubería schedule 40 de ac. inox. 316, 1/2\" NPT M x 1/2\" NPT M.", categoria: "Accesorios", marca: "WINTERS", material: "Acero carbono/Latón", precio: 69.288},
  {codigo: "CAP1", nombre: "Capilar Winters AISI Ac. Inox. 316, Longitud: 1 metro, 1/2\" NPT H, 1/2\" NPT M.", categoria: "Otros", marca: "WINTERS", material: "", precio: 115.66799999999999},
  {codigo: "CAP1.5", nombre: "Capilar Winters AISI Ac. Inox. 316, Longitud: 1,5 metros, 1/2\" NPT H, 1/2\" NPT M.", categoria: "Otros", marca: "WINTERS", material: "", precio: 126.51599999999999},
  {codigo: "CAP3", nombre: "Capilar Winters AISI Ac. Inox. 316, Longitud: 3 metros, 1/2\" NPT H, 1/2\" NPT M.", categoria: "Otros", marca: "WINTERS", material: "", precio: 156.636},
  {codigo: "103S08", nombre: "Cupla roscada ½ NPT en acero inoxidable AISI316", categoria: "Otros", marca: "WINTERS", material: "", precio: 29.442},
  {codigo: "110B0604", nombre: "Adaptador de Latón de 1/4 NPT-H X 3/8\" NPT-M", categoria: "Otros", marca: "WINTERS", material: "", precio: 5.79},
  {codigo: "110B0804", nombre: "Buje de reducción roscado de bronce 1/4\"NPT Hembra x 1/2\"NPT Macho - Presión de Trabajo: 70 Kg/cm2", categoria: "Otros", marca: "WINTERS", material: "", precio: 8.34},
  {codigo: "110B1208", nombre: "Adaptador de bronce 1/2\" NPTH x 3/4\" NPTM", categoria: "Otros", marca: "WINTERS", material: "", precio: 15.924000000000001},
  {codigo: "110S0604", nombre: "Adaptador de acero inoxidable de 3/8” NPTM x 1/4” NPTH", categoria: "Otros", marca: "WINTERS", material: "", precio: 15.618},
  {codigo: "110S0804", nombre: "Buje de reducción roscado acero inox 316 1/4\"NPT Hembra x 1/2\"NPT Macho - Presión: 200 kg/cm2", categoria: "Otros", marca: "WINTERS", material: "", precio: 15.75},
  {codigo: "110S1208", nombre: "Adaptador roscado de Inox 1/2'' NPTH x 3/4'' NPTM", categoria: "Otros", marca: "WINTERS", material: "", precio: 28.56},
  {codigo: "120B0204", nombre: "Adaptador de bronce 1/4\"NPTH x 1/8\"NPTM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 8.627999999999998},
  {codigo: "120B0204BN", nombre: "Adaptador de bronce 1/4\"NPTH x 1/8\"BSPM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 9.648000000000001},
  {codigo: "120B0404", nombre: "Adaptador roscado de bronce 1/4\" NPT-H x 1/4\" NPT-M", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 10.092},
  {codigo: "120B0408", nombre: "Adaptador roscado de Bronce 1/2'' NPTH x 1/4'' NPTM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 17.868},
  {codigo: "120B0408BN", nombre: "Adaptador roscado de Bronce 1/2'' NPTH x 1/4'' BSPM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 17.868},
  {codigo: "120B0608", nombre: "Adaptador roscado de bronce 1/2\" NPTH x 3/8\"NPTM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 17.868},
  {codigo: "120B0808", nombre: "Adaptador roscado de bronce 1/2\" NPTH x 1/2\"BSPM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 19.83},
  {codigo: "120BM0204", nombre: "ADAPTADOR DE BRONCE 1/4NPTMx1/8NPTH", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 3.6959999999999997},
  {codigo: "120S0204", nombre: "Adaptador de 1/4 NPTH X 1/8\" NPTM acero inoxidable", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 14.052000000000001},
  {codigo: "120S0208", nombre: "Adaptador roscado de acero inox 316 1/2\"NPTH x 1/8\"NPTM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 32.616},
  {codigo: "120S0402", nombre: "Adaptador acero inox 1/8\"NPTH x 1/4\"NPTM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 10.458000000000002},
  {codigo: "120S0404NB", nombre: "Adaptador acero inox de 1/4\" BSPT-H x 1/4\"NPT-M", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 25.272},
  {codigo: "120S0404BN", nombre: "Adaptador acero inox de 1/4\" NPT-H x 1/4\"BSP-M", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 25.272},
  {codigo: "120S0408BN", nombre: "Adaptador Roscado de Acero Inox 316 1/2'' NPTH x 1/4'' BSPM", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 26.568},
  {codigo: "120S0608", nombre: "Adaptador de acero inoxidable de 3/8” NPTM x 1/2” NPTH", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 23.526},
  {codigo: "120S0608BN", nombre: "Adaptador de acero inoxidable de 3/8” BSPM x 1/2” NPTH", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 32.141999999999996},
  {codigo: "120S0808", nombre: "Adaptador roscado de acero inoxidable 1/2\" NPT-H x 1/2\" NPT-M", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 42.858000000000004},
  {codigo: "120S0808BN", nombre: "Adaptador M-H roscado acero inox. 316 p/alta presión (10.000psi) 1/2\"BSPMx1/2\"NPTH", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 38.663999999999994},
  {codigo: "120S0808NB", nombre: "Adaptador M-H roscado acero inox. 316 1/2\" NPT-M x 1/2\" BSP-H", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 42.342000000000006},
  {codigo: "120S0808BB", nombre: "Adaptador 1/2 BSPT-H a 1/2 BSP-M en acero inoxidable", categoria: "Accesorios", marca: "WINTERS", material: "Varios", precio: 42.342000000000006},
  {codigo: "122S08BN", nombre: "Adaptador Macho-Macho rosc Inox 316 p/alta presión (10.000psi) 1/2\"BSPMx1/2\"NPTM", categoria: "Otros", marca: "WINTERS", material: "", precio: 30.887999999999998},
  {codigo: "ADN-2-2-316", nombre: "Adaptador de Rosca 1/4''NPT Hembra a 1/4'' BSP Macho. AISI316. Pres.Max: 315Bar (4.570 psi)", categoria: "Otros", marca: "WINTERS", material: "", precio: 21.599999999999998},
  {codigo: "AB12BSP12NPT", nombre: "Adaptador de bronce 1/2\"BSPH x 1/2\"NPTM", categoria: "Otros", marca: "WINTERS", material: "", precio: 21.599999999999998},
  {codigo: "AB14BSP14NPT", nombre: "ADAPTADOR 1/4 BSP BF X 1/4\"NPT BM", categoria: "Otros", marca: "WINTERS", material: "", precio: 21.599999999999998},
  {codigo: "AS12NPT34NPT", nombre: "ADAPTADOR 1/2 NPT SF X 3/4\" NPT SM", categoria: "Otros", marca: "WINTERS", material: "", precio: 21.599999999999998},
  {codigo: "AS14NPT14BSP", nombre: "ADAPTADOR 1/4 NPT SF X 1/4\" BSP SM", categoria: "Otros", marca: "WINTERS", material: "", precio: 21.599999999999998},
  {codigo: "PPC5064ZRR1R11+SG-45+D12", nombre: "Ensamble Winters Manómetro Serie PPC-ZR, dial 4,5\" 0/100 psi/ (0/7 bar), clase 0,5%, con vidrio de seguridad + Sello Serie D12, diafragma PTFE, inferior PTFE 1/2\" NPT M.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 774.9119999999999},
  {codigo: "PFP659ZRR3R1-SG4+DIN11851DN32H", nombre: "Ensamble Winters Manómetro Serie PFP-ZR, dial 4\", clase 1%, 0/7 Kg/cm2 & 0/100 psi, con vidrio de seguridad + Sello Serie DIN11851 DN32H.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 345.62999999999994},
  {codigo: "PFP663R3R1+D20980-1/2", nombre: "Ensamble Winters Manómetro Serie PFP, dial 4\", 0/40 Kg/cm2 & 0/600 psi + Sello Serie D20 Tri-Clamp 1,5\".", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 218.742},
  {codigo: "PFP758R11S+D12PTFE1212-NPT", nombre: "Ensamble Winters Manómetro Serie PFP, dial 4,5\", 0/1 bar, + Sello Serie D12, cuerpo Ac. Inox. 316, partes humedas PTFE, 1/2\"NPTHx1/2\"NPTM.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 729.7679999999999},
  {codigo: "PFP758R11S1+D12PTFE1212-NPT", nombre: "Ensamble Winters Manómetro Serie PFP, dial 4,5\", 0/1,5 bar + Sello Serie D12, cuerpo Ac. Inox. 316, partes humedas PTFE, 1/2\"NPTHx1/2\"NPTM.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 729.7679999999999},
  {codigo: "PFP762R11S+D12PTFE1212-NPT", nombre: "Ensamble Winters Manómetro Serie PFP, dial 4,5\", 0/10 bar + Sello Serie D12, cuerpo Ac. Inox. 316, partes humedas PTFE, 1/2\"NPTHx1/2\"NPTM.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 729.7679999999999},
  {codigo: "PFP826R3R1+D20976", nombre: "Ensamble Winters Manómetro Serie PFP, dial 2,5\", 0/14 Kg/cm2 & 0/200 psi, + Sello Serie D20 Tri-Clamp 2\".", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 156.35999999999999},
  {codigo: "PPC5064ZRR1R11SG45+D12PTFENPT", nombre: "Ensamble Winters Manómetro Serie PPC-ZR, dial 4,5\", 0/100 psi & 0/7 bar, clase 0,5%, caja fenolica, con vidrio de seguridad + Sello Serie D12, 1/2\" NPT M, SS/PTFE.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 749.574},
  {codigo: "PPC5065ZRR1R11SG45+D12PTFENPT", nombre: "Ensamble Winters Manómetro Serie PPC-ZR, dial 4,5\", 0/160 psi & 0/11 bar, clase 0,5%, caja fenolica, con vidrio de seguridad + Sello Serie D12, 1/2\" NPT M, SS/PTFE.", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316L", precio: 749.574},
  {codigo: "PFP670ZRR3R1+D49", nombre: "Ensamble Winters Manómetro Serie PFP-ZR, dial 4\", 0/600 kg/cm2 & 0/8.700 psi, clase 1%, aro bayoneta, total inox. + Sello Serie D49 homogeneizador.", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 148.05599999999998},
  {codigo: "PFP658ZRR1R11+D81WIR1SSBSF2N", nombre: "Ensamble Manometro PFP-ZR 4\", 0/60 psi/bar, 1/2\" NPT inf + D81 Wafer 1\", AC. INOX. & BUNA-N, WINCONNECT", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox 316L", precio: 587.67},
  {codigo: "PFQ811ZRR3R1", nombre: "Manómetro Winters Serie PFQ-ZR STABILIZR 2,5\", 0-200 Kg/cm2/psi, 1/4\"NPT inf, 304SS, laton, Amortiguador Seco", categoria: "Manómetros", marca: "WINTERS", material: "Latón/Acero inox 316", precio: 17.214},
  {codigo: "PEW158B010R11S", nombre: "MANOMETRO 0-10BAR 1.5\"", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW158B315R11SBSP", nombre: "MANOMETRO 0-315 BAR-1.5\"", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW204B001VR11R99", nombre: "Vac -76cmHg/Bar-0 FREE OIL 50mm 1/4\"BSP inf, caja pint rojo, sock niquelado", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW204B003R11C", nombre: "Manometro PEW,  0-3 Bar, FREE OIL, 50mm, 1/8\"BSP inf, caja crom, socket niquelado", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW204B010R11S", nombre: "Manómetro  0-10 Bar FREE OIL 50mm 1/4\"BSP inf, caja chapa negra", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW204B15LPM", nombre: "MANOMETRO 0-15LTS/MIN (0-10KG/CM2), 50mm, 1/4\"NPT inf", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW204B250R3", nombre: "MANOMETRO 0-250KG/CM2, 50mm, 1/4\"NPT inf", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW208B315R11C", nombre: "Man  0-315 Bar FREE OIL 50mm 1/8\"BSP inf, caja crom, socket niquelado", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PEW254B600R12C", nombre: "VACUOMETRO -600 MBAR/0 FREE OIL", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 7.128},
  {codigo: "PPD-A-C-0-0-O-D-G (0-1,6 BAR)", nombre: "Diferencial PPD 4,5\", 0-1,6bar, Cuerpo Alum, caja ABS, 1/4\"NPTH Post, 2 SPST, 60W 3A 240V, NA/NC", categoria: "Manómetros", marca: "WINTERS", material: "Acero inox", precio: 1192.32},
  {codigo: "PRL039", nombre: "Manómetro Winters Serie PRL 1.5\". 0/5.000 psi/kpa 1/8\" NPT posterior", categoria: "Manómetros", marca: "WINTERS", material: "Bronce fosforado/latón/Acero inox", precio: 38.879999999999995},
  {codigo: "TTD408R11S", nombre: "Bi-Indicador de Presión y Temperatura Winters Serie TTD Tridicator, dial 3\", 0/100ºC & 0/10 bar , 1/2\" NPT posterior, vástago 2,5\", customizado", categoria: "Termómetros", marca: "WINTERS", material: "Latón", precio: 27.474},
  {codigo: "LST15200", nombre: "Transmisor de presión Winters LST 0/200psi. Tri-Clamp 1.5\" SS316. DIN. 4-20mA. Ex: 0.5%. 10-30VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 576.858},
  {codigo: "LVC-1-1-4-4N-G1700", nombre: "Transmisor de Presión Winters Serie LVC, 0/700 bar, 1/4\" NPT, DIN43650, Sal: 4-20 mA / 2 hilos, clase ±0,5%, Alim: 12-30VDC, IP65", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 320.406},
  {codigo: "LVC-1-1-4-4N-GX000", nombre: "Transmisor de Presión Winters Serie LVC, 0/1.000 bar, 1/4\" NPT, DIN43650, Sal: 4-20 mA / 2 hilos, clase ±0,5%, Alim: 12-30VDC, IP65", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 320.406},
  {codigo: "LTF0060-S", nombre: "Transmisor de Presión Winters Serie LTF, 0/60 psi, membrana rasante, G 1/2\", ISO4400, Sa: 4-20mA, clase ±0,5%, Alim: 8-32VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LTF0145-S", nombre: "Transmisor de Presión Winters Serie LTF, 0/150 psi, membrana rasante, G 1/2\", ISO4400, Sa: 4-20mA, clase ±0,5%, Alim: 8-32VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LTF1500-S", nombre: "Transmisor de Presión Winters Serie LTF, 0/1.500 psi, membrana rasante, G 1/2\", ISO4400, Sa: 4-20mA, clase ±0,5%, Alim: 8-32VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LTF1500R11-M10", nombre: "Transm. presion Winters LTF. 0/100 bar. mem rasante. G 1/2\". M12x1. 4-20mA. 0.5%. Alim: 8-32VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LTF3600", nombre: "Transm. presion Winters LTF. 0/3600 psi. mem rasante. 1/2\"NPT. Con DIN. 4-20mA. 0.5%. Alim: 10-30VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LTF3600-S", nombre: "Transmisor de Presión Winters Serie LTF, 0/3.600 psi, membrana rasante, G 1/2\", ISO4400, Sa: 4-20mA, clase ±0,5%, Alim: 8-32VDC", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 712.602},
  {codigo: "LM7015-012", nombre: "Transmisor de Presión Sumergible Winters Serie LM7, 0/15 psi, Señal Salida: 2 cables: 4-20 mA, clase ±0,25%, cable PUR 12 m", categoria: "Transmisores", marca: "WINTERS", material: "Acero inox", precio: 637.8299999999999},
  {codigo: "BR6-2100", nombre: "TERMOPOZO 1/2 NPTF X 1\"NPTM 316", categoria: "Termopozos", marca: "WINTERS", material: "Acero inox 316", precio: 55.68000000000001},
  {codigo: "36-TW-081", nombre: "Termopozo Winters TWF160012316 Conex Instr 1/2''NPTH. Conex Proc. 1''. Vast 12'' (304.8mm) + TAG", categoria: "Termopozos", marca: "WINTERS", material: "", precio: 608.3639999999999}
];

// ============ CATÁLOGO COMBINADO ============

// ============ CATÁLOGO CENI ============
// 643 productos de instrumentación industrial argentina
const CATALOGO_CENI = [
  {codigo: "1001/00001001", nombre: "Anclaje trasero, Incluye dos tornillos compatible únicamente con modelos SERIE 22", categoria: "Accesorios", marca: "CENI", precio: 6.5},
  {codigo: "1001/00001003", nombre: "Grampa de sujeción trasera. Incluye 2 tornillos para manómetros 22Ø63 P", categoria: "Accesorios", marca: "CENI", precio: 5.9},
  {codigo: "AH00001001", nombre: "Condensador tipo sifón para instrumentos de presión . Modelo Serie CS-10 *CS-1025V*. Material del tubo: AISI 316 Material de los conectores: AISI 316 Presión de trabajo: 0- 600 bar. Conex. Instrumento: 1/4\\\"NPTH Conex. Proceso: 1/4\\\"NPTM", categoria: "Sifones/Disipadores", marca: "CENI", precio: 49.0},
  {codigo: "AH00001002", nombre: "Condensador tipo sifón para instrumentos de presión. Modelo: Serie CS-10 *CS-1050V*. Material del tubo: AISI 316. Material de los conectores: AISI 316 Presión de trabajo: 0- 600 bar. Conex. Instrumento: 1/2\\\"NPTH Conex. Proceso: 1/2\\\"NPTM", categoria: "Sifones/Disipadores", marca: "CENI", precio: 57.0},
  {codigo: "AH00001004", nombre: "Condensador tipo sifón para instrumentos de presión Serie CS-10. Material del tubo: AISI 316 Material de los conectores: AISI 316. Presión de trabajo: 0- 600 bar. Conex. Instrumento: 1/2\\\"NPTH Conex. Proceso: 1/2\\\"NPTM", categoria: "Sifones/Disipadores", marca: "CENI", precio: 61.1},
  {codigo: "CERTIF1", nombre: "Los patrones utilizados en las calibraciones tienen trazabilidad a los patrones del INTI", categoria: "Certificados", marca: "CENI", precio: 31.0},
  {codigo: "CERTIF1.6", nombre: "Los patrones utilizados en las calibraciones tienen trazabilidad a los patrones del INTI", categoria: "Certificados", marca: "CENI", precio: 19.0},
  {codigo: "CG00000063", nombre: "Relleno de glicerina para manómetros Ø63 mm, de la serie 72/73.", categoria: "Glicerina", marca: "CENI", precio: 3.4},
  {codigo: "CG00000100", nombre: "Baño de glicerina para manómetros de la serie 70, 72 y 74", categoria: "Glicerina", marca: "CENI", precio: 4.0},
  {codigo: "CG00000125", nombre: "Relleno de glicerina para manómetros serie 90", categoria: "Glicerina", marca: "CENI", precio: 7.5},
  {codigo: "CG00000150", nombre: "Relleno de glicerina para manómetros serie 72, de 150 mm.", categoria: "Glicerina", marca: "CENI", precio: 7.5},
  {codigo: "CS-2R-NT8-FNT8-H-TP", nombre: "Válvula de bloqueo y purga marca CENI - Construida totalmente en acero al carbono - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Purga: 1/4\\\"NPTH con tapón - Empaquetadura: PTFE - Presión máxima: 6.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 92.7},
  {codigo: "FR00000001", nombre: "Flushing Ring 1 1/2\\\". Anillos de lavado para montaje entre bridas Serie FR-10. Material del cuerpo: Acero inoxidable AISI 316. Tipo de conexión de lavado: Roscadas (a pedido) Tipo de conexión: Bridada ASME B 16.5 /", categoria: "Flushing Rings", marca: "CENI", precio: 248.1},
  {codigo: "FR00000002", nombre: "Flushing Ring 2\\\". Anillos de lavado para montaje entre bridas Serie FR-10. Material del cuerpo: Acero inoxidable AISI 316. Tipo de conexión de lavado: Roscadas (a pedido) Tipo de conexión: Bridada ASME B 16.5", categoria: "Flushing Rings", marca: "CENI", precio: 336.0},
  {codigo: "FR00000003", nombre: "Flushing Ring 3\\\". Anillos de lavado para montaje entre bridas Serie FR-10. Material del cuerpo: Acero inoxidable AISI 316. Tipo de conexión de lavado: Roscadas (a pedido) Tipo de conexión: Bridada ASME B 16.5", categoria: "Flushing Rings", marca: "CENI", precio: 414.3},
  {codigo: "HR10-6Y2Y3650", nombre: "Los disipadores de calor de la serie DC-100 están diseñados para producir la eliminación del calor que se transfiere desde el fluido de proceso y o la instalación con alta temperatura, hacia los instrumentos de medición (manómetros, transmisores, presostatos, etc.), protegiendo tanto la integridad de los mismos, como así también la fidelidad de la medición. Material: AISI 316 Conex. Instrumento: 1/2\\\"NPTH Conex. Proceso: 1/2\\\"NPTM", categoria: "Sifones/Disipadores", marca: "CENI", precio: 144.8},
  {codigo: "MN11100RF0001D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0006D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0008D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-8 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0040D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0060A", nombre: "Serie: 11 Diámetro: 100 mm Salida: Inferior Rosca: 1/2\\\"NPT Escala: 0-60 kg/cm2;", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0060D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: -76 cm/hg - Clase: 1,6%", categoria: "Vacuómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0100K", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: -100 kpa/cm.hg - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0160D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0250D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF0400D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN11100RF6000D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-0,6 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN220100PF0140D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-140 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22040PA0004D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-4 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0006D", nombre: "Modelo: Serie 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"BSP (con alojamiento p/ oring) Escala: 0-6 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0010D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0015P", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-15 psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0016D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-16 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0025B", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-25 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0300D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-300 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040PA0400D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-400 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040RA0004D", nombre: "Serie: 22 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-4 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040RA0025B", nombre: "Serie: 22 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-25 bar;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22040RA0025C", nombre: "Serie: 22 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-25 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 11.2},
  {codigo: "MN22063PC0001D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0001V", nombre: "Vacuómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: -1 bar/in.hg - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0004D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0006D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0007D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-7 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0008D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-8 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0010D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0016D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0020D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-20 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0040D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0076V", nombre: "Vacuómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: -76 cm/hg - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0100D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0160D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0280D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-280 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0315D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0400D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC0600D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC1000D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PC2500D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PF0014D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-14 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PF0020D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PF0060D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PF0200D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-200 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063PF0250D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0001D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0001V", nombre: "Vacuómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -1 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0004D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0006D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0007D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-7 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0010D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0012D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-12 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0014D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-14 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0016D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0020D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-20 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0025C", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-200 kg/cm2 - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0025D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0070D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-70 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0076V", nombre: "Vacuómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -76 cmHg /-1 Bar - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0100D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0102D", nombre: "Manóvacuometro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -1+2 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0160D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0200D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-200 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0205D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0280D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-280 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0300D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-300 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC0600D", nombre: "Manómetro Modelo - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RC1000D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0008D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-8 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0030D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-30 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0040D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0060D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0104D", nombre: "Manóvacuometro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -1+4 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0140D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-140 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0250D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0315D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22063RF0400D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 14.1},
  {codigo: "MN22100PF0004D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0006D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0010D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0016D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0020D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-20 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0025D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0060D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0100D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0160D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0200D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-200 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0250D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0315D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0400D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF0600D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100PF1000D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Posterior 1/2\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 38.0},
  {codigo: "MN22100RF0001D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0004D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0006D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0008D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-8 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0010D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0014D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-14 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0016D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0020D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-20 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0025D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0040D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0060D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0070D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-70 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0076V", nombre: "Vacuómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: -76 cm/hg - Clase: 1,6% - Con glicerina", categoria: "Vacuómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0100D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0140D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-140 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0160D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0200D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-200 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0250D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0315D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0400D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0600D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF0700D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-700 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF1000D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF2500D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6% - Con glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN22100RF6000D", nombre: "Manómetro marca CENI - Serie: 22 - Caja: Acero inoxidable Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-0,6 bar/psi - Clase: 1,6% - Sin glicerina", categoria: "Manómetros", marca: "CENI", precio: 33.0},
  {codigo: "MN32040PA0006D", nombre: "Serie: 32 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-6 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32040PA0012B", nombre: "Serie: 32 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-12 bar; Automación Argentina", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32040PB2500D", nombre: "Serie: 32 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-2,5 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32040RA0002C", nombre: "Serie: 32 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-2 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32040RA0012B", nombre: "Serie: 32 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-12 bar; Automación Argentina", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32040RA0012C", nombre: "Serie: 32 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-12 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0004D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-4 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0006B", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/4\\\"NPT Escala: 0-0,6 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0010D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0012B", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-12 bar; Automación Argentina", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0030B", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/4\\\"NPT Escala: 0-30 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA0100D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/4\\\"NPT Escala: 0-100 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050PA2500D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-2,5 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050RA0012B", nombre: "Serie: 32 Diámetro: 50 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-12 bar; Automación Argentina", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050RA0012D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-12 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050RA0025B", nombre: "Serie: 32 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"NPT Escala: 0-25 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32050RB0025D", nombre: "Serie: 32 Diámetro: 50 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-25 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32063RC0025B", nombre: "Serie: 32 Diámetro: 63 mm Salida: Inferior Rosca: 1/4\\\"NPT Escala: 0-25 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32063RC0315B", nombre: "Serie: 32 Diámetro: 63 mm Salida: Inferior Rosca: 1/4\\\"NPT Escala: 0-315 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32063RD0025B", nombre: "Serie: 32 Diámetro: 63 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-25 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN32063RD0315B", nombre: "Serie: 32 Diámetro: 63 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-315 bar;", categoria: "Manómetros", marca: "CENI", precio: 3.0},
  {codigo: "MN50025PB0315B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø25 mm - Salida: Posterior 1/8\\\"BSP - Rango: 0-315 bar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 10.5},
  {codigo: "MN50040RB0076V", nombre: "Vacuómetro marca CENI - Serie: 50 - Caja: Cromada Ø40 mm - Internos: Cromados - Salida: Inferior 1/8\\\"BSP - Rango: -76 cm/hg - Clase: 1,6% ***Foto a modo de ejemplo***", categoria: "Vacuómetros", marca: "CENI", precio: 7.4},
  {codigo: "MN50040RB0076X", nombre: "Serie: 50 Diámetro: 40 mm Salida: Inferior Rosca: 1/8\\\"BSP Escala: -76 cm/hg-0 bar; Pharmaservice", categoria: "Manómetros", marca: "CENI", precio: 7.4},
  {codigo: "MN50040RD0018L", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø40 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.4},
  {codigo: "MN50050RB0010B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/8\\\"BSP - Rango: 0-10 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RB0018L", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/8\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RB0025B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/8\\\"BSP - Rango: 0-25 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RB0315B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/8\\\"BSP - Rango: 0-315 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0004B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-64bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0006B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-6 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0010B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-10 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0010D", nombre: "Serie: 50 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0010X", nombre: "Serie: 50 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-10 bar/kpa;", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0018L", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0025B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-25 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50050RD0315B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø50 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN50063RD0004B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø63 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-4 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 8.25},
  {codigo: "MN50063RD0018L", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø63 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 8.25},
  {codigo: "MN50063RD0025B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø63 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-25 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 8.25},
  {codigo: "MN50063RD0315B", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø63 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 8.25},
  {codigo: "MN50063RD0315D", nombre: "Manómetro marca CENI - Serie: 50 - Caja: Cromada Ø63 mm - Internos: Cromados - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 8.25},
  {codigo: "MN51040DA1000M", nombre: "Serie: 11 Diámetro: 40 mm Salida: Posterior con pestaña Rosca: 1/8\\\"NPT Escala: 0-1000 mbar;", categoria: "Manómetros", marca: "CENI", precio: 6.9},
  {codigo: "MN51040DA1000V", nombre: "Serie: 11 Diámetro: 40 mm Salida: Posterior con pestaña Rosca: 1/8\\\"NPT Escala: -1000 mbar-0;", categoria: "Manómetros", marca: "CENI", precio: 6.9},
  {codigo: "MN51040PA0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-4 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0006D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-6 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-10 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-16 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-25 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0205D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-315 bar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-315 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PA0400D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"NPT - Rango: 0-400 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-4 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0006D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-6 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-10 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0018L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-18 lts/min - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0315B", nombre: "Serie: 11 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"BSP Escala: 0-315 bar;", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-315 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040PB0400D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-400 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RA0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"NPT - Rango: 0-4 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RA0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"NPT - Rango: 0-16 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RA0205D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RA0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"NPT - Rango: 0-315 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RB0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: -76 cm/hg - Clase: 2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RB0205D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-2,5 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51040RB0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø40 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-315 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 6.0},
  {codigo: "MN51050DA0076V", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior con pestaña Rosca: 1/8\\\"NPT Escala: -76 cm/hg-0 bar;", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050DC0016D", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: 0-16 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050DC0076V", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: -76 cm/hg-0 bar;", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050PA0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-16 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PA0250A", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-250 kg/cm2;", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PA2500D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/8\\\"BSP - Rango: 0-2,5 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PB0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050PB0016D", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior con pestaña Rosca: 1/8\\\"BSP Escala: 0-16 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050PC0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PC0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PC0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PC2500D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PD0010D", nombre: "Serie: 11 Diámetro: 50 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 8.7},
  {codigo: "MN51050PD0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050PD0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Posterior 1/4\\\"BSP - Rango: 0-315 bar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0004B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-4 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0006B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-6 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0010B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-10 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0018L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0020B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-20 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0030B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-30 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0030L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-30 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RB0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/8\\\"BSP - Rango: 0-315 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0006B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0010B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0030B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-30 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0040D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RC0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -76 cm/hg - Clase: 1,6-2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0004B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-4 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0006B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-6 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0006D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-6 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0010B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-10 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0010K", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-10 bar/kpa - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0018L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0020B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-20 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0025B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-25 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0030B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0030K", nombre: "Serie: 11 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-30 bar/kpa; Rebron", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0030L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: -76 cm/hg - Clase: 1,6-2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0100B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-100 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-100 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-100 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0160D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-160 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0205B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-2,5 bar - Clase: 1,6-2,5%. Cuadrante con escala para acetileno", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0315K", nombre: "Serie: 11 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-315 bar/kpa; Rebron", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RD0400D", nombre: "Serie: 51 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"G Escala: 0-400 bar/psi; GNC", categoria: "Manómetros", marca: "CENI", precio: 5.15},
  {codigo: "MN51050RE0060D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-60 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RE0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RH0004B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 11*1 - Rango: 0-4 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RH0010B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 11*1 - Rango: 0-10 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RH0018L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 11*1 - Rango: 0-18 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RH0025B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 11*1 - Rango: 0-25 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51050RH0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø50 mm - Internos: Bronce - Salida: Inferior 11*1 - Rango: 0-315 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.6},
  {codigo: "MN51063DA0016X", nombre: "Serie: 11 Diámetro: 63 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: 0-16 bar/psi; MICRO", categoria: "Manómetros", marca: "CENI", precio: 8.9},
  {codigo: "MN51063DC0010D", nombre: "Serie: 11 Diámetro: 63 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 8.9},
  {codigo: "MN51063DC0016D", nombre: "Serie: 11 Diámetro: 63 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: 0-16 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 8.9},
  {codigo: "MN51063DC0076V", nombre: "Serie: 11 Diámetro: 63 mm Salida: Posterior con pestaña Rosca: 1/4\\\"NPT Escala: -76 cm/hg-0 bar;", categoria: "Manómetros", marca: "CENI", precio: 8.9},
  {codigo: "MN51063PC0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0060D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0160D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC0300D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC2500D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PC6000D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"NPT - Rango: 0-0,6 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063PD0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Posterior 1/4\\\"BSP - Rango: 0-315 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RA0030P", nombre: "Serie: 11 Diámetro: 63 mm Salida: Inferior Rosca: 1/8\\\"NPT Escala: 0-30 psi/kpa;", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0001D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0006B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0006D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0010D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0030D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-30 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0040D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0040D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0060D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: -76 cm/hg - Clase: 1,6-2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0100B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-100 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0160D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0250D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC0600D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC2500D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RC6000D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-0,6 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0001D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-1 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0004B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-4 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0006B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-6 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0006K", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-6 bar/kpa - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0010B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-10 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0010K", nombre: "Serie: 11 Diámetro: 63 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-10 bar/kpa; Rebron", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0016B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-16 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0016D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-16 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0018L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-18 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0020T", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"NPT - Rango: 0-20 TN - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0025B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-25 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0030B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0030K", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 bar/kpa - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0030L", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 lts/min - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0030T", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-30 TN - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0040D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-40 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0060B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-60 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0060Q", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-60 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0076V", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: -76 cm/hg - Clase: 1,6-2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0100D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-100 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0100K", nombre: "Vacuómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: -100 kpa/cm.hg - Clase: 1,6-2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0160D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-160 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0315B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0315D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-315 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD0315K", nombre: "Serie: 11 Diámetro: 63 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-315 bar/kpa; Rebron", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD2500B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-2,5 bar/psi - Clase: 1,6-2,5% Cuadrante especial para acetileno", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RD2500D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSP - Rango: 0-2,5 bar/psi - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51063RL0004B", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"BSPT - Rango: 0-4 bar - Clase: 1,6-2,5%", categoria: "Manómetros", marca: "CENI", precio: 7.8},
  {codigo: "MN51100RF0004D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN51100RF0004E", nombre: "Serie: 11 Diámetro: 100 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: 0-4 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN51100RF0025D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN51100RF0205D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN51100RF0600D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN51100RF1000D", nombre: "Manómetro marca CENI - Serie: 11 - Caja: Acero negra Ø100 mm - Internos: Bronce - Salida: Inferior 1/2\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6%", categoria: "Manómetros", marca: "CENI", precio: 22.9},
  {codigo: "MN52040PA0006X", nombre: "Serie: 52 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-6 bar/psi; Caja Roja", categoria: "Manómetros", marca: "CENI", precio: 7.4},
  {codigo: "MN52050RD0076X", nombre: "Serie: 52 Diámetro: 50 mm Salida: Inferior Rosca: 1/4\\\"BSP Escala: -76 cm/hg-0 bar; Rebron", categoria: "Manómetros", marca: "CENI", precio: 7.95},
  {codigo: "MN60063RC0100M", nombre: "Vacuómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: -100 mbar - Clase: 2,5%", categoria: "Vacuómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RC0600M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-600 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0060M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-60 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0100M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-100 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0160M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-160 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0250M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-250 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0400M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-400 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN60063RE0600M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero negra Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-600 mbar - Clase: 2,5%", categoria: "Manómetros", marca: "CENI", precio: 38.2},
  {codigo: "MN62100RC0100M", nombre: "Vacuómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: -100 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0060M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-60 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0100M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-100 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0160M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-160 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0250M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-250 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0400M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-400 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN62100RE0600M", nombre: "Manómetro marca CENI - Serie: 62 - Caja: Acero inoxidable Ø100 mm - Cierre: Bayoneta - Internos: Acero inoxidable, a cápsula para baja presión - Safety glass - Salida: Inferior 1/2\\\"G - Rango: 0-600 mbar - Clase: 1% - No apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 98.6},
  {codigo: "MN63063RE0160M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-160 mbar - Clase: 2,5% - No apto para carga de glicerina ***Hasta agotar stock***", categoria: "Manómetros", marca: "CENI", precio: 45.9},
  {codigo: "MN63063RE0250M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-250 mbar - Clase: 2,5% - No apto para carga de glicerina ***Hasta agotar stock***", categoria: "Manómetros", marca: "CENI", precio: 45.9},
  {codigo: "MN63063RE0600M", nombre: "Manómetro marca CENI - Serie: 60 - Caja: Acero inoxidable Ø63 mm - Internos: Bronce - Salida: Inferior 1/4\\\"G - Rango: 0-600 mbar - Clase: 2,5% - No apto para carga de glicerina ***Hasta agotar stock***", categoria: "Manómetros", marca: "CENI", precio: 45.9},
  {codigo: "MN70100PF0010D", nombre: "Serie: 70 Diámetro: 100 mm Salida: Posterior Rosca: 1/2\\\"NPT Escala: 0-10 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0004D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0006D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0010D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0016D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0025D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RC0105D", nombre: "Manovacuómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: -1+5 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Vacuómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0001D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0004D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0006D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0010D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0016D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0025D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0040D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0076V", nombre: "Vacuómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: -76cm/hg - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Vacuómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0100D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0250D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF0400D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN70100RF1000D", nombre: "Manómetro marca CENI - Serie: 70 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bordoneado - Salida: Inferior 1/2\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Apto para carga con glicerina - No apto para reparación", categoria: "Manómetros", marca: "CENI", precio: 46.9},
  {codigo: "MN72100PF0001D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0004D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0006D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0016D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0025D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0040D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0076V", nombre: "Vacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: -76 cm/hg - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0100D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0105D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: -1+5 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0160D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0205D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0250D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0315D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-315 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100PF0600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-600 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RD0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"BSP - Rango: 0-400 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RD0600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0001D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0004D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0005D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0006D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0007D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-7 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0016C", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 MCA - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0016D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0020D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-20 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0025C", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 MCA - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0025D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0030D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-30 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0040D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0060D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0070D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-70 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0076V", nombre: "Vacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -76 cm/hg - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0100D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0101D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+1,5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0103D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+3 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0105D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0112D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+12,5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0115D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+15 bar/psi/c° - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0124D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+24 bar/psi/c° - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0125D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+25 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0160D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0200D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-200 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0205D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0250D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0315D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-315 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF0600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-600 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF10000P", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-10000 psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF1000D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF15000P", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-15000 psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF1600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-1,6 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF5000D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-0,5 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RF6000D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-0,6 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72100RM0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø100 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 3/8\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Safety glass (vidrio de seguridad) - Tapón trasero expulsable - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 72.1},
  {codigo: "MN72150EF0010E", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150PF0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0001D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-1 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0004D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0006D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0016D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0025D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0040D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0050D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-50 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0060D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0076V", nombre: "Vacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Escala: -76 cm/hg-0 bar - Clase: 1% - Apto para carga con glicerina - Apto reparación.", categoria: "Vacuómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0100D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0105D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: -1+5 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0150D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-150 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0160D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0205D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0250D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN72150RF0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø150 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 115.4},
  {codigo: "MN73040PC0004D", nombre: "Serie: 72 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-4 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 24.4},
  {codigo: "MN73040PC2500D", nombre: "Serie: 72 Diámetro: 40 mm Salida: Posterior Rosca: 1/8\\\"NPT Escala: 0-2,5 bar/psi;", categoria: "Manómetros", marca: "CENI", precio: 24.4},
  {codigo: "MN73063EC0001D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0002D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-2 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0004D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0006D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0007D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-7 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0014D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-14 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0016D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063EC0040D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0025D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0060D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0100D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0105D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: -1+5 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0160D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0250D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC0600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC1000D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063PC2500D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Posterior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0001D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-1 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0004D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-4 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0006D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-6 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0007D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-7 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0010D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-10 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0014D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-14 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0016D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-16 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0025D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-25 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0040D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-40 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0060D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-60 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0076V", nombre: "Vacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: -1 bar . cm/hg - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0100D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-100 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0103D", nombre: "Manovacuómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: -1+3 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0160D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-160 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0250D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-250 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0315D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-315 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0400D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-400 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC0600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-600 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC1000D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-1000 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC1600D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-1,6 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN73063RC2500D", nombre: "Manómetro marca CENI - Serie: 72 - Caja: Acero inoxidable Ø63 mm - Internos: Acero inoxidable - Cierre: Bayoneta - Salida: Inferior 1/4\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1,6% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 39.1},
  {codigo: "MN74100RF0004B", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0007D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-7 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0010D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0030D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-30 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0040D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0060D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0100D", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-100 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0160E", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 kpa/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0300F", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-300 kpa/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF0600F", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-600 kpa/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF1600F", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-1600 kpa/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN74100RF2000F", nombre: "Manómetro marca CENI - Serie: 74 - Caja: Acero inoxidable Ø100 mm solid front - Internos: Acero inoxidable - Cierre: Bayoneta - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-2000 kpa/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 120.9},
  {codigo: "MN90114RF0004D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-4 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0006D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-6 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0010D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-10 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0016D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-16 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0025D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-25 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0040D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-40 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0060D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-60 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0076V", nombre: "Vacuómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: -76 cm/hg - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Vacuómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0160D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-160 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0205D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-2,5 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0250D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø125 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-250 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MN90114RF0400D", nombre: "Manómetro marca CENI - Serie: 90 - Caja: Fenólica Ø90 mm solid front - Internos: Acero inoxidable - Safety glass - Salida: Inferior 1/2\\\"NPT - Rango: 0-400 bar/psi - Clase: 1% - Apto para carga con glicerina - Apto reparación", categoria: "Manómetros", marca: "CENI", precio: 130.5},
  {codigo: "MPCC1201050000N", nombre: "Protector de goma, color negro, para manómetros Ø50 mm", categoria: "Accesorios", marca: "CENI", precio: 1.9},
  {codigo: "MPVC08001000000", nombre: "Para manómetros serie 22, 70 y 72 salida posterior. Material; AISI 304", categoria: "Accesorios", marca: "CENI", precio: 7.9},
  {codigo: "MPVC08001002020", nombre: "Para manómetros serie 22, 70 y 72 salida posterior. Material; AISI 304", categoria: "Accesorios", marca: "CENI", precio: 8.9},
  {codigo: "PROT.NAR.100", nombre: "Protector de goma, color naranja, para manómetros Ø100 mm", categoria: "Accesorios", marca: "CENI", precio: 3.35},
  {codigo: "PROT.NAR.63", nombre: "Protector de goma, color naranja, para manómetros Ø63 mm", categoria: "Accesorios", marca: "CENI", precio: 2.35},
  {codigo: "PROT.NEG.100", nombre: "Protector de goma, color negro, para manómetros Ø100 mm", categoria: "Accesorios", marca: "CENI", precio: 3.35},
  {codigo: "PROT.NEG.40", nombre: "Protector de goma, color negro, para manómetros Ø40 mm", categoria: "Accesorios", marca: "CENI", precio: 1.7},
  {codigo: "PROT.NEG.50", nombre: "Protector de goma, color negro, para manómetros Ø50 mm", categoria: "Accesorios", marca: "CENI", precio: 2.35},
  {codigo: "PROT.NEG.63", nombre: "Protector de goma, color negro, para manómetros Ø63 mm", categoria: "Accesorios", marca: "CENI", precio: 2.35},
  {codigo: "REPSELLO2", nombre: "Rango: NORMA/Modelo: Rosca: ID JMH: No incluye fluido trasmisor (carga de sistema) *Informe de Estado* Sello: APTO / NO APTO", categoria: "Repuestos Sellos", marca: "CENI", precio: 37.0},
  {codigo: "REPSELLO3", nombre: "Rango: NORMA: Rosca: ID JMH: *Informe de Estado* Sello: APTO / NO APTO", categoria: "Repuestos Sellos", marca: "CENI", precio: 48.0},
  {codigo: "REPSELLO4", nombre: "Rango: NORMA/Modelo: Rosca: ID JMH: No incluye fluido trasmisor (carga de sistema) *Informe de Estado* Sello: APTO / NO APTO", categoria: "Repuestos Sellos", marca: "CENI", precio: 58.0},
  {codigo: "REPSELLO5", nombre: "Rango: NORMA: Rosca: ID JMH: *Informe de Estado* Sello: APTO / NO APTO", categoria: "Repuestos Sellos", marca: "CENI", precio: 55.0},
  {codigo: "REPSELLO6", nombre: "Rango: Modelo: Rosca: ID JMH: No incluye fluido trasmisor (carga de sistema) *Informe de Estado* Sello: APTO / NO APTO", categoria: "Repuestos Sellos", marca: "CENI", precio: 43.0},
  {codigo: "SB04301150", nombre: "Tipo: Bridado Modelo: Serie SBR High , Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Alta presión, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 331.0},
  {codigo: "SB04502113", nombre: "Tipo: Bridado, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 268.45},
  {codigo: "SB04502153", nombre: "Sello separador de fluidos modelo: Serie SBR *M* Cuerpo: full AISI 316 - Membrana: Soldada AISI 316L Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM", categoria: "Sellos Diafragma", marca: "CENI", precio: 268.45},
  {codigo: "SB04503153", nombre: "Tipo: Bridado plastico, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo superior: AISI 316 con membrana en AISI 316L y recubrimiento de teflon - Cuerpo inferior: PVC", categoria: "Sellos Diafragma", marca: "CENI", precio: 256.7},
  {codigo: "SB04503154", nombre: "Tipo: Bridado plastico, Conex. Instrumento: 1/2\\\"NPTH, Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo superior: AISI 316 con membrana en AISI 316L y recubrimiento de teflon - Cuerpo inferior: Polipropileno (PP)", categoria: "Sellos Diafragma", marca: "CENI", precio: 256.7},
  {codigo: "SB04504153", nombre: "Modelo: Serie SBP Tipo: Bridado plastico, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo superior: AISI 316 con membrana en AISI 316L y recubrimiento de teflón - Cuerpo inferior y partes mojadas: PTFE", categoria: "Sellos Diafragma", marca: "CENI", precio: 281.9},
  {codigo: "SB04504154", nombre: "Modelo: Serie SBP Tipo: Bridado plastico, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo superior: AISI 316 con membrana en AISI 316L y recubrimiento de teflón - Cuerpo inferior y partes mojadas: PTFE", categoria: "Sellos Diafragma", marca: "CENI", precio: 281.9},
  {codigo: "SB04505153", nombre: "Tipo: Bridado plastico, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo superior: AISI 316 con membrana en AISI 316L y recubrimiento de teflon - Cuerpo inferior: PVDF", categoria: "Sellos Diafragma", marca: "CENI", precio: 311.8},
  {codigo: "SB04802122", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: via brida ANSI 1 1/2\\\", Presión: #RF 150, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 296.4},
  {codigo: "SB04802123", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1\\\", Conexión Proceso: via brida ANSI 1\\\", Presión: #RF 150, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 241.1},
  {codigo: "SB04802124", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: via brida ANSI 2\\\", Presión: #RF 150, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 375.1},
  {codigo: "SB04812122", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: via brida ANSI 1 1/2\\\", Presión: #RF 300, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 353.1},
  {codigo: "SB04812124", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: via brida ANSI 2\\\", Presión: #RF 300, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 451.7},
  {codigo: "SB04851150", nombre: "Tipo: Bridado, Modelo: Serie SBR L, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Baja Presión, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 324.3},
  {codigo: "SB04851151", nombre: "Tipo: Bridado con Flushing, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: 1/2\\\"NPTM, Presión: Media presión, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 624.8},
  {codigo: "SB04851152", nombre: "Tipo: Bridado ANSI, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 3\\\", Conexión Proceso: via brida ANSI 3\\\", Presión: #RF 150, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 514.4},
  {codigo: "SC01301153", nombre: "Tipo: Cupla, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN32, Conexión Proceso: 1/2\\\"NPTH, Presión: 4 bar - 80 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 187.3},
  {codigo: "SC01401153", nombre: "Tipo: Cupla, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN40, Conexión Proceso: 1/2\\\"NPTH, Presión: 1 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 233.4},
  {codigo: "SD01251150", nombre: "Tipo: DIN (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN25, Conexión Proceso: n/a, Presión: 8 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 89.9},
  {codigo: "SD01251153", nombre: "Tipo: DIN (MACHO), Conex. Instrumento: 1/4\\\"NPTH, Tamaño: DN25, Conexión Proceso: n/a, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L. Modelo según catalogo: SD 0125R", categoria: "Sellos Diafragma", marca: "CENI", precio: 104.6},
  {codigo: "SD01301150", nombre: "Tipo: DIN (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN32, Conexión Proceso: n/a, Presión: 6 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 100.75},
  {codigo: "SD01401151", nombre: "Tipo: DIN (HEMBRA), Conex. Instrumento: 1/4\\\"NPTH, Tamaño: DN40, Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SD01401152", nombre: "Tipo: DIN (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN40, Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SD01401153", nombre: "Tipo: DIN (MACHO), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN40, Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 140.25},
  {codigo: "SD01401154", nombre: "Tipo: DIN (MACHO), Conex. Instrumento: 1/4\\\"NPTH, Tamaño: DN40, Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 140.25},
  {codigo: "SD01501150", nombre: "Tipo: DIN (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: DN50, Conexión Proceso: n/a, Presión: 0,25 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 147.7},
  {codigo: "SE01251150", nombre: "Tipo: Danesa, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1\\\", Conexión Proceso: n/a, Presión: 8 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 89.9},
  {codigo: "SE01251151", nombre: "Tipo: Danesa, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: 1\\\", Conexión Proceso: n/a, Presión: 8 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 89.9},
  {codigo: "SE01401150", nombre: "Tipo: Danesa, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SE01401154", nombre: "Tipo: Danesa, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SE01501150", nombre: "Tipo: Danesa, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: n/a, Presión: 0,25 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 147.7},
  {codigo: "SH01001110", nombre: "Modelo; CENI - Serie SH 22 Tipo: Homogenizador, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: , Conexión Proceso: n/a, Presión: Hasta 600 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L (SA335-)", categoria: "Sellos Diafragma", marca: "CENI", precio: 100.3},
  {codigo: "SH01001111", nombre: "Tipo: Homogenizador, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: SA-308, Conexión Proceso: n/a, Presión: Hasta 600 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 143.1},
  {codigo: "SI01301150", nombre: "Tipo: Clamp, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: 3/4\\\", Conexión Proceso: n/a, Presión: 10 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 77.3},
  {codigo: "SI01301152", nombre: "Tipo: Clamp, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1\\\", Conexión Proceso: n/a, Presión: 6 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 86.8},
  {codigo: "SI01401151", nombre: "Tipo: Clamp, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 6 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 86.8},
  {codigo: "SI01401152", nombre: "Tipo: Clamp, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 6 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 86.8},
  {codigo: "SI01501150", nombre: "Tipo: Clamp, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: n/a, Presión: 2 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 117.2},
  {codigo: "SI01631150", nombre: "Tipo: Clamp, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2 1/2\\\", Conexión Proceso: n/a, Presión: 0,25 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 142.2},
  {codigo: "SM01401150", nombre: "Tipo: SMS (HEMBRA), Conex. Instrumento: 1/4\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SM01401150", nombre: "Tipo: SMS (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 116.55},
  {codigo: "SM01501150", nombre: "Tipo: SMS (HEMBRA), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: n/a, Presión: 0,25 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 147.7},
  {codigo: "SM01501153", nombre: "Tipo: SMS (MACHO), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: n/a, Presión: 2 bar - 40 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 140.25},
  {codigo: "SM01501154", nombre: "Tipo: SMS (MACHO), Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: n/a, Presión: 0,25 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 181.3},
  {codigo: "SR01241153", nombre: "Tipo: Buje, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1/2\\\", Conexión Proceso: 1/2\\\"NPTM, Presión: 80 bar - 400 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 68.4},
  {codigo: "SR01241154", nombre: "Tipo: Buje, Conex. Instrumento: 1/4\\\"NPTH, Tamaño: 1/2\\\", Conexión Proceso: 1/2\\\"NPTM, Presión: 80 bar - 400 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 68.4},
  {codigo: "SR01301153", nombre: "Tipo: Buje, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 3/4\\\", Conexión Proceso: 3/4\\\"NPTM, Presión: 40 bar - 250 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 74.6},
  {codigo: "SR01351153", nombre: "Tipo: Buje, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1\\\", Conexión Proceso: 1\\\"NPTM, Presión: 8 bar - 80 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 83.5},
  {codigo: "SR01401153", nombre: "Tipo: Buje, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: 1 1/2\\\", Conexión Proceso: 1 1/2\\\"NPTM, Presión: 2 bar - 25 bar, Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 95.45},
  {codigo: "SS-2RH-NT8-FNT8-H-TP", nombre: "Válvula de bloqueo y purga para alta presión marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Purga: 1/4\\\"NPTH con tapón - Empaquetadura: PTFE - Presión máxima: 10.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 229.3},
  {codigo: "SS-2RN15-NT8-FNT8-H", nombre: "Válvula de bloqueo y purga para alta presión marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Purga: 1/4\\\"NPTH con tapón - Empaquetadura: PTFE - Presión máxima: 15.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 447.5},
  {codigo: "SS-2R-NT8-FNT8-H-TP", nombre: "Válvula de bloqueo y purga marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Purga: 1/4\\\"NPTH con tapón - Empaquetadura: PTFE - Presión máxima: 6.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 173.1},
  {codigo: "SS-2R-NT8-FNT8-H-TP-G", nombre: "Válvula de bloqueo y purga para alta temperatura marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Purga: 1/4\\\"NPTH con tapón - Empaquetadura: GRAFOIL - Presión máxima: 6.000 psi - Temperatura máxima: 650ºC", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 176.2},
  {codigo: "SS-3D-FNT8-V", nombre: "Manifold 3 vías marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: vía brida - Conex. Proceso: 1/2\\\"NPTH Empaquetadura: PTFE - Presión máxima: 6.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 260.1},
  {codigo: "SS-5D-F8-B", nombre: "Manifold 5 vías marca CENI - Construida totalmente en acero inoxidable - Conex. Instrumento: via Brida - Conex. Proceso: 1/2\\\"NPTH - Venteo: 1/4\\\"NPTH - Empaquetadura: PTFE - Presión máxima: 6.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 412.9},
  {codigo: "SS-GV-NT8-FNT8-C-P", nombre: "Válvula de bloqueo marca CENI - 1 vía. Modelo: MIP-1V. Construida totalmente en acero inoxidable - Conex. Instrumento: 1/2\\\"NPTH - Conex. Proceso: 1/2\\\"NPTM - Empaquetadura: PTFE - Presión máxima: 6.000 psi", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 117.6},
  {codigo: "SS-PA-NT8-RS4", nombre: "Material: 100% AISI 316 1/2\\\"NPT H x 1/4\\\" NPT M", categoria: "Válvulas Bloqueo/Purga", marca: "CENI", precio: 14.6},
  {codigo: "SV00012120", nombre: "Tipo: Varivent, Conex. Instrumento: 1/2\\\"NPTH, Tamaño: , Conexión Proceso: n/a, Presión: , Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 265.3},
  {codigo: "SW00822161", nombre: "Tipo: Wafer, Conex. Instrumento: via capilar 1/2\\\"NPTH, Tamaño: 2\\\", Conexión Proceso: n/a, Presión: , Materiales: Cuerpo: AISI 316 - Membrana: AISI 316L", categoria: "Sellos Diafragma", marca: "CENI", precio: 213.3},
  {codigo: "TEB02P01A0060", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 85 mm UTIL - Rango: 0-60°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A0100", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 85 mm UTIL - Rango: 0-100°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-120°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A0250", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-250°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A0300", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-300°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A0400", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-400°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A4040", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: -40+40°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02P01A4041", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Posterior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: -10+40°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 19.4},
  {codigo: "TEB02R01A0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Inferior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-120°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 25.3},
  {codigo: "TEB02R01A0250", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Inferior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-250°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 25.3},
  {codigo: "TEB02R01A0400", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø63 mm - Salida: Inferior - Rosca: 1/4\\\"NPT - Largo vaina: 100 mm - Rango: 0-400°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 25.3},
  {codigo: "TEB03P02C0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: 0-120°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03P02C0250", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: 0-250°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03P02C0300", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: 0-300°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03P02C0400", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 135 mm - Rango: 0-400°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03P02C1040", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: -10+40°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03P02C4040", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: -40+40°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 36.6},
  {codigo: "TEB03R02C0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Inferior - Rosca: 1/2\\\"NPT - Largo vaina: 200 mm - Rango: 0-120°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 39.9},
  {codigo: "TEB03R02C0250", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Inferior - Rosca: 1/2\\\"NPT - Largo vaina: 200 mm - Rango: 0-250°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 39.9},
  {codigo: "TEB03R02C0400", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Inferior - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm - Rango: 0-400°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 39.9},
  {codigo: "TEB03V02C0060", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm ARO REPUJADO- Salida: Angula variable - Rosca: 1/2\\\"BSP M (buje deslizable) - Largo vaina: 200 mm U - Rango: 0-60°C, con tornillo externo p/ajuste de spam - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 68.0},
  {codigo: "TEB03V02C0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Angula variable - Rosca: 1/2\\\"NPT - Largo vaina: 150 mm, Util (c/buje deslizable) - Rango: 0-120°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 68.0},
  {codigo: "TEB03V02C0250", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Angula variable - Rosca: 1/2\\\"NPT - Largo vaina: 130 mm Util, fijo - sin regulación- Rango: 0-250°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 68.0},
  {codigo: "TEB03V02C0300", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Angula variable - Rosca: 1/2\\\"NPT - Largo vaina: 200 mm Util, c/buje deslizable - Rango: 0-300°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 68.0},
  {codigo: "TEB03V02C0400", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Trasera articulada - Rosca: 1/2\\\"NPT M - Largo vaina: 200 mm Máximo, REGUALABLE mediante Buje - Rango: 0-400°C - Clase: 1%", categoria: "Termómetros", marca: "CENI", precio: 68.0},
  {codigo: "TEC02P01A0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior con conexión clamp - Largo vaina: 100 mm - Rango: 0-120°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 38.0},
  {codigo: "TEC03P02C0120", nombre: "Termómetro bimetálico marca CENI - Construido totalmente en acero inoxidable - Caja: Ø100 mm - Salida: Posterior con conexión clamp - Largo vaina: 50 mm util - Rango: 0-120°C - Clase: 1,6%", categoria: "Termómetros", marca: "CENI", precio: 42.0},
  {codigo: "TP420INLED0000", nombre: "Indicador local universal. Marca: LEEG, Modelo: LDC11. Conexión DIN 42650, IP65. Señal de salida: 4-20 mA/ 1 PNP", categoria: "Transmisores", marca: "CENI", precio: 147.6},
  {codigo: "TPSMP131TLD0001", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-1 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0004", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-4 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0006", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-6 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0010", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-10 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT-M", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0016", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-16 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0025", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-25 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0040", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-40 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT-M", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0060", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-60 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0100", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-100 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0103", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: -1+2 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0109", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: -1+8 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0111", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-100 mbar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0112", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-250 mbar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0205", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-2,5 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0250", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-250 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0400", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-400 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD0600", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-600 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLD1000", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-1000 bar - Precisión: 0,5% Conex. Proceso: 1/2\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLDC006", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-6 bar - Precisión: 0,5% Conex. Proceso: 1/4\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLDC010", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-10 bar - Precisión: 0,5% Conex. Proceso: 1/4\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLDC025", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-25bar - Precisión: 0,5% Conex. Proceso: 1/4\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TPSMP131TLDC400", nombre: "Transmisor de presión LEEG - Modelo: SMP131-TLD Salida: 4-20 mA 2 cables - Alimentación: 24 vcc - Rango: 0-400 bar - Precisión: 0,5% Conex. Proceso: 1/4\\\"NPT", categoria: "Transmisores", marca: "CENI", precio: 227.5},
  {codigo: "TVR02010303S", nombre: "TERMOVAINA 1/2\\\"x 1/2\\\". Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH Conexión a proceso: 1/2'' BSPT M. Material: total inox AISI 316 Mecanizada en una sola pieza Largo útil de inserción: 100 mm", categoria: "Termovainas", marca: "CENI", precio: 60.6},
  {codigo: "TVR02010303Y", nombre: "Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH Conexión a proceso: 1/2'' NPTM. Material: total inox AISI 316 Mecanizada en una sola pieza Largo útil de inserción: 50 mm.", categoria: "Termovainas", marca: "CENI", precio: 49.8},
  {codigo: "TVR02010305S", nombre: "TERMOVAINA 1/2\\\"x 3/4\\\". Marca: CENI. Modelo: Serie TVR-1C75. Conexión Instrumento: 1/2'' NPTH. Conexión a proceso: 3/4'' NPTM. Material: total inox AISI 316. Mecanizada en una sola pieza Largo útil de inserción: 100 mm.", categoria: "Termovainas", marca: "CENI", precio: 60.6},
  {codigo: "TVR02010307V", nombre: "TERMOVAINA 1/2\\\"x 3/4\\\". Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH Conexión a proceso: 1/2'' NPTM. Material: total inox AISI 316. Mecanizada en una sola pieza Largo útil de inserción: 150 mm.", categoria: "Termovainas", marca: "CENI", precio: 104.3},
  {codigo: "TVR02020303S", nombre: "TERMOVAINA 1/2\\\"x 1/2\\\" Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH Conexión a proceso: 1/2'' NPTM. Material: total inox AISI 316 Mecanizada en una sola pieza Largo útil de inserción: 150 mm", categoria: "Termovainas", marca: "CENI", precio: 104.3},
  {codigo: "TVR02060303S", nombre: "Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH. Conexión a proceso: 1/2'' NPTM Material: total inox AISI 316. Mecanizada en una sola pieza Largo útil de inserción: 130 mm", categoria: "Termovainas", marca: "CENI", precio: 104.3},
  {codigo: "TVR02060305S", nombre: "Marca: CENI. Modelo: Serie TVR-1C50. Conexión Instrumento: 1/2'' NPTH Conexión a proceso: 3/4'' NPT M. Material: total inox AISI 316. Mecanizada en una sola pieza Largo útil de inserción: 130 mm (Acorde a sensor de 150 mm U)", categoria: "Termovainas", marca: "CENI", precio: 104.3}
];

const CATALOGO_COMPLETO = [...CATALOGO_GENEBRE, ...CATALOGO_TODOVALVULAS, ...CATALOGO_WINTERS, ...CATALOGO_CENI];


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
  return CATALOGO_COMPLETO.filter(p => {
    if (p.articulo && (p.articulo === articulo || p.articulo.toUpperCase().includes(articulo))) return true;
    if (p.codigo && (p.codigo.toUpperCase() === articulo || p.codigo.toUpperCase().includes(articulo))) return true;
    return false;
  });
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
  
  return CATALOGO_GENEBRE.filter(producto => {
    const searchText = `${producto.nombre} ${producto.categoria} ${producto.material || ''} ${producto.tipo || ''} ${producto.descripcion || ''}`
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
    respuesta += `*${marca} - ${p.articulo || p.codigo}* - ${p.nombre}\n`;
    if (p.medida) respuesta += `Medida: ${p.medida}\n`;
    if (p.material) respuesta += `Material: ${p.material}\n`;
    respuesta += `Precio lista: USD ${p.precio.toFixed(2)}\n`;
    if (p.codigoCompleto) respuesta += `Código: ${p.codigoCompleto}`;
  } else {
    for (const producto of resultados.productos.slice(0, 5)) {
      const marca = producto.marca || 'GENEBRE';
      
      // Productos WINTERS (sin variantes)
      if (producto.codigo && !producto.variantes) {
        respuesta += `*${marca} - ${producto.codigo}*\n`;
        respuesta += `${producto.nombre}\n`;
        if (producto.material) respuesta += `Material: ${producto.material}\n`;
        respuesta += `Precio: USD ${producto.precio.toFixed(2)}\n\n`;
      } 
      // Productos GENEBRE/TODOVALVULAS (con variantes)
      else if (producto.variantes && producto.variantes.length > 0) {
        respuesta += `*${marca} - Art. ${producto.articulo}* - ${producto.nombre}\n`;
        if (producto.material) respuesta += `${producto.material}\n`;
        const variantes = producto.variantes.slice(0, 6);
        const precios = variantes.map(v => `${v.medida}: USD ${v.precio.toFixed(2)}`).join(' | ');
        respuesta += `${precios}`;
        if (producto.variantes.length > 6) {
          respuesta += ` (+${producto.variantes.length - 6} medidas más)`;
        }
        respuesta += '\n\n';
      }
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
- WINTERS: Manómetros, vacuómetros, termómetros, presostatos, transmisores de presión (822 productos)
- CEPEX: Válvulas PVC/PP para industria química
- KITO: Válvulas mariposa industriales
- AERRE: Actuadores neumáticos
- CENI: Manómetros, vacuómetros, termómetros bimetálicos, transmisores de presión LEEG, sellos diafragma, válvulas bloqueo/purga, termovainas inox (643 productos)
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
10. NO podés recibir ni procesar audios ni imágenes. Si el cliente envía audio o imagen, pedile amablemente que te escriba en texto

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
            const tipoMensaje = msg.type;
            
            // Detectar audios, imágenes, videos, documentos, stickers
            if (['audio', 'image', 'video', 'document', 'sticker'].includes(tipoMensaje)) {
              console.log(`Mensaje tipo ${tipoMensaje} de ${numero} - no soportado`);
              await enviarMensaje(numero, 
                'Disculpá, no puedo procesar audios ni imágenes. ¿Podrías escribirme tu consulta en texto? Así te puedo ayudar mejor 😊'
              );
              continue;
            }
            
            const texto = msg.text?.body || '';
            if (!texto.trim()) continue;
            
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
    catalogo_genebre: CATALOGO_GENEBRE.length,
    catalogo_todovalvulas: CATALOGO_TODOVALVULAS.length,
    catalogo_winters: CATALOGO_WINTERS.length,
    catalogo_ceni: CATALOGO_CENI.length,
    total_productos: CATALOGO_COMPLETO.length
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
  console.log(`Catálogo WINTERS: ${CATALOGO_WINTERS.length} productos`);
  console.log(`Catálogo CENI: ${CATALOGO_CENI.length} productos`);
  console.log(`Total productos: ${CATALOGO_COMPLETO.length}`);
});
