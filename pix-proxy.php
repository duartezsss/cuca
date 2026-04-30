<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$API_TOKEN = 'sk_b504cdd4f59f4e89860d2d2a40ed1375b1ebb3ae6beca4de8833cb3bf441301c';
$OFFER_HASH = '';
$PRODUCT_HASH = 'prod_ece06217c0fe2430';
$PRODUCT_TITLE = 'Sapatilha Ortopédica';
$IS_DROPSHIPPING = false;
$PIX_EXPIRATION_MINUTES = 5;
$AMOUNTS_BY_QUANTITY = [
    1 => 3478,
    2 => 6288,
    3 => 8963,
    4 => 12431
];

function json_response($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'check_status') {
    $hash = $_GET['hash'] ?? '';
    if (!$hash) { json_response(['error' => 'No hash provided'], 400); }

    $ch = curl_init('https://multi.paradisepags.com/api/v1/check_status.php?hash=' . urlencode($hash));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $API_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) { json_response(['error' => 'cURL Error: ' . $curlError], 500); }

    $data = json_decode($response, true);
    if (!is_array($data)) { json_response(['error' => 'Invalid API response'], 502); }

    if ($httpCode === 200 && (($data['payment_status'] ?? '') === 'paid' || ($data['status'] ?? '') === 'approved')) {
        $upsellUrl = '';
        if (!empty($upsellUrl)) {
            $data['upsell_url'] = $upsellUrl;
        }
    }

    json_response($data, $httpCode ?: 200);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $api_url = 'https://multi.paradisepags.com/api/v1/transaction.php';
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) { json_response(['error' => 'Invalid JSON'], 400); }

    $quantity = (int)($data['quantity'] ?? 1);
    if (!isset($AMOUNTS_BY_QUANTITY[$quantity])) {
        json_response(['error' => 'Invalid quantity'], 400);
    }

    $BASE_AMOUNT = $AMOUNTS_BY_QUANTITY[$quantity];
    $customer_data = $data['customer'] ?? [];
    $address = $data['address'] ?? [];
    $items = $data['items'] ?? [];
    $utms = $data['utms'] ?? [];
    $checkout_url = $data['checkoutUrl'] ?? '';

    $cpfs = ['42879052882', '07435993492', '93509642791', '73269352468', '35583648805', '59535423720', '77949412453', '13478710634', '09669560950', '03270618638'];
    $firstNames = ['Joao', 'Marcos', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Daniel', 'Bruno', 'Maria', 'Ana', 'Juliana', 'Camila', 'Beatriz', 'Larissa', 'Sofia', 'Laura'];
    $lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho'];
    $ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '92', '27', '48'];
    $emailProviders = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'uol.com.br', 'terra.com.br'];

    if (empty($customer_data['name'])) {
        $customer_data['name'] = $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)];
    }
    if (empty($customer_data['email'])) {
        $emailUser = preg_replace('/[^a-z0-9]/', '', strtolower($customer_data['name'])) . mt_rand(100, 999);
        $customer_data['email'] = $emailUser . '@' . $emailProviders[array_rand($emailProviders)];
    }
    if (empty($customer_data['phone_number'])) {
        $customer_data['phone_number'] = $ddds[array_rand($ddds)] . '9' . mt_rand(10000000, 99999999);
    }
    if (empty($customer_data['document'])) {
        $customer_data['document'] = $cpfs[array_rand($cpfs)];
    }

    $reference = 'SAP-' . uniqid();
    $clean_document = preg_replace('/\D/', '', $customer_data['document'] ?? '');
    $clean_phone = preg_replace('/\D/', '', $customer_data['phone_number'] ?? '');

    $payload = [
        'amount' => round($BASE_AMOUNT),
        'description' => $PRODUCT_TITLE,
        'reference' => $reference,
        'checkoutUrl' => $checkout_url,
        'productHash' => $PRODUCT_HASH,
        'customer' => [
            'name' => $customer_data['name'] ?? 'N/A',
            'email' => $customer_data['email'] ?? 'na@na.com',
            'document' => $clean_document,
            'phone' => $clean_phone
        ],
        'metadata' => [
            'product' => $PRODUCT_TITLE,
            'quantity' => $quantity,
            'items' => $items,
            'address' => $address,
            'is_dropshipping' => $IS_DROPSHIPPING,
            'pix_expiration_minutes' => $PIX_EXPIRATION_MINUTES
        ]
    ];

    if (!empty($OFFER_HASH)) {
        $payload['offerHash'] = $OFFER_HASH;
    }

    if (!empty($utms) && is_array($utms)) {
        $payload['tracking'] = [];
        foreach ($utms as $key => $value) {
            if (!empty($value)) {
                $payload['tracking'][$key] = $value;
            }
        }

        if (empty($payload['tracking'])) {
            unset($payload['tracking']);
        }
    }

    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-API-Key: ' . $API_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($curl_error) {
        json_response(['error' => 'cURL Error: ' . $curl_error], 500);
    }

    $response_data = json_decode($response, true);
    if ($response_data && $http_code >= 200 && $http_code < 300) {
        $transaction_data = $response_data['transaction'] ?? $response_data;

        $frontend_response = [
            'hash' => $transaction_data['hash'] ?? $transaction_data['id'] ?? $transaction_data['transaction_id'] ?? $reference,
            'pix' => [
                'pix_qr_code' => $transaction_data['pix_qr_code'] ?? $transaction_data['qr_code'] ?? $transaction_data['qrCode'] ?? $transaction_data['copy_paste'] ?? '',
                'expiration_date' => $transaction_data['expiration_date'] ?? $transaction_data['expires_at'] ?? date('c', strtotime('+' . $PIX_EXPIRATION_MINUTES . ' minutes'))
            ]
        ];
        json_response($frontend_response, $http_code);
    }

    json_response($response_data ?: ['error' => 'Payment API error', 'raw' => $response], $http_code ?: 502);
}

json_response(['error' => 'Method not allowed'], 405);
?>
