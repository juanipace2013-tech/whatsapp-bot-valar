const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const VENDEDOR_NUMERO = process.env.VENDEDOR_NUMERO || '5491125928529';
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });

// ============================================
// MEMORIA DE CONVERSACIONES
// ============================================
const conversaciones = new Map();
const MAX_MENSAJES_MEMORIA = 10;

function obtenerConversacion(telefono) {
    if (!conversaciones.has(telefono)) {
        conversaciones.set(telefono, {
            mensajes: [],
            ultimaActividad: Date.now(),
            nombre: null,
            escalado: false
        });
    }
    return conversaciones.get(telefono);
}

function agregarMensaje(telefono, rol, contenido) {
    const conv = obtenerConversacion(telefono);
    conv.mensajes.push({ role: rol, content: contenido });
    conv.ultimaActividad = Date.now();
    
    // Mantener solo los últimos N mensajes
    if (conv.mensajes.length > MAX_MENSAJES_MEMORIA) {
        conv.mensajes = conv.mensajes.slice(-MAX_MENSAJES_MEMORIA);
    }
}

// Limpiar conversaciones viejas cada hora
setInterval(() => {
    const ahora = Date.now();
    const unaHora = 60 * 60 * 1000;
    for (const [telefono, conv] of conversaciones) {
        if (ahora - conv.ultimaActividad > unaHora) {
            conversaciones.delete(telefono);
        }
    }
}, 60 * 60 * 1000);

// ============================================
// CATÁLOGO DE PRODUCTOS
// ============================================
let catalogo = [];

// Cargar catálogo desde JSON
function cargarCatalogo() {
    try {
        const data = fs.readFileSync('./productos.json', 'utf8');
        catalogo = JSON.parse(data);
        console.log(`Catálogo cargado: ${catalogo.length} productos`);
    } catch (error) {
        console.log('No se encontró productos.json, usando catálogo vacío');
        catalogo = [];
    }
}

// Buscar productos en el catálogo
function buscarProductos(consulta, limite = 10) {
    if (catalogo.length === 0) return [];
    
    const terminos = consulta.toLowerCase().split(' ').filter(t => t.length > 2);
    
    const resultados = catalogo
        .map(producto => {
            let score = 0;
            const descripcion = String(producto.Descripcion || '').toLowerCase();
            const marca = String(producto.Marca || '').toLowerCase();
            const tipo = String(producto.Tipo || '').toLowerCase();
            const codigo = String(producto.Codigo || '').toLowerCase();
            
            for (const termino of terminos) {
                if (descripcion.includes(termino)) score += 3;
                if (marca.includes(termino)) score += 2;
                if (tipo.includes(termino)) score += 2;
                if (codigo.includes(termino)) score += 1;
            }
            
            return { ...producto, score };
        })
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limite);
    
    return resultados;
}

// Formatear productos para mostrar
function formatearProductos(productos) {
    if (productos.length === 0) return "No encontré productos con esas características.";
    
    let texto = `Encontré ${productos.length} producto(s):\n\n`;
    
    productos.forEach((p, i) => {
        texto += `${i + 1}. ${p.Descripcion}\n`;
        texto += `   Código: ${p.Codigo}\n`;
        texto += `   Marca: ${p.Marca}\n`;
        texto += `   Precio: USD ${p.Precio_USD}\n\n`;
    });
    
    return texto;
}

