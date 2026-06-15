<?php
// error_reporting(0);
// $time_start = microtime(true);
// session_start();
// include("includes/functions.php");


//REF CURL
// $curl = curl_init();
// curl_setopt_array($curl, [
//     CURLOPT_URL => "",
//     CURLOPT_HTTPHEADER => [],
// ]);
// $test = curl_exec($curl);
//curl_close($curl);

include("includes/functions.php");

//PROXY VARIABLE DECLARATION
$prxy_username = EnvValue("PROXY_USERNAME");
$prxy_password = EnvValue("PROXY_PASSWORD");

if ($prxy_username === "" || $prxy_password === "") {
    die("Missing proxy credentials");
}

$prxy_USERPWD = $prxy_username .":". $prxy_password;
$prxy_file = file('proxy.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$proxy = $prxy_file[array_rand($prxy_file)];

// //API CHECK
// $curl = curl_init();
// curl_setopt_array($curl, [
//     CURLOPT_URL => "https://api.proxyscrape.com/v4/account/api-keys",
//     CURLOPT_HTTPHEADER => [
//         "api-token: ".EnvValue("PROXYSCRAPE_API_TOKEN")
//     ],
// ]);
// curl_exec($curl);
// $apiproxy = curl_close($curl);

//PROXY RANDOMIZER
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => "https://api.ipify.org/",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_PROXY => $proxy,
    CURLOPT_PROXYUSERPWD => $prxy_USERPWD,
    CURLOPT_HTTPGET => true
]);
$ip_res = curl_exec($curl);
curl_close($curl);
ob_flush();

if (isset($ip_res)) {
    echo "Live!  : ".$ip_res;
} else 

if (empty($ip_res)) {
    echo "DEAD IP: ".$ip_res;
}

// //SPOTIFY REDEEM WEBSITE
// $curl = curl_init();
// curl_setopt_array($curl, [
//     CURLOPT_URL => "https://www.mi.com/ph/imei-redemption/",
//     CURLOPT_HTTPGET => true,
//     CURLOPT_FOLLOWLOCATION => 1,
//     CURLOPT_RETURNTRANSFER => 1,
//     CURLOPT_COOKIEJAR => $cookie_directory,
//     CURLOPT_COOKIEFILE => $cookie_directory,
//     CURLOPT_HTTPHEADER => [
//         "accep: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
//         "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"
//     ],
// ]);
// $miRedemptionLink = curl_exec($curl);
// curl_close($curl);

// // SPOTIFY SEND CODE
// $email = "anonymouscc404@gmail.com";

// $curl = curl_init();
// curl_setopt_array($curl, [
//     CURLOPT_URL => "https://hd.c.mi.com/ph/eventapi/api/imeiexchange/sendcode?from=pc&email=lizegraugossu-3665@yopmail.com&tel=",
//     CURLOPT_HTTPGET => true,
//     CURLOPT_COOKIEJAR => $cookie_directory,
//     CURLOPT_COOKIEFILE => $cookie_directory,
//     CURLOPT_HTTPHEADER => [
//         "accept: */*",
//         "cookie: serviceToken=".EnvValue("SERVICE_TOKEN"),
//         "content-type: application/x-www-form-urlencoded; charset=UTF-8",
//         "origin: https://www.mi.com",
//         "referer: https://www.mi.com/ph/imei-redemption/",
//         "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"
//     ],
// ]);
// $sendCode = curl_exec($curl);
// curl_close($curl);

// // ENTER CODE SENT TO EMAIL
// $curl = curl_init();
// curl_setopt_array($curl, [
//     CURLOPT_URL => "https://hd.c.mi.com/ph/eventapi/api/imeiexchange/getactinfo?from=pc&imei=860414067925265&email=lizegraugossu-3665@yopmail.com&tel=&captchaCode=useo",
//     CURLOPT_HTTPGET => true,
//     CURLOPT_COOKIEJAR => $cookie_directory,
//     CURLOPT_COOKIEFILE => $cookie_directory,
//     CURLOPT_HTTPHEADER => [
//         "accept: */*",
//         "content-type: application/x-www-form-urlencoded; charset=UTF-8",
//         "cookie: serviceToken=".EnvValue("SERVICE_TOKEN"),
//         "origin: https://www.mi.com",
//         "referer: https://www.mi.com/ph/imei-redemption/",
//         "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0"
//     ],
// ]);
// $EnterCode = curl_exec($curl);
// curl_close($curl);

// //UNLINK SAVED COOKIES
// if (file_exists($file)) {
//     unlink($file);
// }
?>
