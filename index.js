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
      <h1>Launch Clinical Skills Assessment</h1>
      <p>This secure session will guide a supervisor and nurse through a multi-step evaluation.</p>
      <a href="${authURL}" class="button">Start Assessment</a>
    </div>
  </body>
  </html>
`);


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

  res.send(`Envelope sent! ID: ${envelopeId}`);
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
