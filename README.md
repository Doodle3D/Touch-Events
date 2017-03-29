# Touch Events
Touch Events on PEP.

# Usage

### Using JSPM (ECMAScript / ES6 Module)

Install the library.

```
jspm install touch-events=github:casperlamboo/TouchEvents
```

Include the library.

```javascript
import touchEvents from 'touch-events';
```

### Using NPM (CommonJS module)

Install the library.

```
npm install touch-events
```

Include the library.

```javascript
var touchEvents = require('touch-events');
```

# API

**createListener**

```javascript
eventListener:EventDispatcher = touchEvents.createListener(DOMNode)
```

**addEventListener**

```javascript
// gesture regonizers
eventListener.addEventListener('wheel', callback: Function);
eventListener.addEventListener('tap', callback: Function);
eventListener.addEventListener('dragstart', callback: Function);
eventListener.addEventListener('drag', callback: Function);
eventListener.addEventListener('dragend', callback: Function);
eventListener.addEventListener('seconddragstart', callback: Function);
eventListener.addEventListener('seconddrag', callback: Function);
eventListener.addEventListener('seconddragend', callback: Function);
eventListener.addEventListener('multitouchstart', callback: Function);
eventListener.addEventListener('multitouch', callback: Function);
eventListener.addEventListener('multitouchend', callback: Function);

// original touch events
eventListener.addEventListener('pointerdown', callback: Function);
eventListener.addEventListener('pointermove', callback: Function);
eventListener.addEventListener('pointerup', callback: Function);
```

**setConfig**

```javascript
touchEvents.setConfig(config: Object)

config = {
  DRAG_THRESHOLD: Number = 10;
}
```
