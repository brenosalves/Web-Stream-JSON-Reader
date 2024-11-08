const API_URL = 'http://localhost:3000'
let counter = 0

async function consumeAPI(signal) {
  const response = await fetch(API_URL, {
    signal
  })
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
  return reader
}

function renderStars(rate_start) {
  const fullStars = Math.floor(rate_start); // Número inteiro de estrelas
  const stars = '★'.repeat(fullStars);
  return stars;
}

function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, url_anime, rate_start, image }) {
      const card = `
      <article>
        <div class="text">
          <img src="${image}" alt="${title}" style="width:100%; height:auto; border-radius:8px;">
          <h3>[${++counter}] ${title}</h3>
          <p>${description.slice(0, 100)}</p>
          <a href="${url_anime}">Here's why</a>
          <div class="stars">${renderStars(rate_start)}</div>
        </div>
      </article>
      `;
      element.innerHTML += card;
    },
    abort(reason) {
      console.log('aborted**', reason);
    }
  });
}

// Função para converter e processar NDJSON em JSON
function parseNDJSON() {
  let ndjsonBuffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      ndjsonBuffer += chunk;
      const items = ndjsonBuffer.split('\n');
      items.slice(0, -1).forEach(item => controller.enqueue(JSON.parse(item)));
      ndjsonBuffer = items[items.length - 1];
    },
    flush(controller) {
      if (!ndjsonBuffer) return;
      controller.enqueue(JSON.parse(ndjsonBuffer));
    }
  });
}

const [start, stop, cards] = ['start', 'stop', 'cards'].map(item => document.getElementById(item));

let abortController = new AbortController();
start.addEventListener('click', async () => {
  try {
    const readable = await consumeAPI(abortController.signal);
    await readable.pipeTo(appendToHTML(cards), { signal: abortController.signal });
  } catch (error) {
    if (!error.message.includes('abort')) throw error;
  }
});

stop.addEventListener('click', () => {
  abortController.abort();
  console.log('aborting...');
  abortController = new AbortController();
});
