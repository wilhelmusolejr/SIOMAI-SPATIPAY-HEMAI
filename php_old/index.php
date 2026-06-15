<!DOCTYPE html>
<html>
<head>
<title>Redemption</title>
</head>
<body>

<h2>Redemption</h2>

<input type="email" id="email" placeholder="Email">

<br><br>

<input type="text" id="imei" placeholder="IMEI (optional)">

<br><br>

<button id="sendBtn" onclick="sendCode()">
Send Code
</button>

<br><br>

<input type="text"
id="code"
placeholder="Verification Code"
disabled>

<br><br>

<button
id="verifyBtn"
onclick="verifyCode()"
disabled>
Verify
</button>

<br><br>

<h3>Status</h3>
<div id="status"></div>

<h3>Send Code Response</h3>
<div id="sitestatus"></div>

<h3>Verify Response</h3>
<div id="verifystatus"></div>

<script>
function sendCode()
{   
    document.getElementById('sendBtn').disabled = true;

    let email = document.getElementById('email').value;
    let imei  = document.getElementById('imei').value;

    fetch('send_code.php',{
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded'
        },
        body:`email=${email}&imei=${imei}`
    })
    .then(r=>r.text())
    .then(data=>{

        console.log(data);

        document.getElementById('status').innerHTML = '✓ Code Sent';
        document.getElementById("sitestatus").innerHTML = data;

        document.getElementById('email').disabled = true;
        document.getElementById('imei').disabled = true;

        document.getElementById('code').disabled = false;
        document.getElementById('verifyBtn').disabled = false;
    });
}

function verifyCode()
{
    let email = document.getElementById('email').value;
    let imei  = document.getElementById('imei').value;
    let code  = document.getElementById('code').value;

    if (code.length < 4)
    {
        alert("Please enter a valid verification code");
    }

    fetch('verify_code.php',{
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded'
        },
        body:`email=${email}&imei=${imei}&code=${code}`
    })
    .then(r=>r.text())
    .then(data=>{
        
        document.getElementById('verifystatus').innerHTML = data;
        
        if(data.length > 0)
        {
            if(data.includes("Please enter the varification code in the correct format"))
            {
                document.getElementById('code').disabled = false;
                document.getElementById('verifyBtn').disabled = false;
            }
            else
            {
                document.getElementById('code').disabled = true;
                document.getElementById('verifyBtn').disabled = true;
            }
        }
    });
}
</script>

</body>
</html>