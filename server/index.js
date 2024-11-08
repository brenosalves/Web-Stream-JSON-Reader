import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

  //curl -N localhost:3000 
//curl -i X OPTIONS -N localhost:3000
// Criando servidor http

const PORT = 3000
createServer(async (request, response) => {
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': '*',
}
if(request.method === 'OPTIONS'){
    response.writeHead(204, headers)
    response.end()
    return;
}


let items = 0
request.once('close', _ => console.log('connection was closed!', items))

// Lendo o arquivo .csv
Readable.toWeb(createReadStream('./animeflv.csv'))

// o passo a passo que cada item individual vai trafegar
.pipeThrough(Transform.toWeb(csvtojson()))
.pipeThrough(new TransformStream({
    transform(chunk, controller) {
        const data = JSON.parse(Buffer.from(chunk))
        const mappedData = {
            title: data.title,
            description: data.description,
            url_anime: data.url_anime,
            rate_start: data.rate_start,
            image: data.image
        }
        // Quebra de linha pois é um NDJSON
        controller.enqueue(JSON.stringify(mappedData).concat('\n'))
    }
}))
// pipeTo() é a última etapa
.pipeTo(new WritableStream({
    async write(chunk) {
        await setTimeout(500)
        items ++
        response.write(chunk)
    },
    close() {
        response.end()
    }
}))

response.writeHead(200, headers);
})
.listen(PORT)
.on('listening', _ => console.log(`server is running at ${PORT}`))