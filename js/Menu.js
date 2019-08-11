'use strict';
class Menu {
  constructor() {
    this.menuBar = document.querySelector('ul.menu');
    this.drag = document.querySelector('.drag');
    this.burger = document.querySelector('.burger');
    this.commentsToggle = document.querySelector('.menu__toggle');
    this.colorSwitch = document.querySelector('.draw-tools');
    this.copyBtn = this.menuBar.querySelector('.menu_copy')
    this.shareURL = this.menuBar.querySelector('.menu__url');

    this.currentColor = Array.from(this.colorSwitch.getElementsByTagName('input')).find(el => el.checked === true).value;

    this.modes = {
      current: null,
      all: Array.from(document.querySelectorAll('.mode')),
      tools: Array.from(document.querySelectorAll('.tool')),
      new: Array.from(document.querySelectorAll('.mode')),
      initial: [this.drag, document.querySelectorAll('.mode')[0]],
      comments: [this.drag, this.burger, document.querySelector('.mode.comments'), document.querySelector('.comments-tools') ],
      draw: [this.drag, this.burger, document.querySelector('.mode.draw'), document.querySelector('.draw-tools')],
      share: [this.drag, this.burger, document.querySelector('.mode.share'), document.querySelector('.share-tools')]
    };

    this.dragMenu = {
      moving: null,
      shiftX: null,
      shiftY: null
    };

    this.registerEvents()
  }

  get width() {
    let width;
    if (this.modes.current === 'all' || this.modes.current === 'new') {
      width = this.modes[this.modes.current].reduce((sum, el) => {
        return sum + el.getBoundingClientRect().width;
      }, 0) + this.drag.offsetWidth + 2;
    } else {
      width = this.modes[this.modes.current].reduce((sum, el) => {
        return sum + el.getBoundingClientRect().width;
      }, 0) + 2;
    }
    return Math.ceil(width);
  }

  showMenu() {
    hide(...this.modes.tools, this.burger);
    show(...this.modes.all);
    this.modes.current = 'all';
    this.adjustPosition();
  }

  showMode(mode) {
    hide(...this.modes.all, this.burger);
    show(...this.modes[mode]);
    this.modes.current = mode;
    this.adjustPosition(); 
  }

  showInitialMode() {
    hide(this.burger);
    this.showMode('initial');
    this.menuBar.style.left = ((window.innerWidth - this.menuBar.offsetWidth) / 2) + 'px';
    this.menuBar.style.top = ((window.innerHeight - this.menuBar.offsetHeight) / 2) + 'px';
  }

  handleMenu() {
    if (sessionStorage.currentMode !== 'null' && sessionStorage.currentMode !== 'new') {
      this.showMode(sessionStorage.currentMode);
      this.menuBar.style.left = sessionStorage.menuX + 'px';
      this.menuBar.style.top = sessionStorage.menuY + 'px';
    } else if (window.location.href.includes('?')) {
      this.showMode('comments');
    } else {
      this.showMode('share');
    }
  }

  adjustPosition() {
    this.menuBar.style.display = 'table';
    this.menuBar.style.width = this.width + 'px';
    if (this.menuBar.offsetWidth >= window.innerWidth) {
      this.menuBar.style.left = '0px';
    } else if (this.menuBar.offsetLeft + this.width > window.innerWidth) {
      this.menuBar.style.left = (window.innerWidth - this.menuBar.offsetWidth) + 'px';
    } else {
      this.menuBar.style.left = this.menuBar.getBoundingClientRect().left + 'px';
    }
  }

  changeVisibility() {
    const check = this.commentsToggle.checked;
    if (check) {
      show(...document.querySelectorAll('.comments__form'));
    } else if (!check) {
      hide(...document.querySelectorAll('.comments__form'));
    }
  }

  dragStart(event) {
    if (!event.target.classList.contains('drag')) {
      return;
    }
    this.dragMenu.moving = event.target;
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
    if ((event.pageX + this.menuBar.offsetWidth - this.dragMenu.shiftX) >= window.innerWidth ) {
      x = (window.innerWidth - this.menuBar.offsetWidth);
    } else if (event.pageX - this.dragMenu.shiftX < 0) {
      x = 0;
    } else {
      x = event.pageX - this.dragMenu.shiftX;
    }

    if ((event.pageY + this.menuBar.offsetHeight - this.dragMenu.shiftY) >= window.innerHeight) {
      y = window.innerHeight - this.menuBar.offsetHeight;
    } else if ((event.pageY - this.dragMenu.shiftY) < 0) {
      y = 0;
    } else {
      y = event.pageY - this.dragMenu.shiftY;
    }

    this.menuBar.style.left = x + 'px';
    this.menuBar.style.top = y + 'px';
  }

  changeColor(event) {
    const target = event.target;
    if (target.classList.contains('menu__color')) {
      this.currentColor = target.value;
    }
  }

  copyURL() {
    this.shareURL.focus();
    this.shareURL.setSelectionRange(0, this.shareURL.value.length);
    document.execCommand('copy');
  }

  updateShareURL(id) {
    this.shareURL.value = "https://netology-code.github.io/hj-23-rodionov217/index.html?" + id;
  }

  registerEvents() {
    window.addEventListener('resize', event => this.adjustPosition());

    /* --------- MENU DRAG & DROP -------- */
    document.addEventListener('mousedown', event => this.dragStart(event));
    document.addEventListener('mousemove', event => this.move(event));
    document.addEventListener('mouseup', event => this.dragStop());

    /* ----------- CLICK ON MENU ------------ */
    this.burger.addEventListener('click', event => this.showMenu());
    this.modes.all.forEach(mode => mode.addEventListener('click', () => this.showMode(mode.classList[2])));
    this.commentsToggle.parentElement.addEventListener('click', () => this.changeVisibility());
    this.colorSwitch.addEventListener('click', event => this.changeColor(event));
    this.copyBtn.addEventListener('click', event => this.copyURL());
  }
}