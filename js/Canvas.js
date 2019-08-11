'use strict';

class Canvas {
  constructor(ws) {
    this.ws = ws;
    this.menu = menu;
    this.canvasElement = document.getElementById('canvas');
    this.ctx = this.canvasElement.getContext('2d');
    this.LINE_WIDTH = 4;
    this.curves = [];
    this.drawing = false;

    this.registerEvents();
  }

  get currentColor() {
    return this.menu.currentColor;
  }

  startDrawing(event) {
    event.preventDefault();
    if (this.menu.modes.current !== 'draw') {
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
    this.ctx.lineWidth = this.LINE_WIDTH;
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
    this.canvasElement.toBlob(blob => this.ws.send(blob));
  } 

  registerEvents() {
    /* ---------- DRAWING ----------- */
    this.canvasElement.addEventListener('mousedown', event => this.startDrawing(event));
    this.canvasElement.addEventListener('mousemove', event => this.draw(event));
    this.canvasElement.addEventListener('mouseup', event => this.finishDrawing());
  }
}