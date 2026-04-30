export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_TOKEN = 'sk_b504cdd4f59f4e89860d2d2a40ed1375b1ebb3ae6beca4de8833cb3bf441301c';
  const OFFER_HASH = '';
  const PRODUCT_HASH = 'prod_ece06217c0fe2430';
  const PRODUCT_TITLE = 'Sapatilha Ortopédica';
  const IS_DROPSHIPPING = false;
  const PIX_EXPIRATION_MINUTES = 5;
  const AMOUNTS_BY_QUANTITY = {
    1: 3478,
    2: 6288,
    3: 8963,
    4: 12431
  };

  if (req.method === 'GET' && req.query.action === 'check_status') {
    const hash = req.query.hash;
    if (!hash) {
      return res.status(400).json({ error: 'No hash provided' });
    }

    try {
      const response = await fetch(`https://multi.paradisepags.com/api/v1/check_status.php?hash=${encodeURIComponent(hash)}`, {
        headers: { 'X-API-Key': API_TOKEN },
      });
      const data = await response.json();
      
      if (response.ok && (data.payment_status === 'paid' || data.status === 'approved')) {
        const upsellUrl = '';
        if (upsellUrl) data.upsell_url = upsellUrl;
      }
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: 'Fetch Error: ' + err.message });
    }
  }

  if (req.method === 'POST') {
    const data = req.body || {};
    const quantity = parseInt(data.quantity || 1, 10);
    if (!AMOUNTS_BY_QUANTITY[quantity]) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const BASE_AMOUNT = AMOUNTS_BY_QUANTITY[quantity];
    const customer_data = data.customer || {};
    const address = data.address || {};
    const items = data.items || [];
    const utms = data.utms || {};
    const checkout_url = data.checkoutUrl || '';

    const cpfs = ['42879052882', '07435993492', '93509642791', '73269352468', '35583648805', '59535423720', '77949412453', '13478710634', '09669560950', '03270618638'];
    const firstNames = ['Joao', 'Marcos', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Daniel', 'Bruno', 'Maria', 'Ana', 'Juliana', 'Camila', 'Beatriz', 'Larissa', 'Sofia', 'Laura'];
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho'];
    const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '92', '27', '48'];
    const emailProviders = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br', 'terra.com.br'];

    const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

    if (!customer_data.name) customer_data.name = randomChoice(firstNames) + ' ' + randomChoice(lastNames);
    if (!customer_data.email) {
      const emailUser = customer_data.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 900 + 100);
      customer_data.email = emailUser + '@' + randomChoice(emailProviders);
    }
    if (!customer_data.phone_number) customer_data.phone_number = randomChoice(ddds) + '9' + Math.floor(Math.random() * 90000000 + 10000000);
    if (!customer_data.document) customer_data.document = randomChoice(cpfs);

    const reference = 'SAP-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const clean_document = (customer_data.document || '').replace(/\D/g, '');
    const clean_phone = (customer_data.phone_number || '').replace(/\D/g, '');

    const payload = {
      amount: BASE_AMOUNT,
      description: PRODUCT_TITLE,
      reference: reference,
      checkoutUrl: checkout_url,
      productHash: PRODUCT_HASH,
      customer: {
        name: customer_data.name || 'N/A',
        email: customer_data.email || 'na@na.com',
        document: clean_document,
        phone: clean_phone
      },
      metadata: {
        product: PRODUCT_TITLE,
        quantity: quantity,
        items: items,
        address: address,
        is_dropshipping: IS_DROPSHIPPING,
        pix_expiration_minutes: PIX_EXPIRATION_MINUTES
      }
    };

    if (OFFER_HASH) payload.offerHash = OFFER_HASH;

    if (utms && typeof utms === 'object' && Object.keys(utms).length > 0) {
      payload.tracking = {};
      for (const [key, value] of Object.entries(utms)) {
        if (value) payload.tracking[key] = value;
      }
      if (Object.keys(payload.tracking).length === 0) delete payload.tracking;
    }

    try {
      const response = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': API_TOKEN
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      let responseData;
      try { responseData = JSON.parse(responseText); } catch(e) {}
      
      if (responseData && response.ok) {
        const transaction_data = responseData.transaction || responseData;
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + PIX_EXPIRATION_MINUTES);

        const frontend_response = {
          hash: transaction_data.hash || transaction_data.id || transaction_data.transaction_id || reference,
          pix: {
            pix_qr_code: transaction_data.pix_qr_code || transaction_data.qr_code || transaction_data.qrCode || transaction_data.copy_paste || '',
            expiration_date: transaction_data.expiration_date || transaction_data.expires_at || expirationDate.toISOString()
          }
        };
        return res.status(response.status).json(frontend_response);
      }
      return res.status(response.status || 502).json(responseData || { error: 'Payment API error', raw: responseText });
    } catch (err) {
      return res.status(500).json({ error: 'Fetch Error: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
