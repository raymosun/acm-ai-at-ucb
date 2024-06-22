import express, { Response } from 'express'
const app = express()
const port = 3000

let nextId = 0

type Unemployed = {
  response: Response
}
type Job = {
  prompt: string
  clientResponse: Response
}

const unemployed: Unemployed[] = []
const understaffed: Job[] = []
const jobs: Record<number, Job> = []

// Jupyter notebook indicates that it is unemployed and needs a job
app.get('/next-image-to-generate', (_req, response) => {
  const next = understaffed.shift()
  if (next) {
    const id = nextId++
    response.send(`${id}\n${next.prompt}`)
    jobs[id] = next
  } else {
    unemployed.push({ response })
  }
})

app.get('/gen-image', (req, res) => {
  const prompt = req.query.prompt
  if (typeof prompt !== 'string') {
    return res.status(400).send('?prompt= is required')
  }
  const next = unemployed.shift()
  if (next) {
    const id = nextId++
    next.response.send(`${id}\n${prompt}`)
    jobs[id] = { prompt, clientResponse: res }
  } else {
    understaffed.push({ prompt, clientResponse: res })
  }
})

app.post('/submit-image', (req, res) => {
  const job = jobs[+(req.query.id ?? 0)]
  if (!job) {
    return res.status(404).send(`job ${job} doesnt exist`)
  }

  // Thanks ChatGPT
  const chunks: Buffer[] = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    job.clientResponse.contentType('image/png').send(Buffer.concat(chunks))
    res.send('good job')
  })
})

app.get('/', (_req, res) => {
  res
    .contentType('text/plain')
    .send(
      [
        'For client:',
        'GET /gen-image?prompt=<prompt>',
        '',
        'For Intel:',
        'GET /next-image-to-generate',
        'POST /submit-image?id=<job-id>'
      ].join('\n')
    )
})

app.listen(port, () => {
  console.log(`Example app listening http://localhost:${port}`)
})
