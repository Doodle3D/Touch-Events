import 'pepjs';
import EventDispatcher from 'eventdispatcher.js';

const CONFIG = {
  DRAG_THRESHOLD: 10
};
export function setConfig(config) {
  for (const key of CONFIG) {
    if (config[key] !== undefined) {
      CONFIG[key] = config[key];
    }
  }
}

const listeners = [];
const pointers = {};

export default function createListener(DOMNode) {
  // Check if already listening to DOM Node
  const listener = listeners.find(listener => listener.DOMNode === DOMNode);
  if (listener) return listener.DOMNode;

  // Set touch action to none of DOM element
  // Necessary for Pointer Events Polyfill
  DOMNode.setAttribute('touch-action', 'none');

  const eventDispatcher = new EventDispatcher();
  // Each dom node has it's own state and linked pointers so there can be
  // different gestures to different DOM nodes at the same time
  // Pointers are linked to a DOM node when the pointer down event has a target of the DOM node
  const state = {
    currentEvent: 'idle',
    pointers: []
  };
  listeners.push({ DOMNode, eventDispatcher, state });

  // Wheel event is handled here
  DOMNode.addEventListener('wheel', event => eventDispatcher.dispatchEvent({ type: 'wheel', event }));

  return eventDispatcher;
}

// Some util function to be used in eventRegonizer
//   getCurrentEvents: returns array of current pointer events from a listener object
const getCurrentEvents = ({ state }) => state.pointers.map(({ event }) => event);
//   resetPointersStart: updates start event to current event of all pointers of a listener object
const resetPointersStart = ({ state }) => state.pointers.forEach((pointer) => {
  pointer.start = pointer.event;
  pointer.preEvents = [pointer.event];
});

