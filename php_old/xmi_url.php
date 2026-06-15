<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

include("includes/functions.php");

//UPSTREAM URL REDIRECTION
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPGET => true,
    CURLOPT_COOKIEJAR => $cookie_directory,
    CURLOPT_COOKIEFILE => $cookie_directory,
    CURLOPT_HTTPHEADER => [
        "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    ],
]);
$redirect_url = curl_exec($curl);
curl_close($curl);
?>