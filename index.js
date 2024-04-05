const express = require('express')
const app = express()
const db = require('@cyclic.sh/dynamodb')
const request = require('request');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const collection = 'sites'

// #############################################################################
// This configures static hosting for files in /public that have the extensions
// listed in the array.
// var options = {
//   dotfiles: 'ignore',
//   etag: false,
//   extensions: ['htm', 'html','css','js','ico','jpg','jpeg','png','svg'],
//   index: ['index.html'],
//   maxAge: '1m',
//   redirect: false
// }
// app.use(express.static('public', options))
// #############################################################################

// Create or Update an item
app.post('/:key', async (req, res) => {
  console.log(req.body)

  const key = req.params.key
  const item = await db.collection(collection).set(key, req.body)
  console.log(JSON.stringify(item, null, 2))
  res.json(item).end()
})

// Delete an item
app.delete('/:col/:key', async (req, res) => {
  const key = req.params.key
  const item = await db.collection(collection).delete(key)
  console.log(JSON.stringify(item, null, 2))
  res.json(item).end()
})

// Get a single item
app.get('/info/:key', async (req, res) => {
  const key = req.params.key
  const item = await db.collection(collection).get(key)
  console.log(JSON.stringify(item, null, 2))
  res.json(item).end()
})

// Get a full listing
app.get('/sites', async (req, res) => {
  const result = {}
  const keys = await db.collection(collection).list()
  for(const k in keys) {
	const key = keys[k].key
	const item = await db.collection(collection).get(key)
	result[key] = item;
  }
  res.json(result).end()
})

// do check sites
app.get('/do_check', async (req, res) => {	
  const result = {}
  const keys = await db.collection(collection).list()
  res.writeHead(200, {'Content-Type': 'text/html'});
  for(const k in keys) {
	const key = keys[k].key
	const item = await db.collection(collection).get(key)
	request(item.url, function (error, response, body) {
	res.write('<h3>'+item.url+'</h3>'+response.statusCode+'<hr>');
	if (!error && response.statusCode == 200) {
	} else {
	}
	})
  }
  res.end(' ');
})

// ping sites
app.get('/check_url', async (req, res) => {  
  request('http://www.google.com', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("URL is OK") // Print the google web page.
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end('URL is OK');
    } else {
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.end('URL broke:'+JSON.stringify(response, null, 2));
    }
  })
})

// Catch all handler for all other request.
app.use('*', (req, res) => {
  res.json({ msg: 'no route handler found' }).end()
})

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`index.js listening on ${port}`)
})