// ============================================
// SYSTEM PROMPT MEJORADO
// ============================================
const SYSTEM_PROMPT = `Sos el asistente virtual de VAL ARG S.R.L., una empresa argentina de válvulas e instrumentación industrial ubicada en 14 de Julio 175, Paternal, Capital Federal.

INFORMACIÓN DE LA EMPRESA:
- Horario: Lunes a Viernes de 9:00 a 18:00
- Teléfono: +54 11 2592-8529
- Email: ventas@val-ar.com.ar
- Web: www.val-ar.com.ar

MARCAS QUE DISTRIBUIMOS:
- GENEBRE (válvulas de bronce, acero, hierro, inoxidable)
- CEPEX (válvulas y accesorios PVC/PP)
- CENI (válvulas esféricas industriales)
- WINTERS (instrumentación: manómetros, termómetros)
- DANFOSS (presostatos, controles)
- ASTRAL (productos para piscinas)
- IF, ERA, AZUD, RAIN BIRD (riego y otros)

CAPACIDADES:
1. Tenés acceso a un catálogo de más de 12,000 productos con precios en USD
2. Podés buscar productos específicos y dar precios de lista
3. Recordás la conversación con cada cliente

INSTRUCCIONES:
1. Respondé de forma breve y amigable, como por WhatsApp
2. Cuando el cliente pregunte por un producto específico, buscá en el catálogo y mostrá opciones
3. Los precios son en USD y son de lista (pueden tener descuentos según volumen)
4. Si el cliente quiere confirmar stock, disponibilidad exacta, o hacer un pedido, indicá que un vendedor lo va a contactar
5. Si el cliente pide hablar con un vendedor o humano, marcá [ESCALAR] al final de tu respuesta
6. Usá español argentino (vos, tenés, etc.)
7. No uses markdown ni formateo especial, solo texto plano
8. Mantené las respuestas concisas pero informativas

CONTEXTO DE BÚSQUEDA:
Cuando recibas información de productos del catálogo, usala para responder. Si no hay resultados, indicá que podés buscar de otra forma o que un vendedor puede ayudar.`;

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

function normalizeArgentineNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    console.log('Número original:', phoneNumber);
    console.log('Número limpio:', cleaned);
    
    if (cleaned.startsWith('549') && cleaned.length === 13) {
        const codigoArea = cleaned.substring(3, 5);
        const numeroLocal = cleaned.substring(5);
        cleaned = '54' + codigoArea + '15' + numeroLocal;
        console.log('Número convertido a formato Meta:', cleaned);
    }
    
    return cleaned;
}

// Detectar si el cliente quiere escalar a un humano
function detectarEscalado(mensaje) {
    const triggers = [
        'hablar con alguien',
        'hablar con un vendedor',
        'hablar con una persona',
        'quiero hablar',
        'necesito hablar',
        'atención humana',
        'persona real',
        'vendedor',
        'asesor',
        'llamame',
        'llámame',
        'me llaman',
        'contacten',
        'urgente',
        'hacer un pedido',
        'quiero comprar',
        'confirmar pedido'
    ];
    
    const msgLower = mensaje.toLowerCase();
    return triggers.some(trigger => msgLower.includes(trigger));
}

// Detectar intención de búsqueda de productos
function detectarBusquedaProducto(mensaje) {
    const triggers = [
        'precio',
        'cuanto',
        'cuánto',
        'cuesta',
        'vale',
        'tienen',
        'tenes',
        'tenés',
        'busco',
        'necesito',
        'quiero',
        'válvula',
        'valvula',
        'manómetro',
        'manometro',
        'codo',
        'brida',
        'termómetro',
        'termometro',
        'actuador',
        'presostato',
        'electroválvula',
        'electrovalvula',
        'genebre',
        'cepex',
        'ceni',
        'winters',
        'pvc',
        'bronce',
        'acero',
        'inox'
    ];
    
    const msgLower = mensaje.toLowerCase();
    return triggers.some(trigger => msgLower.includes(trigger));
}

