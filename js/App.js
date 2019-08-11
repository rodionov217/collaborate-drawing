'use strict';
function show() {
  for (const i of arguments) {
    i.style.display = 'inline-block'
  }
}
function hide() {
  for (const i of arguments) {
    i.style.display = 'none';
  }
}

let menu = new Menu();
let upload = new Upload();
let commentBlock = new Comments();

class App {
  constructor(container) {
    this.app = container;
    this.img = upload.img;
    this.upload = upload;
    this.commentBlock = commentBlock;
    this.menu = menu;
    this.updateImgXHR = new XMLHttpRequest(); 

    this.initial = 1;
    this.registerEvents();
  }

  get currentMode() {
    return this.menu.modes.current;
  }

  get ID() {
    const url = window.location.href;
    if (url.includes('?')) {
      return url.slice(url.indexOf('?') + 1);
    }
    if (sessionStorage.id !== undefined) {
      return sessionStorage.id;
    }
  }
  
  get state() {
    return this.upload.state;
  } 

  openWS() {
    this.ws = new WebSocket(`wss://neto-api.herokuapp.com/pic/${this.ID}`);
    this.canvas = new Canvas(this.ws);
    this.ws.addEventListener('open', () => console.log('connected to WS') );
    this.ws.addEventListener('message', event => this.handleMessage(event));
  }

  handleMessage(event) {
    const msg = JSON.parse(event.data);
    switch (msg.event) {
      case 'pic': 
        console.log('PIC: ', msg);
        this.upload.canvas.toBlob(blob => this.ws.send(blob));
        this.upload.openUpdateXHR(this.ID);
        break;
        case 'mask':
        this.upload.mask.src = msg.url;
        break;
      case 'comment':
        console.log('COMMENT: ', msg);
        this.commentBlock.updateComments(msg.comment);
        break;
      case 'error':
        console.log('WS error: ', msg);
        break;
      default:
        console.warn('SOMETHING IS WRONG WITH THE WS!');
    }
  }

  handleComments(response) {
    if (this.state === null || response.comments !== this.state.comments) {
      for (let prop in response.comments) {
        this.commentBlock.updateComments(response.comments[prop]);
      }
    }
  }

  registerEvents() {
    window.addEventListener('beforeunload', () => {
      sessionStorage.id = this.ID;
      sessionStorage.img = this.upload.img.src;
      sessionStorage.mask = this.upload.mask.src;
      sessionStorage.menuX = this.menu.menuBar.offsetLeft;
      sessionStorage.menuY = this.menu.menuBar.offsetTop;
      sessionStorage.currentMode = this.currentMode;
      sessionStorage.initial = ++this.initial;
    });

    document.addEventListener('DOMContentLoaded', () => {
      if (this.ID !== undefined && this.ws === undefined) {
        //this.upload.openUpdateXHR(this.ID); //так комменты добавляются дважды
        this.openWS();
        return;
      }

      if (this.ID === undefined) {
        this.menu.showInitialMode();
        hide(this.upload.mask);
      }
    });

    this.img.addEventListener('load', event => {
      this.upload.setCanvasSize(event);
      if (this.upload.state === null || this.upload.state.id !== sessionStorage.id || this.ws === undefined || this.ws.readyState !== 1) {
        this.openWS();
      } 
      //this.upload.openUpdateXHR(this.ID); //так маска не склеивается
    });
  }
}

const app = new App(document.querySelector('.app'));