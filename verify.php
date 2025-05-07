<?php
header('Content-Type: application/json');

$recaptcha_secret = "6Lcs7zErAAAAADik9xSkD6JaNGrPfOI5SbPD_GQl";
$token = $_POST['token'];

$url = 'https://www.google.com/recaptcha/api/siteverify';
$data = ['secret' => $recaptcha_secret, 'response' => $token];

$options = [
    'http' => [
        'header' => "Content-type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    ]
];

$context = stream_context_create($options);
$response = json_decode(file_get_contents($url, false, $context));

if ($response->success && $response->score >= 0.5) {
    echo json_encode(['success' => true]);
} else {
    error_log("reCAPTCHA failed: " . print_r($response, true));
    echo json_encode(['success' => false, 'error' => 'Verification failed']);
}
?>