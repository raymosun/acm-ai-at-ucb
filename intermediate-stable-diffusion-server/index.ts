import express, { Response } from 'express'
const app = express()
const port = 3000

let nextId = 0

type Unemployed = {
  response: Response
  aborted: boolean
}
type Job = {
  prompt: string
  clientResponses: Response[]
}

const cache: Record<string, Buffer | Job> = {}
const unemployed: Unemployed[] = []
const understaffed: Job[] = []
const jobs: Record<number, Job> = []

// Jupyter notebook indicates that it is unemployed and needs a job
app.post('/next-image-to-generate', (req, response) => {
  const next = understaffed.shift()
  if (next) {
    const id = nextId++
    console.log(`[intel] ready, prompt available. get working! (${id})`)
    response.send(`${id}\n${next.prompt}`)
    jobs[id] = next
  } else {
    console.log('[intel] ready, idle')
    const worker: Unemployed = { response, aborted: false }
    unemployed.push(worker)
    req.on('close', () => {
      worker.aborted = true
    })
  }
})

app.get('/gen-image', (req, res) => {
  const prompt = req.query.prompt
  if (typeof prompt !== 'string') {
    return res.status(400).send('?prompt= is required')
  }
  const cached = cache[prompt]
  if (cached) {
    if (cached instanceof Buffer) {
      console.log(`[client] want "${prompt}", serving from cache`)
      return res.contentType('image/png').send(cached)
    } else {
      console.log(`[client] want "${prompt}", already being worked on`)
      cached.clientResponses.push(res)
      return
    }
  }
  let next: Unemployed | undefined
  do {
    next = unemployed.shift()
  } while (next && !next.aborted)
  const job = { prompt, clientResponses: [res] }
  cache[prompt] = job
  if (next) {
    const id = nextId++
    console.log(`[client] want "${prompt}", intel ready (${id})`)
    next.response.send(`${id}\n${prompt}`)
    jobs[id] = job
  } else {
    console.log(`[client] want "${prompt}", intel busy`)
    understaffed.push(job)
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
    console.log(`[intel] done (${req.query.id})`)
    const buffer = Buffer.concat(chunks)
    cache[job.prompt] = buffer
    for (const res of job.clientResponses) {
      res.contentType('image/png').send(buffer)
    }
    res.send('good job')
  })
})

app.post('/release-job', (req, res) => {
  const job = jobs[+(req.query.id ?? 0)]
  if (!job) {
    return res.status(404).send(`job ${job} doesnt exist`)
  }
  understaffed.push(job)
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
        'POST /next-image-to-generate',
        'POST /submit-image?id=<job-id>',
        'POST /release-job?id=<job-id>'
      ].join('\n')
    )
})

app.listen(port, () => {
  console.log(`Example app listening http://localhost:${port}`)
})