function eventRegonizer(event) {
  const { pointerId, type } = event;

  switch (type) {
    case 'pointerdown': {
      const listener = listeners.find(({ DOMNode }) => DOMNode === event.target);

      if (!listener) return;

      const pointer = { event, start: event, preEvents: [event], listener };
      if (listener.state.pointers.length >= 1) {
        // end current event because after a new pointer is added a new event is triggered
        const events = getCurrentEvents(listener);

        const type = `${listener.state.currentEvent}end`;
        if (listener.state.currentEvent === 'drag') {
          const [event] = events;
          listener.eventDispatcher.dispatchEvent({ type, event });
        } else {
          listener.eventDispatcher.dispatchEvent({ type, events });
        }
      }

      // store pointer in pointers object and increase num pointers
      pointers[pointerId] = pointer;
      listener.state.pointers.push(pointer);

      // start multitouch event
      // note, drag event is NOT started here, the drag event starts after moved DRAG_THRESHOLD
      if (listener.state.pointers.length >= 2) {
        listener.state.currentEvent = 'multitouch';

        const events = getCurrentEvents(listener);
        listener.eventDispatcher.dispatchEvent({ type: `${listener.state.currentEvent}start`, events });
      }

      break;
    }
    case 'pointermove': {
      const pointer = pointers[pointerId];
      // end when pointer is not known
      // this can happen when a pointer started outside a known dom node
      if (!pointer) return;

      // update pointer
      pointer.event = event;

      const { listener } = pointer;

      // different behaviour based on current event
      switch (listener.state.currentEvent) {
        case 'idle':
        case 'idle-drag':
          const { preEvents, start } = pointer;

          // when event is idle check if pointer has moved more then DRAG_THRESHOLD
          const deltaX = start.clientX - event.clientX;
          const deltaY = start.clientY - event.clientY;
          const distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
          if (distance > CONFIG.DRAG_THRESHOLD) {
            // check if left or right mousebutton (for tablets this always is drag)
            listener.state.currentEvent = (event.buttons & 2) ? 'seconddrag' : 'drag';

            // dispatch event with current position and an array with positions before drag was triggered
            listener.eventDispatcher.dispatchEvent({
              type: `${listener.state.currentEvent}start`,
              event: start,
              preEvents
            });
          } else {
            // if pointer has not moved more then DRAG_THRESHOLD add current position to predrags
            pointer.preEvents.push(event);
          }
          break;
        case 'drag':
        case 'seconddrag':
          // dispatch drag event with current pointer position
          listener.eventDispatcher.dispatchEvent({ type: listener.state.currentEvent, event });
          break;
        case 'multitouch':
          // dispatch multitouch event with current pointer positions (>= 2)
          const events = getCurrentEvents(listener);

          listener.eventDispatcher.dispatchEvent({ type: listener.state.currentEvent, events });
          break;
        default:
          break;
      }
      break;
    }
    case 'pointercancel':
    case 'pointerleave':
    case 'pointerup': {
      const pointer = pointers[pointerId];

      // end when pointer is not known
      // this can happen when a pointer started outside the screen
      if (!pointer) return;

      // update pointer
      pointer.event = event;

      const { listener } = pointer;

      // emit multitouch end before pointer is deleted
      if (listener.state.currentEvent === 'multitouch') {
        // end current event so a new one can be started
        const events = getCurrentEvents(listener);
        listener.eventDispatcher.dispatchEvent({ type: `${listener.state.currentEvent}end`, events });
      }

      // remove pointer from pointer objects and decrease num pointers
      delete pointers[pointerId];
      listener.state.pointers.splice(listener.state.pointers.indexOf(pointer), 1);

      switch (listener.state.currentEvent) {
        case 'multitouch':
          const events = getCurrentEvents(listener);

          resetPointersStart(listener);

          if (listener.state.pointers.length === 1) {
            // when only on one pointer is left on the screen this pointer can become multitouch or drag
            // so set it to idle drag so it can't become tab
            listener.state.currentEvent = 'idle-drag';

            // reset preEvents with current position
            pointer.preEvents = [events[0]];
          } else if (listener.state.pointers.length > 1) {
            // dispatch event for new composition of pointers
            listener.eventDispatcher.dispatchEvent({ type: `${listener.state.currentEvent}start`, events });
          }
          break;
        case 'drag':
        case 'seconddrag':
          // end drag event and set currentEvent to idle (0 pointers left at this point)
          listener.eventDispatcher.dispatchEvent({ type: `${listener.state.currentEvent}end`, event });
          listener.state.currentEvent = 'idle';
          break;
        case 'idle':
          // pointer has not dragged more as DRAG_THRESHOLD so pointer is regonized as tab
          listener.eventDispatcher.dispatchEvent({ type: 'tap', event });
          break;
        case 'idle-drag':
          // set currentEvent to idle if no pointers are left
          listener.state.currentEvent = 'idle';
          break;
        default:
          break;
      }
      break;
    }
    default:
      break;
  }
}

function onblur() {
  for (const pointerId in pointers) {
    delete pointers[pointerId];
  }

  for (const listener of listeners) {
    listener.state = {
      currentEvent: 'idle',
      pointers: []
    };
  }
}

window.addEventListener('pointerdown', eventRegonizer);
window.addEventListener('pointermove', eventRegonizer);
window.addEventListener('pointerup', eventRegonizer);
window.addEventListener('pointerleave', eventRegonizer);
window.addEventListener('pointercancel', eventRegonizer);
window.addEventListener('contextmenu', eventRegonizer);
window.addEventListener('blur', onblur);

export function __unload() {
  window.removeEventListener('pointerdown', eventRegonizer);
  window.removeEventListener('pointermove', eventRegonizer);
  window.removeEventListener('pointerup', eventRegonizer);
  window.removeEventListener('pointerleave', eventRegonizer);
  window.removeEventListener('pointercancel', eventRegonizer);
  window.removeEventListener('contextmenu', eventRegonizer);
  window.removeEventListener('blur', onblur);
}
