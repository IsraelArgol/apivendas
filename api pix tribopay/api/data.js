// Importa os módulos necessários do Firebase Admin SDK
const admin = require('firebase-admin');

// --- CONFIGURAÇÃO IMPORTANTE ---
// ⚠️ Em produção, NUNCA coloque a chave direto no código!
// Use variáveis de ambiente no Netlify (Settings > Environment Variables)
// e monte o objeto `serviceAccount` a partir delas.

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Corrige quebras de linha
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

// Inicializa o app do Firebase (evita reinicializar se já estiver iniciado)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Pega a referência do banco de dados Firestore
const db = admin.firestore();

// A função principal que o Netlify vai executar
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Em produção, troque '*' pelo seu domínio
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // GET → Buscar dados
  if (event.httpMethod === 'GET') {
    const date = event.queryStringParameters.date;

    if (!date) {
      return { statusCode: 400, headers, body: 'Parâmetro "date" é obrigatório.' };
    }

    try {
      const docRef = db.collection('salesData').doc(date);
      const doc = await docRef.get();

      if (!doc.exists) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            thauan: { totalGerado: 0, totalPago: 0 },
            franco: { totalGerado: 0, totalPago: 0 }
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(doc.data())
      };
    } catch (error) {
      console.error("Erro no GET:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao buscar dados.' }) };
    }
  }

  // POST → Salvar dados
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { date, thauanData, francoData } = body;

      if (!date || !thauanData || !francoData) {
        return { statusCode: 400, headers, body: 'Dados incompletos.' };
      }

      const docRef = db.collection('salesData').doc(date);
      await docRef.set({
        thauan: thauanData,
        franco: francoData
      }, { merge: true });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Dados salvos com sucesso!' })
      };
    } catch (error) {
      console.error("Erro no POST:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao salvar dados.' }) };
    }
  }

  // Método não permitido
  return {
    statusCode: 405,
    headers,
    body: 'Método não permitido.'
  };
};
