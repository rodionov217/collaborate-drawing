'use strict';


class App {
  constructor(container) {
    this.app = container;
    this.img = document.querySelector('img');
    this.imgID = sessionStorage.id ? sessionStorage.id : null; 
    this.shareURL = document.querySelector('.menu__url');
    this.menu = document.querySelector('ul.menu');
    this.menu.style.zIndex = 1000;
    this.drag = document.querySelector('.drag');
    this.burger = document.querySelector('.burger');
    this.modes = {
      all: Array.from(document.querySelectorAll('.mode')),
      tools: Array.from(document.querySelectorAll('.tool')),
      new: Array.from(document.querySelectorAll('.mode')),
      initial: [this.drag, document.querySelectorAll('.mode')[0]],
      comments: [this.drag, this.burger, document.querySelector('.mode.comments'), document.querySelector('.comments-tools') ],
      draw: [this.drag, this.burger, document.querySelector('.mode.draw'), document.querySelector('.draw-tools')],
      share: [this.drag, this.burger, document.querySelector('.mode.share'), document.querySelector('.share-tools')]
    }
    this.commentsToggle = document.querySelector('.menu__toggle');
    this.colorSwitch = document.querySelector('.draw-tools');
    this.currentColor = Array.from(this.colorSwitch.getElementsByTagName('input')).find(el => el.checked === true).value;
    this.loader = document.querySelector('.image-loader');
    this.error = {
      fileFormat: document.querySelector('.format-error'),
      repeatedLoad: document.querySelector('.repeated-load-error')
    }
    this.commentForm = {
      container: document.querySelector('.comments__form'),
      comment: document.querySelector('.comment'),
      loader: document.querySelector('.comment > .loader')
    }
    this.inputFile = document.createElement('input');
    this.inputFile.type = 'file';
    this.uploadXHR = new XMLHttpRequest();
    this.updateImgXHR = new XMLHttpRequest();
    this.submitCommentXHR = new XMLHttpRequest();
    this.ws = new WebSocket(`wss://neto-api.herokuapp.com/pic/`);
    
    this.dragMenu = {
      moving: null,
      shiftX: null,
      shiftY: null
    }
    
    
    this.state = null;
    this.currentMode = null;
    
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mask = document.querySelector('.mask');
    this.mask.src = this.canvas.toDataURL();

    this.curves = [];
    this.drawing = false;
    
    this.LINE_WIDTH = 4;

    this.registerEvents();
  }
  
  show() {
    for (const i of arguments) {
      i.style.display = 'inline-block'
    }
  }
  hide() {
    for (const i of arguments) {
      i.style.display = 'none';
    }
  }
  showMode(mode) {
    this.hide(...this.modes.all);
    this.show(...mode);  
    this.adjustPosition()  
  }
  showInitialMode() {
    this.currentMode = 'new';
    this.showMode(this.modes.initial);
    this.hide(this.burger, this.mask);
    this.menu.style.left = ((window.innerWidth - this.menu.offsetWidth) / 2) + 'px';
    this.menu.style.top = ((window.innerHeight - this.menu.offsetHeight) / 2) + 'px';
  }

  adjustPosition() {
    if (this.menu.getBoundingClientRect().right > window.innerWidth) {
      this.menu.style.left = (window.innerWidth - this.menu.offsetWidth) + 'px';
    }
  }

  showMenuBar() {
    this.hide(...this.modes.tools, this.burger, this.error.repeatedLoad, this.error.fileFormat);
    this.show(...this.modes.all);
    this.adjustPosition();
  }
  showComments() {
    const check = this.commentsToggle.checked;
    if (check) {
      this.show(...document.querySelectorAll('.comments__form'));
    } else if (!check) {
      this.hide(...document.querySelectorAll('.comments__form'));
    }
  }
  
