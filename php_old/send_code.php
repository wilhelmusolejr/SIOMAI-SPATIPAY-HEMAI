<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

include("includes/functions.php");

$email = trim($_POST['email']);
$imei = trim($_POST['imei']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL))
{
    die("Invalid Email");
}

$serviceToken = EnvValue("SERVICE_TOKEN");
$headers = [
    "accept: */*",
    "content-type: application/x-www-form-urlencoded; charset=UTF-8",
    "origin: https://www.mi.com",
    "referer: https://www.mi.com/ph/imei-redemption/",
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"
];

if ($serviceToken !== "") {
    $headers[] = "cookie: serviceToken=".$serviceToken;
}

// SPOTIFY SEND CODE
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => "https://hd.c.mi.com/ph/eventapi/api/imeiexchange/sendcode?from=pc&email=".$email."&tel=",
    CURLOPT_HTTPGET => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_COOKIEJAR => $cookie_directory,
    CURLOPT_COOKIEFILE => $cookie_directory,
    CURLOPT_HTTPHEADER => $headers,
]);
$sendCode = curl_exec($curl);
curl_close($curl);

echo $sendCode;
?>
