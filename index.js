require('dotenv').config();
const express = require('express');
const docusign = require('docusign-esign');
const open = require('open');

const app = express();
const port = process.env.PORT || 3000;

const DS_AUTH_SERVER = 'account-d.docusign.com';
const basePath = 'https://demo.docusign.net/restapi';

const oauthBasePath = 'account-d.docusign.com';

const scopes = ["signature", "impersonation"];

app.get('/', (req, res) => {
  const authURL = `https://${DS_AUTH_SERVER}/oauth/auth?response_type=code&scope=${scopes.join('+')}&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}`;
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Clinical Skills Assessment</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f0f4f8;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .container {
        background: white;
        padding: 3rem 4rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        border-radius: 12px;
        text-align: center;
        max-width: 500px;
      }
      h1 {
        color: #2a4365;
        margin-bottom: 1rem;
      }
      p {
        color: #4a5568;
        font-size: 1rem;
        margin-bottom: 2rem;
      }
      a.button {
        display: inline-block;
        background-color: #2b6cb0;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        transition: background-color 0.3s ease;
      }
      a.button:hover {
        background-color: #2c5282;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Clinical Skills Assessment</h1>
      <p>This secure session will guide a supervisor and nurse through a multi-step evaluation.</p>
      <a href="${authURL}" class="button">Prepare Assessment</a>
    </div>
  </body>
  </html>
`);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send("No code in query string");

  const apiClient = new docusign.ApiClient();
  apiClient.setOAuthBasePath(oauthBasePath);

  const results = await apiClient.generateAccessToken(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    code
  );

  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.accessToken);

  // Launch envelope
  const envelopeApi = new docusign.EnvelopesApi(apiClient);
  const envelopeId = await launchEnvelope(envelopeApi);

  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Assessment Prepared</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f0f4f8;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .card {
        background: white;
        padding: 3rem 4rem;
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        border-radius: 12px;
        text-align: center;
        max-width: 500px;
      }
      h1 {
        color: #2f855a;
        font-size: 1.75rem;
        margin-bottom: 1rem;
      }
      p {
        color: #4a5568;
        font-size: 1rem;
        margin-bottom: 2rem;
      }
      .id-box {
        background: #edf2f7;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-family: monospace;
        color: #2d3748;
        font-size: 0.9rem;
        display: inline-block;
      }
      a.button {
        display: inline-block;
        background-color: #2b6cb0;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        transition: background-color 0.3s ease;
      }
      a.button:hover {
        background-color: #2c5282;
      }
    </style>
  </head>
  <body>
    
   <div class="card">
      <h1>Assessment Started Successfully</h1>
      <p>The assessment has been created and is now ready.</p>
      <div class="id-box">Envelope ID: ${envelopeId}</div>
      <div class="id-box"><p id="datetime"></p>
  <script>
    // Get the current date and time
    var now = new Date();

    // Format the date and time
    var datetime = now.toLocaleString();

    // Update the HTML content
  <p This assessment was created:  document.getElementById("datetime").innerHTML = datetime;
  </script></div>
         <div class="id-box">This assessment is for: Scott Trumpower</div>

      <p style="margin-top: 2rem;"><a href="https://apps-d.docusign.com/send/documents?label=action-required" class="button">Begin Assessment</a></p>
    </div>
  </body>
  </html>
`);

});

async function launchEnvelope(envelopeApi) {
  const envDef = {
    templateId: process.env.TEMPLATE_ID,
    templateRoles: [
{
      roleName: "Supervisor", // Must match template role
      name: "Scott Docusign",
      email: "sdtdsign+iam@gmail.com",
      recipientId: "1",           
      routingOrder: "1"
    },
               {
      roleName: "Nurse", // Must match template role
      inPersonSignerName: "Scott Trumpower",
      signerEmail: "placeholder@example.com", // Required field even if not real
      hostName: "Scott Docusign",
      hostEmail: "sdtdsign+iam@gmail.com",
      recipientId: "2",           
      routingOrder: "2"
    },
        ],
        status: "sent"
      };

  const results = await envelopeApi.createEnvelope(process.env.ACCOUNT_ID, {
    envelopeDefinition: envDef
  });

  return results.envelopeId;
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