  uploadImg(event) {
    sessionStorage.clear();
    let file;
    this.hide(this.error.fileFormat, this.error.fileFormat, this.mask);
    //this.mask.src = '';
    if (event.type === 'drop') {
      event.preventDefault();
      if (this.img.getAttribute('src') !== "") {
        this.show(this.error.repeatedLoad);
        return;
      } 
      file = event.dataTransfer.files[0];
    } else { 
      file = event.currentTarget.files[0];
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      this.show(this.error.fileFormat);
      return;
    }
    this.uploadXHR.open('POST', 'https://neto-api.herokuapp.com/pic', true);
    const formdata = new FormData();
    formdata.append('title', file.name);
    formdata.append('image', file);
    this.uploadXHR.send(formdata);
  }

  handleUpload() {
    this.hide(this.loader, this.error.repeatedLoad, this.error.fileFormat);
    this.menu.style.display = 'table';
    this.showMode(this.modes.share);
    this.menu.style.left = ((window.innerWidth - this.menu.offsetWidth) / 2) + 'px';
    this.currentMode = 'share';

    const response = JSON.parse(this.uploadXHR.responseText);
    this.state = response;
    this.imgID = response.id;
    this.img.src = response.url;
    this.img.style.display = 'block';
    sessionStorage.id = response.id;
  }
  
  refresh() { 
    //обновить холст: 1.отобразить картинку и маску,если есть
    this.img.src = this.state.url;
    if (this.state.mask !== undefined) {
      this.mask.src = this.state.mask;
      console.log('mask from state');
      this.mask.style.display = 'block';
    }
    console.log('state.com: ', this.state.comments);
    //2.нарисовать комментарии, если они есть
    if (this.state.comments) { 
      const keys = Object.keys(this.state.comments);
      keys.forEach(key => this.updateComments(this.state.comments[key]));
      Array.from(document.querySelectorAll('.comments__form > .comments__marker-checkbox')).forEach(checkbox => checkbox.checked = false);
    }

    this.shareURL.value = "https://netology-code.github.io/hj-23-rodionov217/index.html?" + this.imgID;
  }

  openUpdateXHR() {
    this.updateImgXHR.open('GET', `https://neto-api.herokuapp.com/pic/${this.imgID}`, true);
    //this.updateImgXHR.setRequestHeader('');
    this.updateImgXHR.send();
  }

  openWS() {
    this.ws = new WebSocket(`wss://neto-api.herokuapp.com/pic/${this.imgID}`);
    this.ws.addEventListener('open', () => console.log('connected to WS') );
    this.ws.addEventListener('message', event => this.handleMessage(event));
  }
  
  dragStart(event) {
    if (!event.target.classList.contains('drag')) {
      return;
    }
    this.dragMenu.moving = event.target;
    //this.menu.style.position = 'absolute';
    this.dragMenu.shiftX = event.pageX - this.dragMenu.moving.getBoundingClientRect().x;
    this.dragMenu.shiftY = event.pageY - this.dragMenu.moving.getBoundingClientRect().y;
    this.move(event);
  }
  
  dragStop() {
    this.dragMenu.moving = null;
  }
  
  move(event) {
    if (!this.dragMenu.moving) {
      return;
    }
    
    let x, y;
    if ((event.pageX + this.menu.offsetWidth - this.dragMenu.shiftX) >= window.innerWidth ) {
      x = (window.innerWidth - this.menu.offsetWidth);
    } else if (event.pageX - this.dragMenu.shiftX < 0) {
      x = 0;
    } else {
      x = event.pageX - this.dragMenu.shiftX;
    }

    if ((event.pageY + this.menu.offsetHeight - this.dragMenu.shiftY) >= window.innerHeight) {
      y = window.innerHeight - this.menu.offsetHeight;
    } else if ((event.pageY - this.dragMenu.shiftY) < 0) {
      y = 0;
    } else {
      y = event.pageY - this.dragMenu.shiftY;
    }

    this.menu.style.left = x + 'px';
    this.menu.style.top = y + 'px';
  }

  createCommentBlock(x, y, text, timestamp) {
    const newCommentBlock = this.commentForm.container.cloneNode(true);
    newCommentBlock.querySelector('input.comments__marker-checkbox').checked = true;
    newCommentBlock.style.left = x + '%';
    newCommentBlock.style.top = y + '%';
    newCommentBlock.style.zIndex = 4;
    this.show(newCommentBlock);
     
    this.addCommentToChain(newCommentBlock, text, timestamp);
    
    return newCommentBlock;
  }

