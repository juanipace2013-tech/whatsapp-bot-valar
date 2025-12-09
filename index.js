const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });

const SYSTEM_PROMPT = `Sos el asistente virtual de VAL ARG S.R.L., una empresa argentina de válvulas e instrumentación industrial ubicada en 14 de Julio 175, Paternal, Capital Federal.

INFORMACIÓN DE LA EMPRESA:
- Horario: Lunes a Viernes de 9:00 a 18:00
- Teléfono: +54 11 2592-8529
- Email: ventas@val-ar.com.ar
- Web: www.val-ar.com.ar

MARCAS QUE DISTRIBUIMOS:
- GENEBRE (válvulas de bronce, acero, hierro)
- CEPEX (válvulas y accesorios PVC/PP)
- KITO (válvulas mariposa)
- AERRE (actuadores neumáticos)
- WINTERS (instrumentación: manómetros, termómetros)
- CENI (válvulas esféricas industriales)
- BERMAD (válvulas hidráulicas, control)
- CODITAL (accesorios de latón/bronce)

INSTRUCCIONES:
1. Respondé de forma breve y amigable, como por WhatsApp
2. Si preguntan por disponibilidad o precio, decí que un vendedor les va a responder pronto con esa información
3. Si preguntan algo técnico, respondé si sabés o indicá que un técnico los va a contactar
4. Si quieren hablar con un vendedor, indicá que van a ser contactados a la brevedad
5. Usá español argentino (vos, tenés, etc.)
6. No uses markdown ni formateo especial, solo texto plano
7. Mantené las respuestas cortas (máximo 3-4 oraciones)`;

function normalizeArgentineNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');
    console.log('Número original:', phoneNumber);
    console.log('Número limpio:', cleaned);
    
    // Si viene con 549 (formato WhatsApp), convertir a formato Meta (con 15)
    // 5491169499940 -> 54111569499940
    if (cleaned.startsWith('5491')) {
        // Extraer: 54 + 9 + código área + número
        // Convertir a: 54 + código área + 15 + número
        const codigoArea = cleaned.substring(4, 6); // ej: "11"
        const numeroLocal = cleaned.substring(6);    // ej: "69499940"
        cleaned = '54' + codigoArea + '15' + numeroLocal;
        console.log('Número convertido a formato Meta:', cleaned);
    }
    
    return cleaned;
}

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
                    console.log(`Mensaje de ${from}: ${msgBody}`);
                    const respuesta = await obtenerRespuestaClaude(msgBody);
                    console.log('Respuesta de Claude:', respuesta);
                    await enviarMensajeWhatsApp(from, respuesta);
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        res.sendStatus(500);
    }
});

async function obtenerRespuestaClaude(mensajeUsuario) {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: mensajeUsuario }]
        });
        return response.content[0].text;
    } catch (error) {
        console.error('Error con Claude:', error);
        return 'Disculpá, en este momento no puedo procesar tu consulta. Por favor contactanos al +54 11 2592-8529 o a ventas@val-ar.com.ar';
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
        
        if (data.error && numeroNormalizado.startsWith('549')) {
            console.log('Intentando sin el 9...');
            const sinNueve = '54' + numeroNormalizado.substring(3);
            
            const response2 = await fetch(
                `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: sinNueve,
                        type: 'text',
                        text: { body: mensaje }
                    })
                }
            );
            
            const data2 = await response2.json();
            console.log('Segundo intento:', JSON.stringify(data2, null, 2));
            return data2;
        }
        
        return data;
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        throw error;
    }
}

app.get('/', (req, res) => {
    res.send('Bot de VAL-AR funcionando correctamente');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
