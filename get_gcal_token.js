import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});
console.log('Authorize this app by visiting this url:', authUrl);

// Prompt for code
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question('Enter the code from that page here: ', async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('token.json', JSON.stringify(tokens));
    console.log('Token stored to token.json');
  } catch (err) {
    console.error('Error retrieving access token', err);
  }
  rl.close();
});
