const http = require('http')
const fs = require('fs')
const jsonServer = require('json-server')

jest.mock('../config/database', () => ({ userDB: { usuarios: [{ id: 1, email: 'existe@example.com', senha: '123' }] } }))

const publicRoutes = require('../routes/publicRoutes')
const app = jsonServer.create()
app.use(jsonServer.bodyParser)
app.use('/public', publicRoutes)
let server

function post(path, body) {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port: server.address().port, path, method: 'POST', headers: { 'content-type': 'application/json' } }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }))
    })
    request.on('error', reject)
    request.end(JSON.stringify(body))
  })
}

beforeAll(done => { server = app.listen(0, '127.0.0.1', done) })
afterAll(done => { server.close(done) })
afterEach(() => jest.restoreAllMocks())

test.each(['/public/cadastrar', '/public/registrar'])('%s aceita cadastro e mantém o contrato', async path => {
  const database = { usuarios: [{ id: 1, email: 'existe@example.com', senha: '123' }] }
  jest.spyOn(fs, 'readFile').mockImplementation((path, callback) => callback(null, Buffer.from(JSON.stringify(database))))
  const write = jest.spyOn(fs, 'writeFile').mockImplementation((path, contents, callback) => callback(null))
  const user = { nome: 'Teste', email: 'nova@example.com', senha: '456', endereco: 'Rua', complemento: '', cep: '123' }
  const response = await post(path, user)
  expect(response.status).toBe(200)
  expect(typeof response.body.access_token).toBe('string')
  expect(write).toHaveBeenCalledTimes(1)
  expect(JSON.parse(write.mock.calls[0][1]).usuarios[1]).toEqual({ id: 2, ...user })
})

test.each(['/public/cadastrar', '/public/registrar'])('%s rejeita e-mail existente', async path => {
  const read = jest.spyOn(fs, 'readFile')
  const response = await post(path, { email: 'existe@example.com', senha: '123' })
  expect(response).toEqual({ status: 401, body: { status: 401, message: 'E-mail já foi utilizado!' } })
  expect(read).not.toHaveBeenCalled()
})
