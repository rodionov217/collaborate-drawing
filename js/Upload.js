'use strict';
class Upload {
  constructor() {
    this.inputFile = document.createElement('input');
    this.inputFile.type = 'file';
    this.menu = menu;
    this.img = document.querySelector('img');
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mask = document.querySelector('.mask');
    this.loader = document.querySelector('.image-loader');
    this.error = {
      fileFormat: document.querySelector('.format-error'),
      repeatedLoad: document.querySelector('.repeated-load-error')
    };

    this.uploadXHR = new XMLHttpRequest();
    this.updateImgXHR = new XMLHttpRequest();

    this.state = null;
    this.registerEvents();
  }

  getUploadedFile(event) {
    let file;
    if (event.type === 'drop') {
      event.preventDefault();
      if (this.img.getAttribute('src') !== "") {
        show(this.error.repeatedLoad);
        return false;
      } 
      file = event.dataTransfer.files[0];
    } else { 
      file = event.currentTarget.files[0];
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      show(this.error.fileFormat);
      return false;
    }
    return file;
  }

  uploadImg(event) {
    sessionStorage.clear();
    hide(this.error.fileFormat, this.error.fileFormat, this.mask);
    const file = this.getUploadedFile(event);
    if (file) {
      this.uploadXHR.open('POST', 'https://neto-api.herokuapp.com/pic', true);
      const formdata = new FormData();
      formdata.append('title', file.name);
      formdata.append('image', file);
      this.uploadXHR.send(formdata);
    }
  }

  handleImage(response) {
    hide(this.loader, this.error.repeatedLoad, this.error.fileFormat);
    this.img.style.display = 'block';
    this.mask.style.display = 'block';
    this.mask.src = response.mask;
    if (this.img.src !== response.url) {
      this.img.src = response.url;
    }
  }

  setCanvasSize() {
    const img = this.img;
    this.canvas.height = img.height;
    this.canvas.width = img.width;
    this.canvas.style.zIndex = 3;
    this.mask.height = img.height;
    this.mask.width = img.width;
    this.mask.style.zIndex = 2;
    const commentsWrap = document.querySelector('.comments__wrap');
    commentsWrap.style.height = img.height + 'px';
    commentsWrap.style.width = img.width + 'px';
  }

  openUpdateXHR(id) {
    this.updateImgXHR.open('GET', `https://neto-api.herokuapp.com/pic/${id}`, true);
    this.updateImgXHR.send();
  }

  registerEvents() {
    /* ----------- UPLOAD NEW FILE ----------- */
    this.menu.modes.all[0].addEventListener('click', () => this.inputFile.click());
    document.addEventListener('dragover', event => event.preventDefault());
    document.addEventListener('drop', event => this.uploadImg(event));
    this.inputFile.addEventListener('change', event => this.uploadImg(event));
    
    /* ----------- HANDLE UPLOAD XHR RESPONSE --------- */
    this.uploadXHR.addEventListener('error', e => console.log(e.statusText)); 
    this.uploadXHR.addEventListener('loadstart', event => {
      hide(this.menu.menuBar, this.img, this.error.repeatedLoad, this.error.fileFormat);
      show(this.loader);
    });
    this.uploadXHR.addEventListener('load', () => {
      let response = JSON.parse(this.uploadXHR.responseText);
      this.img.src = response.url;
      sessionStorage.id = response.id; 
      //this.openUpdateXHR(response.id); //так маска не склеивается
      //app.openWS(); //не видит
    });

    /* ----------- HANDLE UPDATE XHR RESPONSE --------- */
    this.updateImgXHR.addEventListener('load', event => {
      if (sessionStorage.initial === undefined || sessionStorage.initial === 1) {
        window.location.reload();
        return;
      }
      if (this.updateImgXHR.status !== 200) {
        console.log('status !== 200');
        return;
      }

      const response = JSON.parse(this.updateImgXHR.responseText);
      console.log('XHR RESPONSE: ', response);
      if (!response.id) {
        console.log('Request ERROR: ', response);
        return;
      }

      this.handleImage(response);
      this.menu.handleMenu();
      this.menu.updateShareURL(response.id);
      app.handleComments(response);

      this.state = response;
      sessionStorage.id = response.id;
    });

    this.menu.menuBar.addEventListener('click', event => hide(this.error.repeatedLoad, this.error.fileFormat));
    this.mask.addEventListener('load', event => this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height));
  }
} 