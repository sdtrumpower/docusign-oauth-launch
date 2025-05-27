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
  res.send(`<a href="${authURL}">Launch Clinical Skills Assessment</a>`);
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
      name: "Scott Trumpower",
      email: "sdtdsign+sdt@gmail.com",
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