  addCommentToChain(form, text, timestamp) {
    const comment = this.commentForm.comment.cloneNode(true);
    this.show(comment);
    comment.firstElementChild.textContent = (new Date(timestamp)).toLocaleString('ru-Ru');
    comment.lastElementChild.textContent = text;
    const loader = form.querySelector('.comments__input').previousElementSibling;
    form.querySelector('.comments__body').insertBefore(comment, loader);
  }

  updateComments(commentObj) {
    const x = commentObj.left;
    const y = commentObj.top;
    console.log('x,y: ', x, ' ', y);
    
    const container = Array.from(document.getElementsByClassName('comments__form')).find(el => el.offsetLeft * 100 / window.innerWidth === commentObj.left);
    console.log('container: ', container);
    if (container) {
      this.hide(container.querySelector('.loader').parentElement);
      console.log('container found, call addCommentToChain');
      this.addCommentToChain(container, commentObj.message, commentObj.timestamp);
    } else {
      console.log('container not found, call createCommentBlock');
      const newCommentBlock = this.createCommentBlock(x, y, commentObj.message, commentObj.timestamp);
      this.app.appendChild(newCommentBlock);
    }

   // let comment = Array.from(this.app.querySelectorAll('.comment__time')).find(el => el.)
  }

  addComment(event) {
    if (this.currentMode !== 'comments') {
      return;
    }
    Array.from(document.querySelectorAll('.comments__form')).forEach(form => {
      const checkbox = form.querySelector('.comments__marker-checkbox');
      const comments = form.querySelectorAll('.comment__message');

      checkbox.checked = false;
      if (!Array.from(comments).find(comment => comment.textContent !== '')) {
        form.parentElement.removeChild(form);
      }
    }); 

    const newCommentBlock = this.createCommentBlock((event.clientX - 22) * 100 / window.innerWidth, (event.clientY - 13) * 100 / window.innerHeight);
    console.log((event.clientX - 22) * 100 / window.innerWidth, ',', (event.clientY - 13) * 100 / window.innerHeight);
    this.app.appendChild(newCommentBlock);
  }
    
  submitComment(event) {
    event.preventDefault();
    const target = event.target;
    const form = target.closest('.comments__form');
    const loader = form.querySelector('.loader');
    const commentText = form.querySelector('textarea.comments__input');
    if (commentText.value === '') {
      return;
    }
    this.show(loader.parentElement);
    this.submitCommentXHR.open('POST', `https://neto-api.herokuapp.com/pic/${this.imgID}/comments`, true);
    this.submitCommentXHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    
    const body = `message=${commentText.value}&left=${form.offsetLeft * 100 / window.innerWidth}&top=${form.offsetTop * 100 / window.innerHeight}`;
    console.log(form.offsetLeft, ',', form.offsetTop);
    this.submitCommentXHR.send(body);
    commentText.value = '';
  }

  closeCommentBlock(event) {
    const form = event.target.closest('.comments__form');
    form.querySelector('.comments__marker-checkbox').checked = false;
    if (form.querySelectorAll('.comments__body .comment').length === 2 ) {
      //проверяю были ли добавлены комментарии
      form.parentElement.removeChild(form);
    }
  }
  
  cancelClosing(event) {
    if (this.currentMode !== 'comments') {
      return;
    }
    Array.from(document.querySelectorAll('.comments__form > .comments__marker-checkbox')).forEach(checkbox => {
      checkbox.checked = checkbox === event.target ? true : false;
    });
  }

  copyURL() {
    this.shareURL.focus();
    this.shareURL.setSelectionRange(0, this.shareURL.value.length);
    document.execCommand('copy');
  }

  setCanvasSize(event) {
    const img = event.currentTarget;
    const size = img.getBoundingClientRect();

    this.canvas.height = img.height;
    this.canvas.width = img.width;
    this.canvas.style.zIndex = 3;

    this.mask.height = img.height;
    this.mask.width = img.width;
    this.mask.style.zIndex = 2;
  }
  changeColor(event) {
    const target = event.target;
    if (target.classList.contains('menu__color')) {
      this.currentColor = target.value;
    }
  }

