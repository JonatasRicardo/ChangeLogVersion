const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const db = require('./queries')
const port = 3000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})


app.get('/users', db.getUsers)
app.get('/patches', db.getPatches)
app.get('/users/:id', db.getUserById)
app.get('/users/:id/patches', db.getUserPatchesById)
app.post('/users', db.createUser)
app.put('/users/:id', db.updateUser)
app.put('/users/:id/restore/:patchId', db.restoreUser)
app.delete('/users/:id', db.deleteUser)

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
})
