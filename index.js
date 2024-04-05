const express = require('express');
const request = require('request');

const app = express();

const fs = require('fs');

const NODE_ENV = (process.env.NODE_ENV || '').trim()
console.log(9, NODE_ENV)

/*
const dotEnvFile = NODE_ENV === 'dev' ? './.env.dev' : (!fs.existsSync('./.env') ? './.env.cyclic' : './.env');
console.log('USE ', dotEnvFile);
require('dotenv').config({ path: dotEnvFile });
*/

const nodemailer = require('nodemailer');
const smtp = require('nodemailer-smtp-transport');

let db;
if(NODE_ENV !== 'dev') {
	db = require('@cyclic.sh/dynamodb')
} else {
	const CyclicDb = require('@cyclic.sh/dynamodb');
	db = CyclicDb('concerned-pear-elkCyclicDB');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const collection = 'sites';

  const username = process.env.SMTP_USERNAME || null
  const password = process.env.SMTP_PASSWORD || null
  if (!username || !password) {
    throw new Error('SMTP_USERNAME and SMTP_PASSWORD must be set')
  }

  const transporter = nodemailer.createTransport(smtp({
    service: 'gmail',
    auth: {
        user: username,
        pass: password
    }
  }));
  
async function sendMail(text) {
  var mailOptions = {
    from: username,
    to: 'tigrazone@ukr.net',
    // bcc: '<bcc email addres>',
    subject : text,
    text
  };

  const sendRes = await transporter.sendMail(mailOptions);
  console.log(55, 'sendRes', sendRes)
}

async function getAllKV() {
  const result = {};
  const keys = await db.collection(collection).list();
  for (const k in keys) {
    for (const kk in keys[k]) {
      const { key } = keys[k][kk];
      const item = await db.collection(collection).get(key);
      result[key] = item.props;
    }
  }

  return result;
}

function doRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, res, body) => {
      if (!error && res.statusCode === 200) {
        resolve(res.statusCode);
      } else {
        reject(error);
      }
    });
  });
}

// Create or Update an item
app.post('/:key', async (req, res) => {
  console.log(req.body);

  const { key } = req.params;
  const item = await db.collection(collection).set(key, req.body);
  console.log(JSON.stringify(item, null, 2));
  res.json(item).end();
});

// Delete an item
app.delete('/:col/:key', async (req, res) => {
  const { key } = req.params;
  const item = await db.collection(collection).delete(key);
  console.log(JSON.stringify(item, null, 2));
  res.json(item).end();
});

// Get a single item
app.get('/info/:key', async (req, res) => {
  const { key } = req.params;
  const item = await db.collection(collection).get(key);
  console.log(JSON.stringify(item, null, 2));
  res.json(item).end();
});

// Get a full listing
app.get('/sites', async (req, res) => {
  const result = await getAllKV();
  res.json(result).end();
});

// do check sites
app.get('/do_check', async (req, res) => {
  const result = await getAllKV();
  console.log(78, result);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  let html = '';
  for (const key in result) {
    console.log(93, key);
    const item = result[key];
    console.log(95, item);
    const last_status = +item.last_status;
    let statusCode = 500;
	  try {
      statusCode = +await doRequest(item.url);
      console.log(statusCode);
      html += `<h3>${item.url}</h3>${statusCode}<hr>`;
	  } catch (error) {
      console.error(error); // `error` will be whatever you passed to `reject()` at the top
	  }

    if (statusCode != last_status) {
      console.log('status is chenged. store it');
      const updated = await db.collection(collection).set(key, {
        url: item.url,
        last_status: statusCode,
      });
      console.log(JSON.stringify(updated, null, 2));
    }
    if (statusCode != 200) {
      if (last_status == 200) {
        console.log('send letter about site not working');
        sendMail(item.url + ' not working')
      }
    } else if (last_status != 200) {
      console.log('send letter about site START working');
        sendMail(item.url + ' START working')
    }
  }
  res.end(html);
});

// ping sites
app.get('/check_url', async (req, res) => {
  request('http://www.google.com', (error, response, body) => {
    if (!error && response.statusCode == 200) {
      console.log('URL is OK'); // Print the google web page.
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('URL is OK');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`URL broke:${JSON.stringify(response, null, 2)}`);
    }
  });
});

// Catch all handler for all other request.
app.use('*', (req, res) => {
  res.json({ msg: 'no route handler found' }).end();
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`index.js listening on ${port}`);
});