async function obtenerRespuestaClaude(telefono, mensajeUsuario) {
    try {
        const conv = obtenerConversacion(telefono);
        
        // Detectar si quiere escalar
        if (detectarEscalado(mensajeUsuario)) {
            conv.escalado = true;
        }
        
        // Buscar productos si parece una consulta de productos
        let contextoProductos = '';
        if (detectarBusquedaProducto(mensajeUsuario)) {
            const productos = buscarProductos(mensajeUsuario, 5);
            if (productos.length > 0) {
                contextoProductos = '\n\nRESULTADOS DEL CATÁLOGO:\n' + formatearProductos(productos);
            }
        }
        
        // Agregar mensaje del usuario a la memoria
        agregarMensaje(telefono, 'user', mensajeUsuario + contextoProductos);
        
        // Construir mensajes para Claude
        const mensajes = conv.mensajes.map(m => ({
            role: m.role,
            content: m.content
        }));
        
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: SYSTEM_PROMPT,
            messages: mensajes
        });
        
        let respuesta = response.content[0].text;
        
        // Si se detectó escalado, agregar marcador
        if (conv.escalado && !respuesta.includes('[ESCALAR]')) {
            respuesta += '\n\nUn vendedor te va a contactar a la brevedad.';
        }
        
        // Guardar respuesta en memoria
        agregarMensaje(telefono, 'assistant', respuesta);
        
        return { respuesta, escalado: conv.escalado };
        
    } catch (error) {
        console.error('Error con Claude:', error);
        return {
            respuesta: 'Disculpá, en este momento no puedo procesar tu consulta. Por favor contactanos al +54 11 2592-8529 o a ventas@val-ar.com.ar',
            escalado: false
        };
    }
}

async function enviarMensajeWhatsApp(destinatario, mensaje) {
    const numeroNormalizado = normalizeArgentineNumber(destinatario);
    console.log('Intentando enviar a:', numeroNormalizado);
    
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
                    to: numeroNormalizado,
                    type: 'text',
                    text: { body: mensaje }
                })
            }
        );

        const data = await response.json();
        console.log('Respuesta envío:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        throw error;
    }
}

// Notificar al vendedor cuando hay escalado
async function notificarVendedor(telefonoCliente, mensajeCliente) {
    const conv = obtenerConversacion(telefonoCliente);
    const historial = conv.mensajes.slice(-6).map(m => 
        `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.content}`
    ).join('\n\n');
    
    const notificacion = `🔔 NUEVO LEAD - Cliente requiere atención\n\n` +
        `📱 Teléfono: ${telefonoCliente}\n` +
        `💬 Último mensaje: ${mensajeCliente}\n\n` +
        `📋 Resumen conversación:\n${historial}`;
    
    console.log('Notificación para vendedor:', notificacion);
    
    // Enviar notificación al vendedor
    try {
        await enviarMensajeWhatsApp(VENDEDOR_NUMERO, notificacion);
        console.log('Vendedor notificado');
    } catch (error) {
        console.error('Error notificando vendedor:', error);
    }
}

// ============================================
// WEBHOOKS
// ============================================

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verificado correctamente');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messages = value?.messages;

            if (messages && messages.length > 0) {
                const message = messages[0];
                const from = message.from;
                const msgBody = message.text?.body;

                if (msgBody) {
                    console.log(`\n========================================`);
                    console.log(`Mensaje de ${from}: ${msgBody}`);
                    
                    const { respuesta, escalado } = await obtenerRespuestaClaude(from, msgBody);
                    console.log('Respuesta:', respuesta);
                    
                    await enviarMensajeWhatsApp(from, respuesta);
                    
                    // Si hay escalado, notificar al vendedor
                    if (escalado) {
                        await notificarVendedor(from, msgBody);
                    }
                    
                    console.log(`========================================\n`);
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        res.sendStatus(500);
    }
});

// Endpoint para ver estadísticas
app.get('/stats', (req, res) => {
    const stats = {
        conversacionesActivas: conversaciones.size,
        productosEnCatalogo: catalogo.length,
        uptime: process.uptime()
    };
    res.json(stats);
});

// Health check
app.get('/', (req, res) => {
    res.send(`Bot de VAL-AR funcionando correctamente. Catálogo: ${catalogo.length} productos.`);
});

// ============================================
// INICIO
// ============================================

cargarCatalogo();

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Catálogo cargado: ${catalogo.length} productos`);
});