  startDrawing(event) {
    event.preventDefault();
    if (this.currentMode !== 'draw') {
      return;
    }
    this.curves = [];
    this.drawing = true;
    const curve = [];
    curve.push([event.offsetX, event.offsetY]);
    this.curves.push(curve);
  }

  drawCurve(points) {
    this.ctx = event.currentTarget.getContext('2d');
    this.ctx.beginPath();
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    this.ctx.fillStyle = this.currentColor;
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.moveTo(...points[0]);
    for (let i = 0; i < points.length - 1; i++){
      this.drawCurveBetween(points[i], points[i+1]);
    }
    this.ctx.stroke();
  }

  drawCircle(point) {
    const x = point[0];
    const y = point[1];
    this.ctx.beginPath();
    this.ctx.fillStyle = this.currentColor;
    this.ctx.lineCap = 'round';
    this.ctx.arc(x, y, this.LINE_WIDTH / 2, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  drawCurveBetween(p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    this.ctx.quadraticCurveTo(...p1, ...cp);
  }

  draw(event) { 
    event.preventDefault();
    if (this.drawing) {
      const point = [event.offsetX, event.offsetY];
      this.curves[this.curves.length - 1].push(point);
      this.curves.forEach((curve) => {
        this.drawCircle(curve[0]);
        this.drawCurve(curve);
      });
    }
  }

  finishDrawing() {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    this.canvas.toBlob(blob => this.ws.send(blob));
    //const img = this.canvas.toDataURL();
    //this.ws.send(img);
   
  }
  
  handleMessage(event) {
    const msg = JSON.parse(event.data);
    console.log(msg);
    switch (msg.event) {
      case 'pic':
        console.log('WS pic');
        if (this.img.src !== msg.pic) {
          this.img.src = msg.pic.url;
        } 
        break;
      case 'comment': 
        console.log('WS comment: ', msg);

        console.log('state comments: ', this.state.comments);
        this.updateComments(msg.comment);
        /* const keys = Object.keys(this.state.comments);
        let exists = keys.find(key => this.state.comments[key] === msg.id);
        console.log(exists); */
        /* if (this.state.comments === undefined) {
          let x = msg.comment.left, y = msg.comment.top;

          const newCommentBlock = this.createCommentBlock(x, y, msg.comment.message, msg.comment.timestamp);
          this.app.appendChild(newCommentBlock);
        } else {
this.updateComments(msg.comment);
        } */
        break;
      case 'mask':
        console.log('WS mask');
       // this.mask.src = msg.url;
        console.log('mask from WS response');
        sessionStorage.mask = msg.url;
        this.mask.style.display = 'block';

        this.state.mask = msg.url;
        
        this.openUpdateXHR();
        break;
      case 'error': 
        console.log('WS error');
        console.error(msg);
        break;
      default:
        console.warn('SOMETHING IS WRONG WITH THE WS!');
    }
  }

  
  registerEvents() {
    window.addEventListener('resize', event => {

      const w = this.menu.offsetWidth;
      //console.log(w, ' ', window.innerWidth);
      this.adjustPosition();
      this.menu.style.display = 'table';

      if (window.innerWidth < w + 1) {
        //console.log('===');
        let dif = w - 2 - window.innerWidth;
        this.menu.style.left = 0;
        //this.menu.style.right = dif + 'px';
        this.menu.style.height = 65 + 'px';
        this.menu.style.width = w + 2 + 'px';

      }
      //console.log(event);
      /* if (this.menu.getBoundingClientRect().right > window.innerWidth) {
        this.menu.style.left = (window.innerWidth - this.menu.offsetWidth) + 'px';
      } */
      
    })

    window.addEventListener('beforeunload', () => {
      sessionStorage.id = this.imgID;
      sessionStorage.mask = this.mask.src;
      sessionStorage.menuX = this.menu.offsetLeft;
      sessionStorage.menuY = this.menu.offsetTop;
      sessionStorage.comments = this.state.comments;
    })

    document.addEventListener('DOMContentLoaded', () => {
      const url = window.document.location.href;
      if (url.includes('?')) {
        this.imgID = url.slice(url.indexOf('?') + 1);
        //this.showMenuBar();
        this.showMode(this.modes.share);
        this.openUpdateXHR();
        return;
      } 
       if (sessionStorage.id !== undefined) {
        this.menu.style.left = sessionStorage.menuX + 'px';
        this.menu.style.top = sessionStorage.menuY + 'px';
        this.imgID = sessionStorage.id;
        this.mask.src = sessionStorage.mask;
        this.mask.style.display = 'block';
        this.showMenuBar();
        this.openUpdateXHR();
        return;
      } 
      this.showInitialMode();
    });

    this.img.addEventListener('load', event => this.setCanvasSize(event));
    this.mask.addEventListener('load', event => this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height))

    //--------LOAD PIC--------
    this.uploadXHR.addEventListener('error', e => console.log(e.statusText)); 
    this.uploadXHR.addEventListener('loadstart', event => {
      this.hide(this.menu, this.img, this.error.repeatedLoad, this.error.fileFormat);
      this.show(this.loader);
    });
    this.uploadXHR.addEventListener('load', event => {
      this.handleUpload();
      this.openUpdateXHR();
    })

    
    // ------UPDATE PIC-------
    this.updateImgXHR.addEventListener('load', () => {
      if (this.updateImgXHR.status !== 200) {
        return;
      }
      const response = JSON.parse(this.updateImgXHR.responseText);
      if (!response.url) {
        console.error('response.url is null');
        return;
      }
      this.state = response;
      this.refresh();

      if (this.ws.readyState !== 1) {
        this.openWS();
      }
      
    })
    
    //------SUBMIT COMMENT------
    this.submitCommentXHR.addEventListener('loadend', e => {
      const response = JSON.parse(this.submitCommentXHR.responseText);
      if (response.id === undefined || response.id === null) {
        console.error('submitCommentXHR.response ERROR:', this.submitCommentXHR.responseText);
      } else {
        this.state = response;
        console.log('subComXHR: ', response);
      }
    })

  //-------IMAGE INPUT & DROP-------
    this.modes.all[0].addEventListener('click', () => this.inputFile.click());
    this.app.addEventListener('dragover', event => event.preventDefault());
    this.app.addEventListener('drop', event => this.uploadImg(event));
    this.inputFile.addEventListener('change', event => this.uploadImg(event));

  //-------MENU DRAG'&'DROP----------
    document.addEventListener('mousedown', event => this.dragStart(event));
    document.addEventListener('mousemove', event => this.move(event));
    document.addEventListener('mouseup', event => this.dragStop());

  //-------MENU SHOW MODES-----------
    this.burger.addEventListener('click', event => this.showMenuBar());
    this.modes.all.forEach(mode => mode.addEventListener('click', () => {
      this.showMode(this.modes[mode.classList[2]]);
      this.hide(this.error.fileFormat, this.error.repeatedLoad);
      this.currentMode = mode.classList[2];
    }));
    
    this.commentsToggle.parentElement.addEventListener('click', () => this.showComments());

    this.colorSwitch.addEventListener('click', event => this.changeColor(event));

    this.app.addEventListener('click', event => {
      const target = event.target;
      if (target.classList.contains('comments__submit')) {
        this.submitComment(event);
      } else if (target.classList.contains('comments__close')) {
        this.closeCommentBlock(event);
      } else if (target.classList.contains('menu_copy')) {
        this.copyURL();
      } else if (target.classList.contains('canvas')) {
        this.addComment(event);
      } else if (event.target.classList.contains('comments__marker-checkbox')) {
        this.cancelClosing(event);
      }
      
      
    });
    



    //--------DRAWING---------------
    this.canvas.addEventListener('mousedown', event => this.startDrawing(event));
    this.canvas.addEventListener('mousemove', event => this.draw(event));
    this.canvas.addEventListener('mouseup', event => this.finishDrawing())

  }
}

const app = new App(document.querySelector('.app'));
