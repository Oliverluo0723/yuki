import p5 from 'p5';

const stage = document.getElementById('stage');
if (!stage) throw new Error('#stage not found');

new p5((p: p5) => {
  p.setup = () => {
    p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
    p.createCanvas(window.innerWidth, window.innerHeight);
  };
  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };
  p.draw = () => {
    p.background(11, 15, 23);
  };
}, stage);
