import addListener from '../src/index.js';

for (const container of Array.from(document.getElementsByClassName('container'))) {
  const eventDispatcher = addListener(container);

  const log = (event) => {
    container.innerHTML = `<p>${event.type}</p>`;
    console.log(event, container.id);
  }

  eventDispatcher.addEventListener('tap', log);
  eventDispatcher.addEventListener('wheel', log);
  eventDispatcher.addEventListener('dragstart', log);
  eventDispatcher.addEventListener('drag', log);
  eventDispatcher.addEventListener('dragend', log);
  eventDispatcher.addEventListener('multitouchstart', log);
  eventDispatcher.addEventListener('multitouch', log);
  eventDispatcher.addEventListener('multitouchend', log);
}
