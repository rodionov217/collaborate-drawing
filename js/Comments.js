'use strict';

class Comments {
  constructor() {
    this.container = document.querySelector('.comments__wrap');
    this.form = document.querySelector('form.comments__form');
    this.comment = this.form.querySelector('div.comment');
    this.loader = this.form.querySelector('.comments__input').previousElementSibling;
    this.marker = this.form.querySelector('.comments__marker-checkbox');
    this.submitBtn = this.form.querySelector('.comments__close');
    this.closeBtn = this.form.querySelector('.comments__close');
    this.input = this.form.querySelector('.comments__input');
    this.state = null;

    this.submitCommentXHR = new XMLHttpRequest();
    this.registerEvents();
  }
  
  createCommentBlock(x, y) {
    const newCommentBlock = this.form.cloneNode(true);
    newCommentBlock.querySelector('input.comments__marker-checkbox').checked = true;
    newCommentBlock.style.left = x + 'px';
    newCommentBlock.style.top = y + 'px';
    newCommentBlock.style.zIndex = 5;
    const emptyComment = newCommentBlock.querySelector('.comment__message');
    if (emptyComment.textContent === '') {
      newCommentBlock.querySelector('.comments__body').removeChild(emptyComment.parentElement);
    }
    return newCommentBlock;
  }

  addCommentToBlock(form, text, timestamp) {
    const comment = this.comment.cloneNode(true);
    comment.firstElementChild.textContent = (new Date(timestamp)).toLocaleString('ru-Ru');
    comment.lastElementChild.innerText = text;
    const loader = form.querySelector('.comments__input').previousElementSibling;
    form.querySelector('.comments__body').insertBefore(comment, loader);
  }

  updateComments(commentObj) {
    const x = commentObj.left;
    const y = commentObj.top;
    const form = Array.from(document.getElementsByClassName('comments__form')).find(el => el.offsetLeft === commentObj.left);
    if (form) {
      console.log('container found, call addCommentToChain');
      this.addCommentToBlock(form, commentObj.message, commentObj.timestamp);
      let loader = form.querySelector('.loader');
      hide(loader.parentElement);
    } else {
      console.log('container not found, call createCommentBlock');
      const newCommentBlock = this.createCommentBlock(x, y);
      this.addCommentToBlock(newCommentBlock, commentObj.message, commentObj.timestamp);
      this.container.appendChild(newCommentBlock);

      //close other blocks on the page 
      this.closeAll();
    }
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
    show(loader.parentElement);
    
    this.submitCommentXHR.open('POST', `https://neto-api.herokuapp.com/pic/${app.ID}/comments`, true);
    this.submitCommentXHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    const x = form.offsetLeft;
    const y = form.offsetTop;
    const body = `message=${commentText.value}&left=${x}&top=${y}`;
    this.submitCommentXHR.send(body);
    commentText.value = ''; 
  }

  closeForm(form) {
    form.querySelector('.comments__marker-checkbox').checked = false;
    //проверяю были ли добавлены комментарии:
    if (form.querySelectorAll('.comment__message').length === 0 ) {
      form.parentElement.removeChild(form);
    }
  }

  closeAll() {
    //close all other comment blocks
    Array.from(document.querySelectorAll('.comments__form')).forEach(form => this.closeForm(form)); 
  }

  cancelClosing(event) {
    Array.from(document.querySelectorAll('.comments__form > .comments__marker-checkbox')).forEach(checkbox => {
      checkbox.checked = checkbox === event.target ? true : false;
    });
  }

  registerEvents() {
    document.addEventListener('click', event => {
      if (event.target.classList.contains('comments__submit')) {
        this.submitComment(event);
      } else if (event.target.classList.contains('comments__close')) {
        this.closeForm(event.target.closest('.comments__form'));
      } else if (event.target.classList.contains('comments__marker-checkbox')) {
        this.cancelClosing(event);
      } else if (event.target.classList.contains('canvas')) {
  /* ----------- ADD COMMENT TO APP ----------- */
        if (app.currentMode !== 'comments') {
          return;
        }
        this.closeAll();
        //create new block:
        const x = event.clientX - 22 - this.container.getBoundingClientRect().x;
        const y = event.clientY - 13 - this.container.getBoundingClientRect().y;
        const newCommentBlock = this.createCommentBlock(x, y);
        this.container.appendChild(newCommentBlock);
      } 
    });

    this.submitCommentXHR.addEventListener('load', event => {
      const response = JSON.parse(this.submitCommentXHR.responseText);
      if (response.id === undefined || response.id === null) {
        console.error('submitCommentXHR.response ERROR:', this.submitCommentXHR.responseText);
      } else {
        this.state = response;
        console.log('subComXHR: ', response);
      }
    });
  }
}